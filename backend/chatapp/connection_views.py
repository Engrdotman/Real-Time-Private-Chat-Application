"""
connection_views.py
===================
HTTP views for the User Discovery & Connection System.

Security architecture:
- All views require authentication via @login_required
- All mutation endpoints use @require_POST to prevent CSRF via GET
- Input is parsed from JSON body and validated before reaching the service layer
- Responses never leak internal error details to the client
- Rate limiting is applied via Django's cache-based throttle decorator
- Output is always serialised through the service layer — no raw model data

CSRF note: The existing app uses @csrf_exempt on mutation endpoints because
the React frontend sends credentials via session cookie without a CSRF token
header. We follow the same pattern here for consistency. In production,
configure CSRF_TRUSTED_ORIGINS and remove @csrf_exempt.
"""

import json
import time
from functools import wraps

from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from . import connection_services as svc


# ── Rate Limiting ─────────────────────────────────────────────────────────────

def rate_limit(max_calls: int, period: int):
    """
    Simple cache-based rate limiter decorator.

    max_calls: maximum number of calls allowed
    period:    time window in seconds

    Security: keyed by user ID so one user cannot exhaust another's quota.
    Uses Django's cache backend — works with memcached/Redis in production.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required.'}, status=401)

            cache_key = f"rl:{view_func.__name__}:{request.user.id}"
            now       = int(time.time())
            window_key = f"{cache_key}:{now // period}"

            count = cache.get(window_key, 0)
            if count >= max_calls:
                return JsonResponse(
                    {'error': 'Too many requests. Please slow down.'},
                    status=429
                )
            cache.set(window_key, count + 1, timeout=period)
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def _json_body(request) -> dict:
    """
    Safely parse JSON request body.
    Returns empty dict on failure — callers validate required fields.
    """
    try:
        return json.loads(request.body or '{}')
    except (json.JSONDecodeError, ValueError):
        return {}


def _error(message: str, status: int = 400) -> JsonResponse:
    return JsonResponse({'error': message}, status=status)


def _ok(data: dict) -> JsonResponse:
    return JsonResponse({'status': 'success', **data})


def _validation_message(exc: ValidationError) -> str:
    if hasattr(exc, 'messages') and exc.messages:
        return exc.messages[0]
    return str(exc)


def _positive_int(value, default=1, maximum=None) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    parsed = max(1, parsed)
    return min(maximum, parsed) if maximum else parsed


# ── Search ────────────────────────────────────────────────────────────────────

@login_required
@require_GET
@rate_limit(max_calls=60, period=60)  # 60 searches per minute
def search_users(request):
    """
    GET /api/users/search/?q=<query>&page=<n>&page_size=<n>

    Security:
    - Authenticated only
    - Query is passed to the service layer which uses ORM parameterised queries
    - Results exclude blocked users and the viewer themselves
    - page_size is capped at 50 in the service layer
    """
    query     = request.GET.get('q', '').strip()
    page      = _positive_int(request.GET.get('page', 1), default=1)
    page_size = _positive_int(request.GET.get('page_size', 20), default=20, maximum=50)

    # Sanitise: reject suspiciously long queries (XSS/DoS prevention)
    if len(query) > 100:
        return _error("Search query too long.")

    result = svc.search_users(request.user, query, page, page_size)
    return JsonResponse(result)


# ── Connection Requests ───────────────────────────────────────────────────────

@csrf_exempt
@login_required
@require_POST
@rate_limit(max_calls=30, period=60)  # 30 requests per minute
def send_connection_request(request):
    """POST /api/connections/send/  body: {"receiver_id": <int>}"""
    data        = _json_body(request)
    receiver_id = data.get('receiver_id')

    if not receiver_id:
        return _error("receiver_id is required.")

    # Validate it's an integer — prevents type confusion attacks
    try:
        receiver_id = int(receiver_id)
    except (TypeError, ValueError):
        return _error("receiver_id must be an integer.")

    try:
        result = svc.send_connection_request(request.user, receiver_id)
        return _ok(result)
    except ValidationError as exc:
        return _error(_validation_message(exc))


@csrf_exempt
@login_required
@require_POST
def cancel_connection_request(request):
    """POST /api/connections/cancel/  body: {"receiver_id": <int>}"""
    data        = _json_body(request)
    receiver_id = data.get('receiver_id')

    try:
        receiver_id = int(receiver_id)
    except (TypeError, ValueError):
        return _error("receiver_id must be an integer.")

    try:
        result = svc.cancel_connection_request(request.user, receiver_id)
        return _ok(result)
    except ValidationError as exc:
        return _error(_validation_message(exc))


@csrf_exempt
@login_required
@require_POST
def accept_connection_request(request):
    """POST /api/connections/accept/  body: {"sender_id": <int>}"""
    data      = _json_body(request)
    sender_id = data.get('sender_id')

    try:
        sender_id = int(sender_id)
    except (TypeError, ValueError):
        return _error("sender_id must be an integer.")

    try:
        result = svc.accept_connection_request(request.user, sender_id)
        return _ok(result)
    except ValidationError as exc:
        return _error(_validation_message(exc))


@csrf_exempt
@login_required
@require_POST
def reject_connection_request(request):
    """POST /api/connections/reject/  body: {"sender_id": <int>}"""
    data      = _json_body(request)
    sender_id = data.get('sender_id')

    try:
        sender_id = int(sender_id)
    except (TypeError, ValueError):
        return _error("sender_id must be an integer.")

    try:
        result = svc.reject_connection_request(request.user, sender_id)
        return _ok(result)
    except ValidationError as exc:
        return _error(_validation_message(exc))


@csrf_exempt
@login_required
@require_POST
def remove_connection(request):
    """POST /api/connections/remove/  body: {"user_id": <int>}"""
    data    = _json_body(request)
    user_id = data.get('user_id')

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return _error("user_id must be an integer.")

    try:
        result = svc.remove_connection(request.user, user_id)
        return _ok(result)
    except ValidationError as exc:
        return _error(_validation_message(exc))


# ── Suggestions & Pending ─────────────────────────────────────────────────────

@login_required
@require_GET
@rate_limit(max_calls=30, period=60)
def get_suggestions(request):
    """GET /api/connections/suggestions/"""
    limit = _positive_int(request.GET.get('limit', 20), default=20, maximum=50)
    suggestions = svc.get_suggestions(request.user, limit)
    return JsonResponse({'suggestions': suggestions})


@login_required
@require_GET
def get_pending_requests(request):
    """GET /api/connections/pending/"""
    result = svc.get_pending_requests(request.user)
    return JsonResponse(result)


@login_required
@require_GET
def get_recent_connections(request):
    """GET /api/connections/recent/"""
    limit   = _positive_int(request.GET.get('limit', 20), default=20, maximum=50)
    results = svc.get_recent_connections(request.user, limit)
    return JsonResponse({'connections': results})


# ── Blocking ──────────────────────────────────────────────────────────────────

@csrf_exempt
@login_required
@require_POST
@rate_limit(max_calls=20, period=60)
def block_user(request):
    """POST /api/users/block/  body: {"user_id": <int>}"""
    data    = _json_body(request)
    user_id = data.get('user_id')

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return _error("user_id must be an integer.")

    try:
        result = svc.block_user(request.user, user_id)
        return _ok(result)
    except ValidationError as exc:
        return _error(_validation_message(exc))


@csrf_exempt
@login_required
@require_POST
def unblock_user(request):
    """POST /api/users/unblock/  body: {"user_id": <int>}"""
    data    = _json_body(request)
    user_id = data.get('user_id')

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return _error("user_id must be an integer.")

    try:
        result = svc.unblock_user(request.user, user_id)
        return _ok(result)
    except ValidationError as exc:
        return _error(_validation_message(exc))


# ── Privacy Settings ──────────────────────────────────────────────────────────

@login_required
@require_GET
def get_privacy_settings(request):
    """GET /api/users/privacy/"""
    result = svc.get_privacy_settings(request.user)
    return JsonResponse(result)


@csrf_exempt
@login_required
@require_POST
def update_privacy_settings(request):
    """
    POST /api/users/privacy/
    body: {
        "who_can_send_requests": "everyone"|"connections"|"nobody",
        "who_can_view_profile":  "everyone"|"connections",
        "who_can_message":       "everyone"|"connections"
    }
    """
    data = _json_body(request)

    # Whitelist allowed keys — prevents mass assignment
    allowed_keys = {'who_can_send_requests', 'who_can_view_profile', 'who_can_message'}
    filtered = {k: v for k, v in data.items() if k in allowed_keys}

    try:
        result = svc.update_privacy_settings(request.user, filtered)
        return _ok(result)
    except ValidationError as exc:
        return _error(_validation_message(exc))
