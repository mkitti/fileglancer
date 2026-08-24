"""
Authentication module for OKTA OAuth/OIDC integration
"""
import os
import hashlib
from datetime import datetime, timedelta, UTC
from typing import Optional
from urllib.parse import urlsplit

from authlib.integrations.starlette_client import OAuth
from fastapi import HTTPException, Request, Response
from jose import jwt, JWTError
from loguru import logger

from fileglancer import database as db
from fileglancer.settings import Settings


def setup_oauth(settings: Settings) -> OAuth:
    """Initialize OAuth client for OKTA"""
    oauth = OAuth()

    if settings.enable_okta_auth:
        if not all([settings.okta_domain, settings.okta_client_id, settings.okta_client_secret]):
            raise ValueError("OKTA authentication enabled but credentials not configured")

        oauth.register(
            name='okta',
            client_id=settings.okta_client_id,
            client_secret=settings.okta_client_secret,
            server_metadata_url=f'https://{settings.okta_domain}/.well-known/openid-configuration',
            client_kwargs={
                'scope': 'openid email profile'
            }
        )
        logger.info(f"OKTA OAuth client configured for domain: {settings.okta_domain}")

    return oauth


def _hash_session_secret_key(session_secret_key: str) -> str:
    """Hash the session secret key using SHA-256"""
    return hashlib.sha256(session_secret_key.encode('utf-8')).hexdigest()


def verify_id_token(id_token: str, settings: Settings) -> dict:
    """
    Verify and decode OKTA ID token
    Returns the decoded token payload
    """
    try:
        # For OKTA, we typically don't verify signature here since authlib does it
        # But we decode to extract claims
        decoded = jwt.decode(
            id_token,
            options={"verify_signature": False}  # authlib already verified it
        )
        return decoded
    except JWTError as e:
        logger.error(f"Failed to decode ID token: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")


def get_session_from_cookie(request: Request, settings: Settings) -> Optional[db.SessionDB]:
    """
    Extract and validate session from cookie
    Returns the session object if valid, None otherwise
    """
    session_id = request.cookies.get(settings.session_cookie_name)

    if not session_id:
        return None

    # Get session from database
    with db.get_db_session(settings.db_url) as session:
        user_session = db.get_session_by_id(session, session_id)

        if not user_session:
            return None

        # Check if session is expired
        # Note: SQLAlchemy doesn't preserve timezone info, so we add UTC back
        expires_at_utc = user_session.expires_at.replace(tzinfo=UTC)
        if expires_at_utc < datetime.now(UTC):
            logger.info(f"Session expired for user {user_session.username}")
            db.delete_session(session, session_id)
            return None

        # Check if session secret key has changed (if hash is stored)
        if user_session.session_secret_key_hash:
            current_key_hash = _hash_session_secret_key(settings.session_secret_key)
            if user_session.session_secret_key_hash != current_key_hash:
                logger.warning(f"Session secret key changed, revoking session for user {user_session.username}")
                db.delete_session(session, session_id)
                return None

        # Update last accessed time
        db.update_session_access_time(session, session_id)

        # Access all attributes while still in session context to avoid DetachedInstanceError
        # This forces SQLAlchemy to load all attributes before the session closes
        _ = user_session.username
        _ = user_session.email
        _ = user_session.session_id

        return user_session


def _normalize_origin(origin: str) -> str:
    """Normalize an origin string to 'scheme://host[:port]' with no trailing slash."""
    return origin.strip().rstrip('/')


def is_origin_allowed(request: Request, settings: Settings) -> bool:
    """Check whether a request's Origin is allowed to use the session cookie.

    The session cookie is SameSite=Lax, so a browser will attach it to requests
    from any same-site page — including other subdomains under the same
    registrable domain. Combined with the wildcard CORS policy (kept wide open
    for the anonymous /files/ data links), that means any *.janelia.org page
    could otherwise ride a logged-in user's cookie. This is the app-layer gate:

      - No Origin header (same-origin GET/HEAD, curl, server-to-server) -> allow.
      - Origin whose host:port matches the request Host header (the Fileglancer
        UI calling its own API) -> allow. Comparing against Host rather than a
        configured self-origin keeps this correct behind TLS-terminating proxies.
      - Origin listed in api_allowed_origins -> allow.
      - Anything else -> reject.
    """
    origin = request.headers.get('origin')
    if not origin:
        return True

    # Same-origin: the Origin's netloc matches the Host the client addressed.
    host = request.headers.get('host', '')
    try:
        origin_netloc = urlsplit(origin).netloc
    except ValueError:
        return False
    if origin_netloc and origin_netloc == host:
        return True

    allowed = {_normalize_origin(o) for o in settings.api_allowed_origins}
    return _normalize_origin(origin) in allowed


