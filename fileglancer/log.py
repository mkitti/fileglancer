"""
Custom access log middleware for FastAPI/Uvicorn

This middleware logs HTTP access information including authenticated username.
It replaces Uvicorn's default access logger to provide more detailed logging
with application-level authentication context.
"""
import logging
import time
from typing import Callable

from fastapi import Request, Response
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from fileglancer import auth
from fileglancer.settings import Settings


def _log_safe(value: str) -> str:
    """Escape anything in client-controlled text that could disturb a log line.

    Turns control characters into their escapes, so a request target can't add
    lines, recolour a terminal tailing the log, or smuggle loguru's '|' field
    separator into a field. Ordinary percent-encoded paths pass through
    unchanged.
    """
    return value.encode("unicode_escape").decode("ascii")


def disable_uvicorn_access_log():
    """Silence Uvicorn's own access logger, which AccessLogMiddleware replaces.

    Left enabled, every request is logged twice: once here with the username and
    duration, once by Uvicorn without them. Uvicorn's ``--no-access-log`` does
    the same thing from the outside, but it has to be remembered on every launch
    command, and it was missing from several. Doing it where the middleware is
    installed covers any way the app is started.

    Matches what Uvicorn's own ``access_log=False`` does. Safe to call more than
    once, and safe at import time: Uvicorn configures logging before it imports
    the app, including in each --reload/--workers subprocess.
    """
    access_logger = logging.getLogger("uvicorn.access")
    access_logger.handlers = []
    access_logger.propagate = False


class AccessLogMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs HTTP access information with username when available.

    Logs in a format similar to standard HTTP access logs but includes:
    - Client IP and port
    - Authenticated username (or '-' if not authenticated)
    - Request method, path, and HTTP version
    - Response status code
    - Request duration in milliseconds
    """

    def __init__(self, app: ASGIApp, settings: Settings):
        super().__init__(app)
        self.settings = settings

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log access information"""
        start_time = time.time()

        # Extract username from session (if authenticated)
        username = "-"
        try:
            user_session = auth.get_session_from_cookie(request, self.settings)
            if user_session and user_session.username:
                username = user_session.username
        except Exception:
            # Silently handle any authentication errors - user is just not authenticated
            pass

        # Process the request
        response = await call_next(request)

        # Calculate request duration
        duration_ms = (time.time() - start_time) * 1000

        # Extract client information
        client_host = request.client.host if request.client else "unknown"
        client_port = request.client.port if request.client else 0

        # Get HTTP version from scope
        http_version = request.scope.get("http_version", "1.1")

        # Log the target as the client sent it. scope["path"] is percent-decoded
        # per the ASGI spec, so a filename containing a literal '%' (sent as
        # '%25') logs as '%' and the line no longer round-trips to the request
        # that was made. raw_path is the encoded form, which is also what
        # Uvicorn's own access log reports.
        raw_path = request.scope.get("raw_path")
        path = raw_path.decode("latin-1") if raw_path else request.url.path

        # Format log message in a standard access log format
        # Example: 192.168.1.100:54321 [username] "GET /api/files HTTP/1.1" 200 - 45.23ms
        log_message = (
            f"{client_host}:{client_port} [{username}] "
            f'"{request.method} {_log_safe(path)}'
        )

        # Add query string if present
        if request.url.query:
            log_message += f"?{_log_safe(request.url.query)}"

        log_message += (
            f' HTTP/{http_version}" '
            f"{response.status_code} - {duration_ms:.2f}ms"
        )

        # Log at INFO level for successful requests, WARNING for client errors, ERROR for server errors
        if 200 <= response.status_code < 400:
            logger.info(log_message)
        elif 400 <= response.status_code < 500:
            logger.warning(log_message)
        else:
            logger.error(log_message)

        return response
