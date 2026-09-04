"""
Custom access log middleware for FastAPI/Uvicorn

This middleware logs HTTP access information including authenticated username.
It replaces Uvicorn's default access logger to provide more detailed logging
with application-level authentication context.

Each request is logged as one human-readable line, with the same facts also
attached as Elastic Common Schema fields, which the JSON log format in
``fileglancer.logconf`` emits for Kibana.
"""
import secrets
import time
from typing import Callable

from fastapi import Request, Response
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from fileglancer import auth
from fileglancer.logconf import SERVICE_NAME
from fileglancer.settings import Settings


def _log_safe(value: str) -> str:
    """Escape anything in client-controlled text that could disturb a log line.

    Turns control characters into their escapes, so a request target can't add
    lines, recolour a terminal tailing the log, or smuggle loguru's '|' field
    separator into a field. Ordinary percent-encoded paths pass through
    unchanged.
    """
    return value.encode("unicode_escape").decode("ascii")


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

    # Paths that are logged in aggregate elsewhere rather than per request. The
    # service proxy's resolve endpoint is called once per proxied HTTP request,
    # so a single app page load would emit dozens of identical 204 lines that
    # carry no user, no useful path and no useful duration — and would skew the
    # duration percentiles for the endpoints that do. It reports running totals
    # once a minute instead; see fileglancer/apps/serviceproxy.py.
    _AGGREGATED_PATHS = frozenset({"/api/apps/resolve"})

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log access information"""
        # Checked before anything else so an aggregated path also skips the
        # session-cookie lookup below — that is signature work per request, on a
        # cookie a proxied app subdomain never sends in the first place.
        if request.url.path in self._AGGREGATED_PATHS:
            return await call_next(request)

        start_time = time.perf_counter()

        # Extract username from session (if authenticated)
        username = "-"
        try:
            user_session = auth.get_session_from_cookie(request, self.settings)
            if user_session and user_session.username:
                username = user_session.username
        except Exception:
            # Silently handle any authentication errors - user is just not authenticated
            pass

        # Bind an id for this request as ECS trace.id, so every line logged
        # while serving it can be grouped with its access log line in Kibana.
        # It also goes back to the client as a response header, so a bug report
        # quoting it is enough to find the request.
        request_id = secrets.token_hex(8)
        with logger.contextualize(**{"trace.id": request_id}):
            response = await call_next(request)
        response.headers["x-request-id"] = request_id

        # Token-authenticated requests have no session cookie, so the lookup
        # above found nothing and username is still '-'. get_user_from_token
        # leaves the resolved identity on request.state, which is readable now
        # that the endpoint has run. The cookie lookup above is deliberately
        # left in place rather than replaced by this: logout deletes the
        # session during the request, so resolving it only after call_next
        # would log '-' for the request that did the logging out.
        token_username = getattr(request.state, "fg_username", None)
        if token_username:
            token_id = getattr(request.state, "fg_token_id", None)
            username = (f"{token_username} fgt:{token_id}" if token_id
                        else token_username)

        # Calculate request duration
        # ponytail: BaseHTTPMiddleware returns once the response starts, so for
        # streamed downloads this is time-to-first-byte, not transfer time.
        # Rewrite as pure ASGI (see x2s3's AccessLogMiddleware) if download
        # latency ever needs charting.
        duration_s = time.perf_counter() - start_time
        duration_ms = duration_s * 1000

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
        # API token requests carry the token id: [username fgt:a1b2c3d4e5f6]
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

        # The same facts as the message above, keyed by ECS field name. Text
        # mode ignores them; JSON mode merges them into the logged object,
        # where event.duration is what p95/p99 aggregations run on.
        fields = {
            "event.dataset": f"{SERVICE_NAME}.access",
            # ECS measures event.duration in nanoseconds.
            "event.duration": int(duration_s * 1_000_000_000),
            "trace.id": request_id,
            "http.request.method": request.method,
            "http.response.status_code": response.status_code,
            "http.version": http_version,
            "url.path": _log_safe(path),
            "client.ip": client_host,
            "client.port": client_port,
        }
        if request.url.query:
            fields["url.query"] = _log_safe(request.url.query)
        if username != "-":
            fields["user.name"] = token_username or username
            if token_username and token_id:
                fields["labels.token_id"] = token_id
        # The handler function name, so latency can be grouped by endpoint.
        # Raw paths are unbounded cardinality and useless to aggregate over.
        endpoint = request.scope.get("endpoint")
        if endpoint is not None:
            fields["labels.endpoint"] = getattr(endpoint, "__name__", str(endpoint))
        content_length = response.headers.get("content-length")
        if content_length is not None:
            fields["http.response.body.bytes"] = int(content_length)
        for header, field in (("user-agent", "user_agent.original"),
                              ("host", "url.domain")):
            value = request.headers.get(header)
            if value:
                fields[field] = _log_safe(value)

        # Log at INFO level for successful requests, WARNING for client errors, ERROR for server errors
        log = logger.bind(**fields)
        if 200 <= response.status_code < 400:
            log.info(log_message)
        elif 400 <= response.status_code < 500:
            log.warning(log_message)
        else:
            log.error(log_message)

        return response
