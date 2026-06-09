"""
connection_services.py
======================
Pure business-logic layer for the User Discovery & Connection System.

All database access goes through Django ORM only — no raw SQL.
Views call these functions; they never touch request/response objects.
This separation makes the logic independently testable.

Security decisions are documented inline.
"""

from django.contrib.auth.models import User
from django.db.models import Q, Count, Prefetch
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import UserConnection, BlockList, PrivacySettings, UserProfile


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_privacy(user: User) -> PrivacySettings:
    """Return the user's privacy settings, creating defaults if absent."""
    settings, _ = PrivacySettings.objects.get_or_create(user=user)
    return settings


def _is_blocked(actor: User, target: User) -> bool:
    """
    Return True if either party has blocked the other.
    We check both directions so that a blocked user cannot discover
    the blocker either (prevents user enumeration via block status).
    """
    return BlockList.objects.filter(
        Q(blocker=actor, blocked=target) | Q(blocker=target, blocked=actor)
    ).exists()


def _are_connected(user_a: User, user_b: User) -> bool:
    """Return True if an accepted connection exists between the two users."""
    return UserConnection.objects.filter(
        Q(sender=user_a, receiver=user_b) | Q(sender=user_b, receiver=user_a),
        status=UserConnection.STATUS_ACCEPTED,
    ).exists()


def _get_connection_ids(user: User) -> set:
    """Return a set of user IDs that are accepted connections of `user`."""
    sent = UserConnection.objects.filter(
        sender=user, status=UserConnection.STATUS_ACCEPTED
    ).values_list('receiver_id', flat=True)
    received = UserConnection.objects.filter(
        receiver=user, status=UserConnection.STATUS_ACCEPTED
    ).values_list('sender_id', flat=True)
    return set(sent) | set(received)


def _mutual_count(user: User, target: User) -> int:
    """Count mutual connections between two users."""
    user_connections   = _get_connection_ids(user)
    target_connections = _get_connection_ids(target)
    return len(user_connections & target_connections)


def _display_name(user: User) -> str:
    """Return the public display name without exposing private fields."""
    return user.get_full_name() or user.username