def enforce_request_origin(request: Request, settings: Settings) -> None:
    """Reject cross-site requests whose Origin is not allowlisted.

    Raises HTTPException(403) when the Origin is present and not permitted.
    Call this before resolving the user on any cookie-authenticated endpoint.
    """
    if not is_origin_allowed(request, settings):
        origin = request.headers.get('origin')
        logger.warning(f"Rejected cross-origin request from disallowed origin: {origin}")
        raise HTTPException(
            status_code=403,
            detail="This origin is not allowed to access the Fileglancer API.",
        )


def get_current_user(request: Request, settings: Settings) -> str:
    """
    Get the current authenticated user

    Always validates session from cookie (for both OKTA and simple auth)
    Raises HTTPException(401) if authentication fails
    """
    user_session = get_session_from_cookie(request, settings)

    if not user_session:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in."
        )

    return user_session.username


def create_session_cookie(
    response: Response,
    session_id: str,
    settings: Settings
):
    """
    Set session cookie on response
    """
    max_age = settings.session_expiry_hours * 3600  # Convert hours to seconds

    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_id,
        max_age=max_age,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite='lax',  # CSRF protection while allowing navigation
        path='/'  # Ensure cookie is sent for all paths
    )


def delete_session_cookie(response: Response, settings: Settings):
    """
    Delete session cookie from response
    """
    response.delete_cookie(
        key=settings.session_cookie_name,
        path='/',  # Must match the path used when setting the cookie
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite='lax'
    )


# --- API token scopes ---

API_SCOPES = frozenset({
    "files:read", "files:write",
    "links:read", "links:write",
    "jobs:read", "jobs:write",
})

# Sentinel meaning "any valid token may call this", as distinct from None,
# which means "no token may call this at all".
ANY_SCOPE = ""

# Maps a request path prefix to the resource whose scope guards it. Order does
# not matter; prefixes are mutually exclusive.
#
# Deliberately absent: /api/file-share-paths, /api/external-buckets and
# /api/version have no get_current_user dependency and are already
# unauthenticated, so this table is never consulted for them. That is what
# lets the Python client resolve paths regardless of a token's scopes.
_SCOPE_PREFIXES = (
    ("/api/files", "files"),
    ("/api/content", "files"),
    ("/api/proxied-path", "links"),
    ("/api/neuroglancer", "links"),
    ("/api/jobs", "jobs"),
    ("/api/cluster-defaults", "jobs"),
)

# Readable by any valid token regardless of scope: identity and liveness.
_ANY_SCOPE_PATHS = ("/api/profile", "/api/auth/status")

_READ_METHODS = ("GET", "HEAD")


def _path_matches(path: str, prefix: str) -> bool:
    """True when path is the prefix itself or a child of it.

    The explicit '/' check is what stops '/api/filesystem-admin' from being
    treated as a child of '/api/files'.
    """
    return path == prefix or path.startswith(prefix + "/")


def required_scope(path: str, method: str) -> Optional[str]:
    """Return the scope an API token needs to call path with method.

    Returns ANY_SCOPE when any valid token suffices, and None when the path is
    not reachable with a token at all. None is the default: a path that is not
    listed here is session-only, which is what keeps /api/ssh-keys,
    /api/tokens, /api/apps, /api/catalog, /api/preference and /api/ticket out
    of reach without naming any of them.
    """
    if any(_path_matches(path, p) for p in _ANY_SCOPE_PATHS):
        return ANY_SCOPE

    for prefix, resource in _SCOPE_PREFIXES:
        if _path_matches(path, prefix):
            action = "read" if method.upper() in _READ_METHODS else "write"
            return f"{resource}:{action}"

    return None


def token_has_scope(granted: str, required: str) -> bool:
    """Check a token's space-separated scope string against a requirement."""
    if required == ANY_SCOPE:
        return True

    held = set(granted.split())
    if required in held:
        return True

    # ':write' implies ':read' for the same resource.
    resource, _, action = required.partition(":")
    return action == "read" and f"{resource}:write" in held
