import os

from django.conf import settings
from django.http import HttpResponse


def _allowed_origins():
    values = os.environ.get("CORS_ALLOWED_ORIGINS", "")
    return {origin.strip().rstrip("/") for origin in values.split(",") if origin.strip()}


class LocalFrontendCorsMiddleware:
    """
    Minimal credentialed CORS for the React frontend while testing a local backend.
    In DEBUG, echo localhost, LAN, Vercel preview, and configured tunnel origins.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse()
        else:
            response = self.get_response(request)

        origin = request.headers.get("Origin")
        if not origin:
            return response

        normalized_origin = origin.rstrip("/")
        host = normalized_origin.split("://", 1)[-1].split(":", 1)[0]
        allowed = normalized_origin in _allowed_origins()

        if settings.DEBUG and (
            host == "localhost"
            or host == "127.0.0.1"
            or host.endswith(".local")
            or host.endswith(".vercel.app")
            or host.startswith("192.168.")
            or host.startswith("10.")
            or (host.startswith("172.") and host.split(".")[1].isdigit() and 16 <= int(host.split(".")[1]) <= 31)
        ):
            allowed = True

        if allowed:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Headers"] = "Content-Type, X-Requested-With, X-CSRFToken"
            response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response["Vary"] = "Origin"

        return response