def _serialize_user(user: User, viewer: User, connection_status: str = None, reason: str = None) -> dict:
    """
    Build a safe user dict for API responses.

    Security: profile_pic and status_text are only included when the viewer
    has permission to see them (respects who_can_view_profile).
    We never expose email or password-related fields.
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    privacy     = _get_privacy(user)

    # Determine if viewer can see full profile
    can_view_full = (
        privacy.who_can_view_profile == PrivacySettings.EVERYONE
        or _are_connected(viewer, user)
        or viewer == user
    )

    return {
        'id':               user.id,
        'username':         user.username,
        # display_name falls back to username — extend UserProfile if you add a display_name field
        'display_name':     _display_name(user),
        'profile_pic':      profile.profile_pic.url if (can_view_full and profile.profile_pic) else None,
        'is_online':        profile.is_online,
        'status_text':      profile.status_text if can_view_full else None,
        'mutual_count':     _mutual_count(viewer, user),
        'connection_status': connection_status,  # pending/accepted/rejected/none
        'reason':           reason,
    }


def _get_connection_status(viewer: User, target: User) -> str:
    """
    Return the connection status from the viewer's perspective.
    Values: 'accepted', 'pending_sent', 'pending_received', 'rejected', 'none'
    """
    conn = UserConnection.objects.filter(
        Q(sender=viewer, receiver=target) | Q(sender=target, receiver=viewer)
    ).first()
    if not conn:
        return 'none'
    if conn.status == UserConnection.STATUS_ACCEPTED:
        return 'accepted'
    if conn.status == UserConnection.STATUS_REJECTED:
        return 'rejected'
    # Pending — distinguish direction so the UI can show correct buttons
    if conn.sender == viewer:
        return 'pending_sent'
    return 'pending_received'


# ── User Search ───────────────────────────────────────────────────────────────

def search_users(viewer: User, query: str, page: int = 1, page_size: int = 20) -> dict:
    """
    Case-insensitive search by username or status_text (display name).

    Security:
    - Excludes the viewer themselves (IDOR prevention)
    - Excludes users who have blocked the viewer or been blocked by the viewer
    - Uses ORM parameterised queries — no raw SQL (SQL injection prevention)
    - page_size is capped at 50 to prevent mass data extraction
    """
    query = query.strip()
    if not query:
        return {'results': [], 'total': 0, 'count': 0, 'page': page, 'page_size': page_size, 'has_next': False, 'next': None, 'previous': None}

    page_size = min(page_size, 50)  # Hard cap

    # Flatten blocked pairs into a single set, remove viewer's own id.
    flat_blocked = set()
    for pair in BlockList.objects.filter(
        Q(blocker=viewer) | Q(blocked=viewer)
    ).values_list('blocker_id', 'blocked_id'):
        flat_blocked.update(pair)
    flat_blocked.discard(viewer.id)

    # Search by username, first name, last name, or status text.
    matching_profiles = UserProfile.objects.filter(
        status_text__icontains=query
    ).values_list('user_id', flat=True)

    qs = User.objects.filter(
        Q(username__icontains=query)
        | Q(first_name__icontains=query)
        | Q(last_name__icontains=query)
        | Q(id__in=matching_profiles)
    ).exclude(
        id=viewer.id
    ).exclude(
        id__in=flat_blocked
    ).select_related('profile').order_by('username')

    total  = qs.count()
    offset = (page - 1) * page_size
    users  = qs[offset: offset + page_size]

    results = []
    for u in users:
        status = _get_connection_status(viewer, u)
        results.append(_serialize_user(u, viewer, status))

    return {
        'results':   results,
        'total':     total,
        'count':     total,
        'page':      page,
        'page_size': page_size,
        'has_next':  (offset + page_size) < total,
        'next':      page + 1 if (offset + page_size) < total else None,
        'previous':  page - 1 if page > 1 else None,
    }


# ── Connection Requests ───────────────────────────────────────────────────────

def send_connection_request(sender: User, receiver_id: int) -> dict:
    """
    Send a connection request.

    Security checks (in order):
    1. Cannot send to yourself
    2. Receiver must exist (raises 404-style error, not a 500)
    3. Block check — prevents blocked users from sending requests
    4. Privacy check — respects receiver's who_can_send_requests setting
    5. Duplicate check — unique_together on the model handles DB-level,
       but we check first to return a friendly error
    6. Reverse-direction check — if receiver already sent a request, auto-accept
    """
    if sender.id == receiver_id:
        raise ValidationError("You cannot send a connection request to yourself.")

    try:
        receiver = User.objects.get(id=receiver_id)
    except User.DoesNotExist:
        raise ValidationError("User not found.")

    # Block check
    if _is_blocked(sender, receiver):
        # Deliberately vague — don't reveal block status to prevent enumeration
        raise ValidationError("Unable to send connection request.")

    # Privacy check
    privacy = _get_privacy(receiver)
    if privacy.who_can_send_requests == PrivacySettings.NOBODY:
        raise ValidationError("This user is not accepting connection requests.")
    if privacy.who_can_send_requests == PrivacySettings.CONNECTIONS:
        # Only connections-of-connections can send requests
        receiver_connections = _get_connection_ids(receiver)
        sender_connections   = _get_connection_ids(sender)
        if not (receiver_connections & sender_connections):
            raise ValidationError("This user only accepts requests from mutual connections.")

    # Check if already connected
    if _are_connected(sender, receiver):
        raise ValidationError("You are already connected.")

    # Check for existing pending request in same direction
    if UserConnection.objects.filter(sender=sender, receiver=receiver, status=UserConnection.STATUS_PENDING).exists():
        raise ValidationError("Connection request already sent.")

    # If receiver already sent a request to sender, auto-accept both
    reverse = UserConnection.objects.filter(
        sender=receiver, receiver=sender, status=UserConnection.STATUS_PENDING
    ).first()
    if reverse:
        reverse.status = UserConnection.STATUS_ACCEPTED
        reverse.save()
        return {'status': 'accepted', 'message': 'You are now connected.'}

    conn = UserConnection.objects.create(sender=sender, receiver=receiver)
    return {'status': 'pending', 'message': 'Connection request sent.', 'connection_id': conn.id}


def cancel_connection_request(sender: User, receiver_id: int) -> dict:
    """Cancel a pending outgoing request. Only the sender can cancel."""
    try:
        conn = UserConnection.objects.get(
            sender=sender, receiver_id=receiver_id, status=UserConnection.STATUS_PENDING
        )
    except UserConnection.DoesNotExist:
        raise ValidationError("No pending request found.")
    conn.delete()
    return {'status': 'cancelled'}


def accept_connection_request(receiver: User, sender_id: int) -> dict:
    """
    Accept an incoming request.
    Security: only the receiver can accept — prevents IDOR where user A
    accepts a request on behalf of user B.
    """
    try:
        conn = UserConnection.objects.get(
            sender_id=sender_id, receiver=receiver, status=UserConnection.STATUS_PENDING
        )
    except UserConnection.DoesNotExist:
        raise ValidationError("No pending request found.")
    conn.status = UserConnection.STATUS_ACCEPTED
    conn.save()
    return {'status': 'accepted'}


def reject_connection_request(receiver: User, sender_id: int) -> dict:
    """
    Reject an incoming request.
    Security: only the receiver can reject.
    """
    try:
        conn = UserConnection.objects.get(
            sender_id=sender_id, receiver=receiver, status=UserConnection.STATUS_PENDING
        )
    except UserConnection.DoesNotExist:
        raise ValidationError("No pending request found.")
    conn.status = UserConnection.STATUS_REJECTED
    conn.save()
    return {'status': 'rejected'}


def remove_connection(user: User, other_id: int) -> dict:
    """
    Remove an accepted connection. Either party can remove.
    Security: we filter by both directions so neither party can remove
    a connection they are not part of (IDOR prevention).
    """
    deleted, _ = UserConnection.objects.filter(
        Q(sender=user, receiver_id=other_id) | Q(sender_id=other_id, receiver=user),
        status=UserConnection.STATUS_ACCEPTED,
    ).delete()
    if not deleted:
        raise ValidationError("No connection found.")
    return {'status': 'removed'}


# ── Pending Requests ──────────────────────────────────────────────────────────

def get_pending_requests(user: User) -> dict:
    """Return incoming and outgoing pending requests for the user."""
    incoming = UserConnection.objects.filter(
        receiver=user, status=UserConnection.STATUS_PENDING
    ).select_related('sender', 'sender__profile').order_by('-created_at')

    outgoing = UserConnection.objects.filter(
        sender=user, status=UserConnection.STATUS_PENDING
    ).select_related('receiver', 'receiver__profile').order_by('-created_at')

    def _req(conn, other_user):
        profile, _ = UserProfile.objects.get_or_create(user=other_user)
        return {
            'connection_id': conn.id,
            'user': {
                'id':          other_user.id,
                'username':    other_user.username,
                'display_name': _display_name(other_user),
                'profile_pic': profile.profile_pic.url if profile.profile_pic else None,
                'is_online':   profile.is_online,
            },
            'created_at': conn.created_at.isoformat(),
        }

    return {
        'incoming': [_req(c, c.sender)   for c in incoming],
        'outgoing': [_req(c, c.receiver) for c in outgoing],
    }


# ── Recent Connections ────────────────────────────────────────────────────────

def get_recent_connections(user: User, limit: int = 20) -> list:
    """Return recently accepted connections, newest first."""
    conns = UserConnection.objects.filter(
        Q(sender=user) | Q(receiver=user),
        status=UserConnection.STATUS_ACCEPTED,
    ).select_related(
        'sender', 'sender__profile',
        'receiver', 'receiver__profile',
    ).order_by('-updated_at')[:limit]

    results = []
    for c in conns:
        other = c.receiver if c.sender == user else c.sender
        profile, _ = UserProfile.objects.get_or_create(user=other)
        results.append({
            'id':          other.id,
            'username':    other.username,
            'display_name': _display_name(other),
            'profile_pic': profile.profile_pic.url if profile.profile_pic else None,
            'is_online':   profile.is_online,
            'connected_at': c.updated_at.isoformat(),
        })
    return results


# ── Suggested Connections ─────────────────────────────────────────────────────

def get_suggestions(user: User, limit: int = 20) -> list:
    """
    "People You May Know" algorithm.

    Scoring (additive):
    +3  per mutual connection
    +2  if in a shared Group
    +1  if in a shared community (future-proof placeholder)

    Security:
    - Excludes blocked users (both directions)
    - Excludes existing connections
    - Excludes pending requests (both directions)
    - Excludes the user themselves
    - Caps results to prevent mass data extraction
    """
    from .models import Group  # local import to avoid circular

    limit = min(limit, 50)

    # Build exclusion set: self + blocked + already connected + pending
    exclude_ids = {user.id}

    # Blocked (both directions)
    for pair in BlockList.objects.filter(
        Q(blocker=user) | Q(blocked=user)
    ).values_list('blocker_id', 'blocked_id'):
        exclude_ids.update(pair)

    # Already connected
    exclude_ids.update(_get_connection_ids(user))

    # Pending requests (both directions)
    pending_sent = UserConnection.objects.filter(
        sender=user, status=UserConnection.STATUS_PENDING
    ).values_list('receiver_id', flat=True)
    pending_recv = UserConnection.objects.filter(
        receiver=user, status=UserConnection.STATUS_PENDING
    ).values_list('sender_id', flat=True)
    exclude_ids.update(pending_sent)
    exclude_ids.update(pending_recv)

    # Candidate pool: all users not in exclusion set
    candidates = User.objects.exclude(id__in=exclude_ids).select_related('profile')

    # Score each candidate
    my_connection_ids = _get_connection_ids(user)
    my_groups = set(Group.objects.filter(members=user).values_list('id', flat=True))

    scored = []
    for candidate in candidates:
        score  = 0
        reason = []

        # Mutual connections
        mutual = len(my_connection_ids & _get_connection_ids(candidate))
        if mutual:
            score += mutual * 3
            reason.append(f"{mutual} mutual connection{'s' if mutual > 1 else ''}")

        # Shared groups
        candidate_groups = set(Group.objects.filter(members=candidate).values_list('id', flat=True))
        shared_groups = len(my_groups & candidate_groups)
        if shared_groups:
            score += shared_groups * 2
            reason.append(f"In {shared_groups} shared group{'s' if shared_groups > 1 else ''}")

        if score > 0:
            scored.append((score, candidate, reason))

    # Sort by score descending, take top `limit`
    scored.sort(key=lambda x: x[0], reverse=True)
    scored = scored[:limit]

    results = []
    for score, candidate, reason in scored:
        results.append({
            **_serialize_user(candidate, user, 'none', reason[0] if reason else 'You may know this person'),
            'score': score,
        })
    return results


# ── Blocking ──────────────────────────────────────────────────────────────────

def block_user(blocker: User, target_id: int) -> dict:
    """
    Block a user.
    Side effects:
    - Removes any existing connection between the two users
    - Removes any pending requests in either direction
    Security: cannot block yourself.
    """
    if blocker.id == target_id:
        raise ValidationError("You cannot block yourself.")

    try:
        target = User.objects.get(id=target_id)
    except User.DoesNotExist:
        raise ValidationError("User not found.")

    # Remove existing connection
    UserConnection.objects.filter(
        Q(sender=blocker, receiver=target) | Q(sender=target, receiver=blocker)
    ).delete()

    # Create block (get_or_create is idempotent)
    BlockList.objects.get_or_create(blocker=blocker, blocked=target)
    return {'status': 'blocked'}


def unblock_user(blocker: User, target_id: int) -> dict:
    """Unblock a user."""
    deleted, _ = BlockList.objects.filter(blocker=blocker, blocked_id=target_id).delete()
    if not deleted:
        raise ValidationError("User is not blocked.")
    return {'status': 'unblocked'}


# ── Privacy Settings ──────────────────────────────────────────────────────────

def update_privacy_settings(user: User, data: dict) -> dict:
    """
    Update privacy settings.
    Security: only the authenticated user can update their own settings.
    Input validation is done here before touching the DB.
    """
    privacy = _get_privacy(user)

    valid_request = {c[0] for c in PrivacySettings.REQUEST_CHOICES}
    valid_profile  = {c[0] for c in PrivacySettings.PROFILE_CHOICES}
    valid_message  = {c[0] for c in PrivacySettings.MESSAGE_CHOICES}

    if 'who_can_send_requests' in data:
        val = data['who_can_send_requests']
        if val not in valid_request:
            raise ValidationError(f"Invalid value for who_can_send_requests: {val}")
        privacy.who_can_send_requests = val

    if 'who_can_view_profile' in data:
        val = data['who_can_view_profile']
        if val not in valid_profile:
            raise ValidationError(f"Invalid value for who_can_view_profile: {val}")
        privacy.who_can_view_profile = val

    if 'who_can_message' in data:
        val = data['who_can_message']
        if val not in valid_message:
            raise ValidationError(f"Invalid value for who_can_message: {val}")
        privacy.who_can_message = val

    privacy.save()
    return {
        'who_can_send_requests': privacy.who_can_send_requests,
        'who_can_view_profile':  privacy.who_can_view_profile,
        'who_can_message':       privacy.who_can_message,
    }


def get_privacy_settings(user: User) -> dict:
    privacy = _get_privacy(user)
    return {
        'who_can_send_requests': privacy.who_can_send_requests,
        'who_can_view_profile':  privacy.who_can_view_profile,
        'who_can_message':       privacy.who_can_message,
    }
