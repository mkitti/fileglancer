# Python API and API Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users mint scoped API tokens in the Fileglancer GUI and use them from a Python client that operates on absolute UNIX paths.

**Architecture:** Bearer-token auth is layered into the single `auth.get_current_user()` function that every authenticated route already depends on, so no route is edited. A path-prefix table maps request paths to scopes, deny-by-default. The Python client is a thin `httpx` wrapper that resolves absolute paths to `(fsp_name, relative_path)` entirely client-side, so the REST API gains nothing but the three token-management endpoints.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (sync), Alembic, Pydantic v2, httpx, pytest; React 18 + TypeScript + TanStack Query + Material Tailwind v3 on the frontend.

**Spec:** `docs/superpowers/specs/2026-08-24-python-api-design.md`

## Global Constraints

- **Always use pixi.** Never run `pytest`, `npm`, or `npx` directly. Backend tests: `pixi run -e test test-backend`. Frontend checks: `pixi run node-check`, `pixi run node-eslint-write`, `pixi run node-prettier-write`.
- **No new Python dependencies.** `httpx` is already in `pyproject.toml` and is the only HTTP library the client may use.
- **No Janelia-specific names** in `fileglancer` code or comments.
- Token scope names are exactly: `files:read`, `files:write`, `links:read`, `links:write`, `jobs:read`, `jobs:write`.
- Token expiry: default 30 days, minimum 1 day, maximum 365 days. There is no "never expires" option.
- Token string format is exactly `fgt_<token_id>_<secret>` where `token_id` is 12 characters.
- The new Alembic migration's `down_revision` is `'e7b2a9c4f130'`.
- Never hard-wrap prose in Markdown files: one line per paragraph.
- SQLAlchemy does not preserve timezone info. Every `DateTime` read back from the database must have `.replace(tzinfo=UTC)` applied before comparison, matching `fileglancer/auth.py:78`.
- Run `pixi run node-eslint-write` and `pixi run node-prettier-write` after every frontend task.

---

### Task 1: Token database model, CRUD, and migration

**Files:**
- Modify: `fileglancer/database.py` (add model near `SessionDB` at line 260; add functions near the session functions at line 940)
- Create: `fileglancer/alembic/versions/f2a8c1d94e60_add_api_tokens_table.py`
- Test: `tests/test_api_tokens.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `db.ApiTokenDB` with columns `id, token_id, token_hash, username, name, scopes, created_at, expires_at, last_used_at`
  - `db.hash_token_secret(secret: str) -> str`
  - `db.create_api_token(session, username: str, name: str, scopes: list[str], expires_in_days: int = 30) -> tuple[ApiTokenDB, str]` returning `(row, plaintext_token)`
  - `db.get_api_token_by_id(session, token_id: str) -> Optional[ApiTokenDB]`
  - `db.list_api_tokens(session, username: str) -> list[ApiTokenDB]`
  - `db.delete_api_token(session, username: str, token_id: str) -> int`
  - `db.touch_api_token(session, token_id: str) -> None`
  - Constants `db.API_TOKEN_PREFIX = "fgt"`, `db.DEFAULT_TOKEN_EXPIRY_DAYS = 30`, `db.MAX_TOKEN_EXPIRY_DAYS = 365`, `db.TOKEN_TOUCH_INTERVAL_SECONDS = 300`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_api_tokens.py`:

```python
"""Tests for API token storage and CRUD."""
from datetime import datetime, timedelta, UTC

import pytest

from fileglancer.database import (
    ApiTokenDB,
    Base,
    MAX_TOKEN_EXPIRY_DAYS,
    create_api_token,
    create_engine,
    delete_api_token,
    get_api_token_by_id,
    hash_token_secret,
    list_api_tokens,
    sessionmaker,
    touch_api_token,
)


@pytest.fixture
def db_session(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'tokens.db'}")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    engine.dispose()


def test_create_token_returns_plaintext_matching_stored_hash(db_session):
    row, plaintext = create_api_token(db_session, "alice", "laptop", ["files:read"])

    prefix, token_id, secret = plaintext.split("_", 2)
    assert prefix == "fgt"
    assert token_id == row.token_id
    assert len(token_id) == 12
    assert hash_token_secret(secret) == row.token_hash
    # The secret itself is never stored.
    assert secret not in row.token_hash


def test_create_token_defaults_to_30_day_expiry(db_session):
    row, _ = create_api_token(db_session, "alice", "laptop", ["files:read"])

    expires_at = row.expires_at.replace(tzinfo=UTC)
    delta = expires_at - datetime.now(UTC)
    assert timedelta(days=29) < delta <= timedelta(days=30)


def test_create_token_rejects_expiry_above_maximum(db_session):
    with pytest.raises(ValueError, match="between 1 and 365"):
        create_api_token(db_session, "alice", "laptop", ["files:read"],
                         expires_in_days=MAX_TOKEN_EXPIRY_DAYS + 1)


def test_create_token_rejects_zero_day_expiry(db_session):
    with pytest.raises(ValueError, match="between 1 and 365"):
        create_api_token(db_session, "alice", "laptop", ["files:read"],
                         expires_in_days=0)


def test_scopes_are_stored_space_separated_and_sorted(db_session):
    row, _ = create_api_token(db_session, "alice", "laptop",
                              ["links:write", "files:read"])
    assert row.scopes == "files:read links:write"


def test_token_ids_are_unique_across_creations(db_session):
    ids = {create_api_token(db_session, "alice", f"t{i}", ["files:read"])[0].token_id
           for i in range(50)}
    assert len(ids) == 50


def test_get_by_id_returns_none_for_unknown_id(db_session):
    assert get_api_token_by_id(db_session, "doesnotexist") is None


def test_list_returns_only_the_callers_tokens(db_session):
    create_api_token(db_session, "alice", "a", ["files:read"])
    create_api_token(db_session, "bob", "b", ["files:read"])

    names = [t.name for t in list_api_tokens(db_session, "alice")]
    assert names == ["a"]


def test_delete_removes_the_row_and_returns_one(db_session):
    row, _ = create_api_token(db_session, "alice", "a", ["files:read"])

    assert delete_api_token(db_session, "alice", row.token_id) == 1
    assert get_api_token_by_id(db_session, row.token_id) is None


def test_delete_refuses_another_users_token(db_session):
    row, _ = create_api_token(db_session, "alice", "a", ["files:read"])

    assert delete_api_token(db_session, "bob", row.token_id) == 0
    assert get_api_token_by_id(db_session, row.token_id) is not None


def test_touch_sets_last_used_when_never_used(db_session):
    row, _ = create_api_token(db_session, "alice", "a", ["files:read"])
    assert row.last_used_at is None

    touch_api_token(db_session, row.token_id)

    assert get_api_token_by_id(db_session, row.token_id).last_used_at is not None


def test_touch_is_a_noop_when_recently_used(db_session):
    row, _ = create_api_token(db_session, "alice", "a", ["files:read"])
    touch_api_token(db_session, row.token_id)
    first = get_api_token_by_id(db_session, row.token_id).last_used_at

    touch_api_token(db_session, row.token_id)

    assert get_api_token_by_id(db_session, row.token_id).last_used_at == first


def test_touch_updates_when_stale(db_session):
    row, _ = create_api_token(db_session, "alice", "a", ["files:read"])
    row.last_used_at = datetime.now(UTC) - timedelta(hours=1)
    db_session.commit()
    stale = row.last_used_at

    touch_api_token(db_session, row.token_id)

    assert get_api_token_by_id(db_session, row.token_id).last_used_at > stale


def test_touch_ignores_unknown_token(db_session):
    touch_api_token(db_session, "doesnotexist")  # must not raise
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pixi run -e test test-backend -- tests/test_api_tokens.py -v`
Expected: FAIL with `ImportError: cannot import name 'ApiTokenDB' from 'fileglancer.database'`

- [ ] **Step 3: Add the model**

In `fileglancer/database.py`, immediately after the `SessionDB` class (which ends at line 273):

```python
# --- API token constants ---

API_TOKEN_PREFIX = "fgt"
API_TOKEN_ID_LENGTH = 12
DEFAULT_TOKEN_EXPIRY_DAYS = 30
MAX_TOKEN_EXPIRY_DAYS = 365

# last_used_at is refreshed at most this often, so token auth does not cost a
# database write on every single API request.
TOKEN_TOUCH_INTERVAL_SECONDS = 300


class ApiTokenDB(Base):
    """Database model for programmatic API tokens.

    Only the SHA-256 hash of the secret half is stored. The full token string
    is returned exactly once, at creation, and is not recoverable afterwards.
    """
    __tablename__ = 'api_tokens'

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_id = Column(String, nullable=False, unique=True, index=True)
    token_hash = Column(String, nullable=False)
    username = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    scopes = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(UTC))
    expires_at = Column(DateTime, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
```

- [ ] **Step 4: Add the CRUD functions**

In `fileglancer/database.py`, after `delete_expired_sessions` (ends line 989):

```python
# --- API token functions ---

def hash_token_secret(secret: str) -> str:
    """Hash the secret half of an API token.

    ponytail: SHA-256 rather than a slow KDF. The secret is 32 bytes from
    secrets.token_urlsafe, not a human-chosen password, so key stretching
    defends against nothing here. Revisit only if user-chosen secrets are
    ever allowed.
    """
    return hashlib.sha256(secret.encode('utf-8')).hexdigest()


def create_api_token(session: Session, username: str, name: str,
                     scopes: List[str],
                     expires_in_days: int = DEFAULT_TOKEN_EXPIRY_DAYS
                     ) -> Tuple[ApiTokenDB, str]:
    """Create an API token for a user.

    Returns (row, plaintext_token). The plaintext token is the only time the
    secret is available; only its hash is persisted.
    """
    if not 1 <= expires_in_days <= MAX_TOKEN_EXPIRY_DAYS:
        raise ValueError(
            f"expires_in_days must be between 1 and {MAX_TOKEN_EXPIRY_DAYS}")

    token_id = secrets.token_urlsafe(16)[:API_TOKEN_ID_LENGTH]
    secret = secrets.token_urlsafe(32)
    now = datetime.now(UTC)

    row = ApiTokenDB(
        token_id=token_id,
        token_hash=hash_token_secret(secret),
        username=username,
        name=name,
        scopes=" ".join(sorted(scopes)),
        created_at=now,
        expires_at=now + timedelta(days=expires_in_days),
        last_used_at=None,
    )
    session.add(row)
    session.commit()
    return row, f"{API_TOKEN_PREFIX}_{token_id}_{secret}"


def get_api_token_by_id(session: Session, token_id: str) -> Optional[ApiTokenDB]:
    """Get an API token row by its public token_id."""
    return session.query(ApiTokenDB).filter_by(token_id=token_id).first()


def list_api_tokens(session: Session, username: str) -> List[ApiTokenDB]:
    """List a user's API tokens, newest first."""
    return (session.query(ApiTokenDB)
            .filter_by(username=username)
            .order_by(ApiTokenDB.created_at.desc())
            .all())


def delete_api_token(session: Session, username: str, token_id: str) -> int:
    """Revoke a token. Returns the number of rows deleted (0 or 1).

    Filtering on username as well as token_id means one user cannot revoke
    another user's token by guessing its id.
    """
    deleted = (session.query(ApiTokenDB)
               .filter_by(username=username, token_id=token_id)
               .delete())
    session.commit()
    return deleted


def touch_api_token(session: Session, token_id: str) -> None:
    """Refresh last_used_at, at most once per TOKEN_TOUCH_INTERVAL_SECONDS."""
    row = get_api_token_by_id(session, token_id)
    if row is None:
        return

    now = datetime.now(UTC)
    if row.last_used_at is not None:
        # SQLAlchemy strips tzinfo on read; add it back before comparing.
        last_used = row.last_used_at.replace(tzinfo=UTC)
        if (now - last_used).total_seconds() < TOKEN_TOUCH_INTERVAL_SECONDS:
            return

    row.last_used_at = now
    session.commit()
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pixi run -e test test-backend -- tests/test_api_tokens.py -v`
Expected: PASS, 14 tests

- [ ] **Step 6: Write the migration**

Create `fileglancer/alembic/versions/f2a8c1d94e60_add_api_tokens_table.py`:

```python
"""add api_tokens table

Revision ID: f2a8c1d94e60
Revises: e7b2a9c4f130
Create Date: 2026-08-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f2a8c1d94e60'
down_revision = 'e7b2a9c4f130'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'api_tokens',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('token_id', sa.String(), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('scopes', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_api_tokens_token_id', 'api_tokens', ['token_id'], unique=True)
    op.create_index('ix_api_tokens_username', 'api_tokens', ['username'])


def downgrade() -> None:
    op.drop_index('ix_api_tokens_username', table_name='api_tokens')
    op.drop_index('ix_api_tokens_token_id', table_name='api_tokens')
    op.drop_table('api_tokens')
```

- [ ] **Step 7: Verify the migration applies cleanly**

```bash
FILEGLANCER_MIGRATION_DB_URL=sqlite:////tmp/fgmig.db pixi run migrate
```

Expected: no error, and `f2a8c1d94e60` is the new head. Confirm the table exists:

```bash
sqlite3 /tmp/fgmig.db ".schema api_tokens" && rm /tmp/fgmig.db
```

Expected: the `CREATE TABLE api_tokens` statement plus both indexes.

- [ ] **Step 8: Commit**

```bash
git add fileglancer/database.py fileglancer/alembic/versions/f2a8c1d94e60_add_api_tokens_table.py tests/test_api_tokens.py
git commit -m "feat: add api_tokens table and CRUD functions"
```

---

### Task 2: Scope table and scope-check logic

**Files:**
- Modify: `fileglancer/auth.py` (add at the end of the file)
- Test: `tests/test_api_scopes.py`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `auth.API_SCOPES: frozenset[str]` — the six valid scope names
  - `auth.ANY_SCOPE: str` — the sentinel `""`, meaning "any valid token"
  - `auth.required_scope(path: str, method: str) -> Optional[str]` — returns a scope name, `ANY_SCOPE`, or `None` when the path is not token-reachable
  - `auth.token_has_scope(granted: str, required: str) -> bool` — `granted` is the space-separated string stored on the token row

These two functions are pure. Keeping them free of database and request objects is what makes them cheap to test exhaustively.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_api_scopes.py`:

```python
"""Tests for the API token scope table and scope matching.

Both functions under test are pure, so these are plain table-driven tests
with no database or app fixture.
"""
import pytest

from fileglancer.auth import (
    ANY_SCOPE,
    API_SCOPES,
    required_scope,
    token_has_scope,
)


def test_api_scopes_are_exactly_the_six_documented_names():
    assert API_SCOPES == frozenset({
        "files:read", "files:write",
        "links:read", "links:write",
        "jobs:read", "jobs:write",
    })


@pytest.mark.parametrize("path,method,expected", [
    ("/api/files/tempdir", "GET", "files:read"),
    ("/api/files/tempdir", "POST", "files:write"),
    ("/api/files/tempdir", "PATCH", "files:write"),
    ("/api/files/tempdir", "DELETE", "files:write"),
    ("/api/content/tempdir/a.txt", "GET", "files:read"),
    ("/api/content/tempdir/a.txt", "HEAD", "files:read"),
    ("/api/content/tempdir/a.txt", "PUT", "files:write"),
    ("/api/proxied-path", "GET", "links:read"),
    ("/api/proxied-path", "POST", "links:write"),
    ("/api/proxied-path/abc123", "DELETE", "links:write"),
    ("/api/neuroglancer/nglinks", "GET", "links:read"),
    ("/api/neuroglancer/nglinks", "POST", "links:write"),
    ("/api/jobs", "GET", "jobs:read"),
    ("/api/jobs", "POST", "jobs:write"),
    ("/api/jobs/12/cancel", "POST", "jobs:write"),
    ("/api/cluster-defaults", "GET", "jobs:read"),
])
def test_required_scope_maps_path_and_method(path, method, expected):
    assert required_scope(path, method) == expected


@pytest.mark.parametrize("path", ["/api/profile", "/api/auth/status"])
def test_paths_readable_by_any_valid_token(path):
    assert required_scope(path, "GET") == ANY_SCOPE


@pytest.mark.parametrize("path", [
    "/api/ssh-keys",
    "/api/ssh-keys/generate-temp",
    "/api/tokens",
    "/api/tokens/abc123",
    "/api/apps",
    "/api/catalog",
    "/api/preference/foo",
    "/api/ticket",
])
def test_unlisted_paths_are_not_token_reachable(path):
    assert required_scope(path, "GET") is None


def test_prefix_match_does_not_leak_across_similar_paths():
    # "/api/filesystem-admin" must not match the "/api/files" prefix.
    assert required_scope("/api/filesystem-admin", "GET") is None


@pytest.mark.parametrize("granted,required,expected", [
    ("files:read", "files:read", True),
    ("files:read", "files:write", False),
    ("files:write", "files:read", True),      # write implies read
    ("files:write", "files:write", True),
    ("files:read links:write", "links:read", True),
    ("files:read", "links:read", False),
    ("files:write", "jobs:read", False),
    ("", "files:read", False),
])
def test_token_has_scope(granted, required, expected):
    assert token_has_scope(granted, required) is expected


@pytest.mark.parametrize("granted", ["", "files:read", "jobs:write"])
def test_any_scope_is_satisfied_by_any_token(granted):
    assert token_has_scope(granted, ANY_SCOPE) is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pixi run -e test test-backend -- tests/test_api_scopes.py -v`
Expected: FAIL with `ImportError: cannot import name 'ANY_SCOPE' from 'fileglancer.auth'`

- [ ] **Step 3: Implement the scope table**

Append to `fileglancer/auth.py`:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pixi run -e test test-backend -- tests/test_api_scopes.py -v`
Expected: PASS, 40 tests

- [ ] **Step 5: Commit**

```bash
git add fileglancer/auth.py tests/test_api_scopes.py
git commit -m "feat: add API token scope table and matching logic"
```

---

### Task 3: Bearer token authentication

**Files:**
- Modify: `fileglancer/auth.py` (add `parse_bearer_token` and `get_user_from_token`; edit `get_current_user` at line 170)
- Modify: `fileglancer/server.py:173-186` (`get_current_user` dependency)
- Test: `tests/test_api_token_auth.py`

**Interfaces:**
- Consumes: `db.get_api_token_by_id`, `db.hash_token_secret`, `db.touch_api_token`, `db.API_TOKEN_PREFIX` (Task 1); `auth.required_scope`, `auth.token_has_scope`, `auth.ANY_SCOPE` (Task 2).
- Produces:
  - `auth.parse_bearer_token(request) -> Optional[str]` — the raw token string, or `None` when the request is not bearer-authenticated
  - `auth.get_user_from_token(request, settings, raw_token: str) -> str`
  - `auth.get_current_user` now handles both bearer and cookie auth

- [ ] **Step 1: Write the failing tests**

Create `tests/test_api_token_auth.py`:

```python
"""End-to-end tests for bearer-token authentication and scope enforcement.

Uses the real get_current_user dependency (no override), so these exercise the
full auth path the way a Python client would hit it.
"""
import os
import shutil
import tempfile
from datetime import datetime, timedelta, UTC

import pytest
from fastapi.testclient import TestClient

import fileglancer.database
import fileglancer.settings
from fileglancer.database import (
    Base,
    FileSharePathDB,
    create_api_token,
    create_engine,
    dispose_engine,
    sessionmaker,
)
from fileglancer.server import create_app
from fileglancer.settings import Settings


@pytest.fixture
def token_app():
    """App backed by a temp database with one file share, no auth override."""
    temp_dir = tempfile.mkdtemp()
    db_url = f"sqlite:///{os.path.join(temp_dir, 'test.db')}"
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    db_session = sessionmaker(bind=engine)()
    db_session.add(FileSharePathDB(
        name="tempdir", zone="testzone", group="testgroup", storage="local",
        mount_path=temp_dir, mac_path="smb://tempdir/test/path",
        windows_path="\\\\tempdir\\test\\path", linux_path="/tempdir/test/path",
    ))
    db_session.commit()

    settings = Settings(db_url=db_url, file_share_mounts=[], cli_mode=True)
    original = fileglancer.settings.get_settings
    fileglancer.settings.get_settings = lambda: settings
    fileglancer.database.get_settings = lambda: settings

    yield create_app(settings), db_session

    db_session.close()
    engine.dispose()
    dispose_engine(db_url)
    from fileglancer.user_worker import _filestore_cache, _user_groups_cache
    _filestore_cache.clear()
    _user_groups_cache.clear()
    fileglancer.settings.get_settings = original
    fileglancer.database.get_settings = original
    shutil.rmtree(temp_dir)


def _client_with_token(token_app, scopes, expires_in_days=30):
    app, db_session = token_app
    row, plaintext = create_api_token(db_session, "alice", "test", scopes,
                                      expires_in_days=expires_in_days)
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {plaintext}"
    return client, row


def test_valid_token_authenticates_a_scoped_request(token_app):
    client, _ = _client_with_token(token_app, ["files:read"])

    response = client.get("/api/files/tempdir")

    assert response.status_code == 200


def test_write_scope_satisfies_a_read_request(token_app):
    client, _ = _client_with_token(token_app, ["files:write"])

    assert client.get("/api/files/tempdir").status_code == 200


def test_read_scope_is_refused_a_write_request(token_app):
    client, _ = _client_with_token(token_app, ["files:read"])

    response = client.post("/api/files/tempdir?subpath=newdir",
                           json={"type": "directory"})

    assert response.status_code == 403
    assert "files:write" in response.json()["detail"]


def test_wrong_resource_scope_is_refused(token_app):
    client, _ = _client_with_token(token_app, ["links:read"])

    response = client.get("/api/files/tempdir")

    assert response.status_code == 403


def test_session_only_path_is_refused_to_every_token(token_app):
    client, _ = _client_with_token(token_app, ["files:write", "links:write",
                                               "jobs:write"])

    response = client.get("/api/ssh-keys")

    assert response.status_code == 403
    assert "not accessible with an API token" in response.json()["detail"]


def test_a_token_cannot_mint_another_token(token_app):
    client, _ = _client_with_token(token_app, ["files:write", "links:write",
                                               "jobs:write"])

    response = client.post("/api/tokens", json={
        "name": "escalated", "scopes": ["files:write"], "expires_in_days": 30,
    })

    assert response.status_code == 403


def test_profile_is_readable_with_any_scope(token_app):
    client, _ = _client_with_token(token_app, ["links:read"])

    assert client.get("/api/profile").status_code == 200


def test_expired_token_is_rejected(token_app):
    app, db_session = token_app
    row, plaintext = create_api_token(db_session, "alice", "old", ["files:read"])
    row.expires_at = datetime.now(UTC) - timedelta(days=1)
    db_session.commit()

    client = TestClient(app)
    response = client.get("/api/files/tempdir",
                          headers={"Authorization": f"Bearer {plaintext}"})

    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_unknown_token_id_is_rejected(token_app):
    app, _ = token_app
    client = TestClient(app)

    response = client.get("/api/files/tempdir",
                          headers={"Authorization": "Bearer fgt_notarealid_secret"})

    assert response.status_code == 401


def test_wrong_secret_for_a_real_token_id_is_rejected(token_app):
    app, db_session = token_app
    row, _ = create_api_token(db_session, "alice", "test", ["files:read"])
    client = TestClient(app)

    response = client.get(
        "/api/files/tempdir",
        headers={"Authorization": f"Bearer fgt_{row.token_id}_wrongsecret"})

    assert response.status_code == 401


def test_malformed_token_is_rejected(token_app):
    app, _ = token_app
    client = TestClient(app)

    response = client.get("/api/files/tempdir",
                          headers={"Authorization": "Bearer fgt_missingsecret"})

    assert response.status_code == 401
    assert "malformed" in response.json()["detail"].lower()


def test_non_fgt_bearer_falls_through_to_cookie_auth(token_app):
    # A bearer value that is not an fgt_ token is not a Fileglancer API token,
    # so the request is treated as unauthenticated rather than rejected as a
    # bad token.
    app, _ = token_app
    client = TestClient(app)

    response = client.get("/api/files/tempdir",
                          headers={"Authorization": "Bearer someothertoken"})

    assert response.status_code == 401
    assert "log in" in response.json()["detail"].lower()


def test_token_auth_ignores_a_disallowed_origin(token_app):
    # Origin enforcement exists to protect ambient cookie auth. A bearer token
    # is not ambient, so a cross-origin script with a valid token is fine.
    client, _ = _client_with_token(token_app, ["files:read"])

    response = client.get("/api/files/tempdir",
                          headers={"Origin": "https://evil.example.com"})

    assert response.status_code == 200


def test_token_use_updates_last_used_at(token_app):
    client, row = _client_with_token(token_app, ["files:read"])
    assert row.last_used_at is None

    client.get("/api/files/tempdir")

    _, db_session = token_app
    db_session.refresh(row)
    assert row.last_used_at is not None


def test_every_authenticated_route_is_classified(token_app):
    """Guard against drift: a new /api route must be deliberately placed.

    Every route that depends on get_current_user must either be reachable via
    the scope table or sit under a known session-only prefix. Adding a route
    without updating one of the two lists fails here.
    """
    from fileglancer.auth import required_scope
    from fileglancer.server import get_current_user

    SESSION_ONLY_PREFIXES = (
        "/api/ticket",
        "/api/preference",
        "/api/ssh-keys",
        "/api/apps",
        "/api/catalog",
        "/api/tokens",
    )

    app, _ = token_app
    unclassified = []
    for route in app.routes:
        path = getattr(route, "path", "")
        dependant = getattr(route, "dependant", None)
        if not path.startswith("/api/") or dependant is None:
            continue
        if not any(d.call is get_current_user for d in dependant.dependencies):
            continue
        if path.startswith(SESSION_ONLY_PREFIXES):
            continue
        for method in getattr(route, "methods", set()):
            if required_scope(path, method) is None:
                unclassified.append(f"{method} {path}")

    assert not unclassified, (
        "These authenticated routes are neither scoped nor session-only. Add "
        "them to _SCOPE_PREFIXES in auth.py or to SESSION_ONLY_PREFIXES here: "
        f"{sorted(unclassified)}"
    )
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pixi run -e test test-backend -- tests/test_api_token_auth.py -v`
Expected: FAIL — every token test returns 401 because bearer auth does not exist yet.

- [ ] **Step 3: Add the token resolution functions**

In `fileglancer/auth.py`, add `import hmac` to the imports at the top, then append after `token_has_scope`:

```python
def parse_bearer_token(request: Request) -> Optional[str]:
    """Extract a Fileglancer API token from the Authorization header.

    Returns None when the header is absent, is not a Bearer credential, or
    carries a Bearer value that is not one of our tokens. In all three cases
    the caller falls through to cookie auth rather than failing, so an
    unrelated Bearer header does not break a cookie-authenticated request.
    """
    header = request.headers.get('authorization', '')
    scheme, _, value = header.partition(' ')
    value = value.strip()
    if scheme.lower() != 'bearer' or not value.startswith(db.API_TOKEN_PREFIX + '_'):
        return None
    return value


def get_user_from_token(request: Request, settings: Settings, raw_token: str) -> str:
    """Resolve an API token to a username, enforcing expiry and scope.

    Raises HTTPException(401) for an invalid or expired token and
    HTTPException(403) when the token lacks the scope the request needs.
    """
    parts = raw_token.split('_', 2)
    if len(parts) != 3 or not parts[1] or not parts[2]:
        raise HTTPException(status_code=401, detail="Malformed API token")
    _, token_id, secret = parts

    with db.get_db_session(settings.db_url) as session:
        row = db.get_api_token_by_id(session, token_id)
        # Hash the presented secret regardless, then compare in constant time.
        presented = db.hash_token_secret(secret)
        if row is None or not hmac.compare_digest(presented, row.token_hash):
            logger.info(f"Rejected API token with id {token_id}")
            raise HTTPException(status_code=401, detail="Invalid API token")

        # SQLAlchemy strips tzinfo on read; add it back before comparing.
        expires_at = row.expires_at.replace(tzinfo=UTC)
        if expires_at < datetime.now(UTC):
            raise HTTPException(
                status_code=401,
                detail=f"API token expired on {expires_at.date().isoformat()}")

        username = row.username
        granted = row.scopes

    required = required_scope(request.url.path, request.method)
    if required is None:
        raise HTTPException(
            status_code=403,
            detail=f"{request.url.path} is not accessible with an API token")
    if not token_has_scope(granted, required):
        raise HTTPException(
            status_code=403,
            detail=f"API token is missing the required scope: {required}")

    with db.get_db_session(settings.db_url) as session:
        db.touch_api_token(session, token_id)

    return username
```

- [ ] **Step 4: Wire it into get_current_user**

Replace the body of `auth.get_current_user` (currently at `fileglancer/auth.py:170-186`):

```python
def get_current_user(request: Request, settings: Settings) -> str:
    """
    Get the current authenticated user

    Resolves an Authorization: Bearer API token when one is present, and
    otherwise validates the session cookie (for both OKTA and simple auth).
    Because every authenticated route depends on this one function, adding
    token auth here covers the whole API without touching any route.

    Raises HTTPException(401) if authentication fails
    """
    raw_token = parse_bearer_token(request)
    if raw_token:
        return get_user_from_token(request, settings, raw_token)

    user_session = get_session_from_cookie(request, settings)

    if not user_session:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in."
        )

    return user_session.username
```

- [ ] **Step 5: Skip origin enforcement for bearer auth**

Replace `fileglancer/server.py:173-186`:

```python
def get_current_user(request: Request):
    """
    FastAPI dependency to get the current authenticated user

    Resolves either an Authorization: Bearer API token or a session cookie.

    The cross-origin allowlist is enforced for cookie auth only. Origin
    enforcement exists because the session cookie is ambient — a browser
    attaches it to same-site requests whether or not the page meant to make
    them. A bearer token is never ambient, so there is no CSRF surface to
    defend, and programmatic clients send no Origin header at all.
    """
    settings = get_settings()
    if auth.parse_bearer_token(request) is None:
        auth.enforce_request_origin(request, settings)
    return auth.get_current_user(request, settings)
```

- [ ] **Step 6: Run the new tests**

Run: `pixi run -e test test-backend -- tests/test_api_token_auth.py -v`
Expected: PASS for all except `test_a_token_cannot_mint_another_token`, which fails with 404 because `/api/tokens` does not exist yet. Mark it with `@pytest.mark.xfail(reason="POST /api/tokens lands in Task 4", strict=True)` and remove the marker in Task 4.

- [ ] **Step 7: Run the full backend suite to confirm nothing regressed**

Run: `pixi run -e test test-backend`
Expected: PASS. Cookie auth is untouched, so `tests/test_api_auth.py` and `tests/test_endpoints.py` must still be green.

- [ ] **Step 8: Commit**

```bash
git add fileglancer/auth.py fileglancer/server.py tests/test_api_token_auth.py
git commit -m "feat: authenticate API requests with scoped bearer tokens"
```

---

### Task 4: Token management endpoints

**Files:**
- Modify: `fileglancer/model.py` (add models near the end, before the App Manifest section at line 321)
- Modify: `fileglancer/server.py` (add `_convert_api_token` near `_convert_ticket` at line 257; add routes after the SSH key routes, around line 1447)
- Test: `tests/test_api_token_endpoints.py`

**Interfaces:**
- Consumes: `db.create_api_token`, `db.list_api_tokens`, `db.delete_api_token`, `db.ApiTokenDB` (Task 1); `auth.API_SCOPES` (Task 2).
- Produces:
  - `model.ApiTokenInfo`, `model.ApiTokenListResponse`, `model.ApiTokenCreateRequest`, `model.ApiTokenCreateResponse`
  - `GET /api/tokens`, `POST /api/tokens`, `DELETE /api/tokens/{token_id}`
  - Response shape for `POST`: `{"token": {...ApiTokenInfo}, "secret": "fgt_..."}`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_api_token_endpoints.py`:

```python
"""Tests for the /api/tokens management endpoints.

These use the cookie-auth override from test_endpoints, since token
management is deliberately session-only.
"""
import pytest

pytest_plugins = []

from test_endpoints import TEST_USERNAME, temp_dir, test_app, test_client  # noqa: F401


def test_list_is_empty_for_a_new_user(test_client):
    response = test_client.get("/api/tokens")

    assert response.status_code == 200
    assert response.json() == {"tokens": []}


def test_create_returns_the_secret_exactly_once(test_client):
    response = test_client.post("/api/tokens", json={
        "name": "laptop", "scopes": ["files:read"], "expires_in_days": 30,
    })

    assert response.status_code == 201
    body = response.json()
    assert body["secret"].startswith("fgt_")
    assert body["token"]["name"] == "laptop"
    assert body["token"]["scopes"] == ["files:read"]

    # The secret never appears again in the listing.
    listing = test_client.get("/api/tokens").json()
    assert len(listing["tokens"]) == 1
    assert "secret" not in listing["tokens"][0]
    assert "token_hash" not in listing["tokens"][0]


def test_create_defaults_to_thirty_days(test_client):
    response = test_client.post("/api/tokens", json={
        "name": "laptop", "scopes": ["files:read"],
    })

    assert response.status_code == 201


def test_create_rejects_unknown_scope(test_client):
    response = test_client.post("/api/tokens", json={
        "name": "bad", "scopes": ["files:read", "secrets:steal"],
    })

    assert response.status_code == 400
    assert "secrets:steal" in response.json()["detail"]


def test_create_rejects_empty_scope_list(test_client):
    response = test_client.post("/api/tokens", json={"name": "bad", "scopes": []})

    assert response.status_code == 400


def test_create_rejects_expiry_over_the_maximum(test_client):
    response = test_client.post("/api/tokens", json={
        "name": "forever", "scopes": ["files:read"], "expires_in_days": 366,
    })

    assert response.status_code == 422


def test_create_rejects_blank_name(test_client):
    response = test_client.post("/api/tokens", json={
        "name": "", "scopes": ["files:read"],
    })

    assert response.status_code == 422


def test_delete_revokes_the_token(test_client):
    token_id = test_client.post("/api/tokens", json={
        "name": "laptop", "scopes": ["files:read"],
    }).json()["token"]["token_id"]

    assert test_client.delete(f"/api/tokens/{token_id}").status_code == 200
    assert test_client.get("/api/tokens").json() == {"tokens": []}


def test_delete_unknown_token_returns_404(test_client):
    assert test_client.delete("/api/tokens/doesnotexist").status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pixi run -e test test-backend -- tests/test_api_token_endpoints.py -v`
Expected: FAIL with 404 on every request — the routes do not exist.

- [ ] **Step 3: Add the Pydantic models**

In `fileglancer/model.py`, before the `# --- App Manifest Models ---` comment at line 321:

```python
# --- API token models ---

class ApiTokenInfo(BaseModel):
    """An API token, without its secret"""
    token_id: str = Field(
        description="Public identifier for the token, used to revoke it"
    )
    name: str = Field(
        description="User-supplied label for the token"
    )
    scopes: List[str] = Field(
        description="Scopes granted to this token"
    )
    created_at: datetime = Field(
        description="When this token was created"
    )
    expires_at: datetime = Field(
        description="When this token stops working"
    )
    last_used_at: Optional[datetime] = Field(
        description="When this token was last used, accurate to five minutes",
        default=None
    )


class ApiTokenListResponse(BaseModel):
    tokens: List[ApiTokenInfo] = Field(
        description="The caller's API tokens, newest first"
    )


class ApiTokenCreateRequest(BaseModel):
    """Request payload for creating an API token"""
    name: str = Field(
        description="A label to identify this token later",
        min_length=1, max_length=100
    )
    scopes: List[str] = Field(
        description="Scopes to grant, e.g. ['files:read', 'links:write']"
    )
    expires_in_days: int = Field(
        description="How long the token stays valid",
        default=30, ge=1, le=365
    )


class ApiTokenCreateResponse(BaseModel):
    """Response for a newly created API token"""
    token: ApiTokenInfo = Field(
        description="The token metadata"
    )
    secret: str = Field(
        description="The full token string. Returned once and never recoverable."
    )
```

- [ ] **Step 4: Add the converter and routes**

In `fileglancer/server.py`, add after `_convert_ticket` (ends around line 266):

```python
def _convert_api_token(row: db.ApiTokenDB) -> ApiTokenInfo:
    """Convert an ApiTokenDB row to the public ApiTokenInfo model.

    Deliberately does not carry token_hash: this model is what the listing
    endpoint returns.
    """
    return ApiTokenInfo(
        token_id=row.token_id,
        name=row.name,
        scopes=row.scopes.split(),
        created_at=row.created_at,
        expires_at=row.expires_at,
        last_used_at=row.last_used_at,
    )
```

Add the new names to the `fileglancer.model` import list at the top of `server.py`: `ApiTokenInfo`, `ApiTokenListResponse`, `ApiTokenCreateRequest`, `ApiTokenCreateResponse`.

Then add the routes inside `create_app`, immediately after the `generate_temp_ssh_key` route (ends around line 1447):

```python
    # API token management. These endpoints are session-only: they are absent
    # from the scope table in auth.py, so deny-by-default means a token can
    # never be used to mint or revoke another token.
    @app.get("/api/tokens", response_model=ApiTokenListResponse,
             description="List the current user's API tokens")
    async def list_api_tokens(username: str = Depends(get_current_user)):
        with db.get_db_session(settings.db_url) as session:
            rows = db.list_api_tokens(session, username)
            return ApiTokenListResponse(
                tokens=[_convert_api_token(row) for row in rows])


    @app.post("/api/tokens", response_model=ApiTokenCreateResponse,
              status_code=201,
              description="Create an API token; the secret is returned once")
    async def create_api_token(payload: ApiTokenCreateRequest,
                               username: str = Depends(get_current_user)):
        if not payload.scopes:
            raise HTTPException(status_code=400,
                                detail="At least one scope is required")
        unknown = sorted(set(payload.scopes) - auth.API_SCOPES)
        if unknown:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown scopes: {', '.join(unknown)}. "
                       f"Valid scopes: {', '.join(sorted(auth.API_SCOPES))}")

        with db.get_db_session(settings.db_url) as session:
            row, secret = db.create_api_token(
                session, username, payload.name.strip(), payload.scopes,
                expires_in_days=payload.expires_in_days)
            logger.info(f"Created API token {row.token_id} for {username} "
                        f"with scopes {row.scopes}")
            return ApiTokenCreateResponse(token=_convert_api_token(row),
                                          secret=secret)


    @app.delete("/api/tokens/{token_id}", description="Revoke an API token")
    async def delete_api_token(token_id: str = Path(..., description="The token's public id"),
                               username: str = Depends(get_current_user)):
        with db.get_db_session(settings.db_url) as session:
            if db.delete_api_token(session, username, token_id) == 0:
                raise HTTPException(status_code=404, detail="Token not found")
        logger.info(f"Revoked API token {token_id} for {username}")
        return {"message": f"Token {token_id} revoked"}
```

- [ ] **Step 5: Run the endpoint tests**

Run: `pixi run -e test test-backend -- tests/test_api_token_endpoints.py -v`
Expected: PASS, 9 tests

- [ ] **Step 6: Un-xfail the escalation test from Task 3**

Remove the `@pytest.mark.xfail` marker from `test_a_token_cannot_mint_another_token` in `tests/test_api_token_auth.py`.

Run: `pixi run -e test test-backend -- tests/test_api_token_auth.py -v`
Expected: PASS, all 15 tests including the escalation guard, which now gets a real 403 rather than a 404.

- [ ] **Step 7: Commit**

```bash
git add fileglancer/model.py fileglancer/server.py tests/test_api_token_endpoints.py tests/test_api_token_auth.py
git commit -m "feat: add /api/tokens management endpoints"
```

---

### Task 5: Python client construction and path resolution

**Files:**
- Create: `fileglancer/client.py`
- Modify: `fileglancer/__init__.py` (currently empty)
- Test: `tests/test_client_paths.py`

**Interfaces:**
- Consumes: nothing from earlier tasks; talks to `/api/file-share-paths`, which needs no auth.
- Produces:
  - `fileglancer.FileglancerError(message, status_code=None)`
  - `fileglancer.Fileglancer(url=None, token=None, timeout=60.0, transport=None)`
  - `Fileglancer.file_share_paths() -> list[FileSharePath]`
  - `Fileglancer.refresh() -> None`
  - `Fileglancer._resolve(path: str) -> tuple[str, str]` returning `(fsp_name, fsp_relative_path)`
  - `Fileglancer.abspath(fsp_name: str, path: str = "") -> str`
  - `Fileglancer._request(method: str, path: str, **kwargs) -> httpx.Response`
  - `fileglancer.client.NEUROGLANCER_URL`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_client_paths.py`:

```python
"""Tests for client construction and absolute-path resolution.

Resolution mirrors resolvePathToFsp in frontend/src/utils/pathHandling.ts.
The FSP fixture below is the shared fixture set both resolvers are checked
against; keep it in sync with the TypeScript test.
"""
import pytest

from fileglancer.client import Fileglancer, FileglancerError
from fileglancer.model import FileSharePath


# Shared fixture set. The '/misc/public' vs '/misc/public-archive' pair is the
# prefix-boundary case; 'home' exercises an FSP with no alternate mount forms.
SHARED_FSPS = [
    FileSharePath(name="nearline", zone="z", mount_path="/nearline",
                  linux_path="/nearline", mac_path="smb://store/nearline",
                  windows_path="\\\\store\\nearline"),
    FileSharePath(name="public", zone="z", mount_path="/misc/public",
                  linux_path="/misc/public"),
    FileSharePath(name="public-archive", zone="z",
                  mount_path="/misc/public-archive",
                  linux_path="/misc/public-archive"),
    FileSharePath(name="home", zone="z", mount_path="/home/alice"),
]


@pytest.fixture
def fg():
    """A client with the FSP list pre-seeded, so no HTTP call is made."""
    client = Fileglancer(url="http://testserver", token="fgt_abc_def")
    client._fsp_cache = SHARED_FSPS
    return client


def test_requires_a_url(monkeypatch):
    monkeypatch.delenv("FILEGLANCER_URL", raising=False)
    monkeypatch.setenv("FILEGLANCER_TOKEN", "fgt_abc_def")

    with pytest.raises(FileglancerError, match="FILEGLANCER_URL"):
        Fileglancer()


def test_requires_a_token(monkeypatch):
    monkeypatch.setenv("FILEGLANCER_URL", "http://testserver")
    monkeypatch.delenv("FILEGLANCER_TOKEN", raising=False)

    with pytest.raises(FileglancerError, match="FILEGLANCER_TOKEN"):
        Fileglancer()


def test_reads_url_and_token_from_the_environment(monkeypatch):
    monkeypatch.setenv("FILEGLANCER_URL", "http://testserver/")
    monkeypatch.setenv("FILEGLANCER_TOKEN", "fgt_abc_def")

    client = Fileglancer()

    assert str(client._client.base_url) == "http://testserver"
    assert client._client.headers["authorization"] == "Bearer fgt_abc_def"


def test_explicit_arguments_win_over_the_environment(monkeypatch):
    monkeypatch.setenv("FILEGLANCER_URL", "http://from-env")
    monkeypatch.setenv("FILEGLANCER_TOKEN", "fgt_env_env")

    client = Fileglancer(url="http://explicit", token="fgt_x_y")

    assert str(client._client.base_url) == "http://explicit"
    assert client._client.headers["authorization"] == "Bearer fgt_x_y"


@pytest.mark.parametrize("path,expected", [
    ("/nearline/alice/sample.zarr", ("nearline", "alice/sample.zarr")),
    ("/nearline", ("nearline", "")),
    ("/nearline/", ("nearline", "")),
    ("/home/alice/data", ("home", "data")),
    ("smb://store/nearline/alice", ("nearline", "alice")),
    ("\\\\store\\nearline\\alice", ("nearline", "alice")),
    ("  /nearline/alice  ", ("nearline", "alice")),
])
def test_resolves_every_mount_form(fg, path, expected):
    assert fg._resolve(path) == expected


def test_longest_prefix_wins_at_a_shared_boundary(fg):
    # '/misc/public-archive/x' must not resolve to the 'public' share.
    assert fg._resolve("/misc/public-archive/x") == ("public-archive", "x")
    assert fg._resolve("/misc/public/x") == ("public", "x")


def test_partial_segment_does_not_match(fg):
    # '/nearlinex' shares a string prefix with '/nearline' but is a different
    # directory, so it must not resolve.
    with pytest.raises(FileglancerError):
        fg._resolve("/nearlinex/data")


def test_unmatched_path_error_lists_available_mounts(fg):
    with pytest.raises(FileglancerError) as excinfo:
        fg._resolve("/not/a/share/at/all")

    message = str(excinfo.value)
    assert "/not/a/share/at/all" in message
    assert "/nearline" in message
    assert "/home/alice" in message


def test_abspath_round_trips_resolve(fg):
    fsp_name, relative = fg._resolve("/nearline/alice/sample.zarr")

    assert fg.abspath(fsp_name, relative) == "/nearline/alice/sample.zarr"


def test_abspath_of_the_share_root(fg):
    assert fg.abspath("nearline") == "/nearline"


def test_abspath_rejects_an_unknown_share(fg):
    with pytest.raises(FileglancerError, match="Unknown file share"):
        fg.abspath("nosuchshare", "x")


def test_refresh_drops_the_cache(fg):
    assert fg._fsp_cache is not None

    fg.refresh()

    assert fg._fsp_cache is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pixi run -e test test-backend -- tests/test_client_paths.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'fileglancer.client'`

- [ ] **Step 3: Write the client core**

Create `fileglancer/client.py`:

```python
"""Python client for the Fileglancer HTTP API.

Authenticates with an API token created in the Fileglancer web UI, and
operates on absolute filesystem paths rather than Fileglancer's internal
(file share, relative path) pair.

    from fileglancer import Fileglancer

    fg = Fileglancer()  # reads FILEGLANCER_URL and FILEGLANCER_TOKEN
    link = fg.create_data_link("/nearline/alice/sample.zarr")
"""
import os
from typing import Any, Dict, List, Optional, Tuple

import httpx

from fileglancer.model import FileSharePath

# Neuroglancer base URL used when the caller does not supply one. The server
# has no configured default and POST /api/neuroglancer/nglinks requires
# url_base when given a state directly, so the default lives here.
NEUROGLANCER_URL = "https://neuroglancer-demo.appspot.com"


class FileglancerError(Exception):
    """Raised for API errors and for paths that match no file share."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class Fileglancer:
    """A client for the Fileglancer HTTP API.

    Args:
        url: Fileglancer server URL. Defaults to $FILEGLANCER_URL.
        token: An API token created in the web UI. Defaults to
            $FILEGLANCER_TOKEN.
        timeout: Per-request timeout in seconds.
        transport: An httpx transport, for testing against an ASGI app.
    """

    def __init__(self, url: Optional[str] = None, token: Optional[str] = None,
                 timeout: float = 60.0,
                 transport: Optional[httpx.BaseTransport] = None):
        url = url or os.environ.get("FILEGLANCER_URL")
        token = token or os.environ.get("FILEGLANCER_TOKEN")
        if not url:
            raise FileglancerError(
                "No Fileglancer server URL. Pass url= or set FILEGLANCER_URL.")
        if not token:
            raise FileglancerError(
                "No API token. Pass token= or set FILEGLANCER_TOKEN. Create a "
                "token on the API Tokens page of the Fileglancer web UI.")

        self._client = httpx.Client(
            base_url=url.rstrip("/"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=timeout,
            transport=transport,
            follow_redirects=True,
        )
        self._fsp_cache: Optional[List[FileSharePath]] = None

    def close(self) -> None:
        """Close the underlying HTTP connection pool."""
        self._client.close()

    def __enter__(self) -> "Fileglancer":
        return self

    def __exit__(self, *exc_info) -> None:
        self.close()

    # --- HTTP plumbing ---

    def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        """Make a request, turning any error response into FileglancerError."""
        response = self._client.request(method, path, **kwargs)
        if response.status_code >= 400:
            try:
                detail = response.json().get("detail", response.text)
            except ValueError:
                detail = response.text
            raise FileglancerError(f"{method} {path} failed: {detail}",
                                   status_code=response.status_code)
        return response

    # --- File shares and path resolution ---

    def file_share_paths(self) -> List[FileSharePath]:
        """List the server's file shares. Cached; call refresh() to re-fetch."""
        if self._fsp_cache is None:
            data = self._request("GET", "/api/file-share-paths").json()
            self._fsp_cache = [FileSharePath(**p) for p in data["paths"]]
        return self._fsp_cache

    def refresh(self) -> None:
        """Drop the cached file share list."""
        self._fsp_cache = None

    def _resolve(self, path: str) -> Tuple[str, str]:
        """Resolve an absolute path to (file share name, relative path).

        Mirrors resolvePathToFsp in frontend/src/utils/pathHandling.ts: the
        longest matching prefix across every mount form wins, and the
        remainder must be empty or start with '/'. That last condition is what
        keeps '/misc/public' from swallowing '/misc/public-archive'.

        Accepts Linux, Mac (smb://) and Windows (UNC) mount forms, so a path
        pasted from any client platform resolves.
        """
        normalized = path.strip().replace("\\", "/")

        best_fsp: Optional[FileSharePath] = None
        best_prefix = ""
        for fsp in self.file_share_paths():
            candidates = (fsp.mount_path, fsp.linux_path, fsp.mac_path,
                          fsp.windows_path)
            for candidate in candidates:
                if not candidate:
                    continue
                candidate = candidate.replace("\\", "/").rstrip("/")
                if len(candidate) <= len(best_prefix):
                    continue
                if not normalized.startswith(candidate):
                    continue
                remainder = normalized[len(candidate):]
                if remainder and not remainder.startswith("/"):
                    continue
                best_fsp, best_prefix = fsp, candidate

        if best_fsp is None:
            mounts = ", ".join(sorted(f.mount_path
                                      for f in self.file_share_paths()))
            raise FileglancerError(
                f"No file share matches {path!r}. Available mount points: {mounts}")

        return best_fsp.name, normalized[len(best_prefix):].strip("/")

    def abspath(self, fsp_name: str, path: str = "") -> str:
        """Build an absolute path from a file share name and relative path."""
        for fsp in self.file_share_paths():
            if fsp.name == fsp_name:
                root = fsp.mount_path.rstrip("/")
                return f"{root}/{path}" if path else root
        raise FileglancerError(f"Unknown file share: {fsp_name}")
```

- [ ] **Step 4: Export from the package**

Write `fileglancer/__init__.py`:

```python
"""Fileglancer: NGFF browsing and sharing platform."""
from fileglancer.client import NEUROGLANCER_URL, Fileglancer, FileglancerError

__all__ = ["Fileglancer", "FileglancerError", "NEUROGLANCER_URL"]
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pixi run -e test test-backend -- tests/test_client_paths.py -v`
Expected: PASS, 22 tests

- [ ] **Step 6: Verify the package import did not break the server**

Run: `pixi run -e test test-backend`
Expected: PASS. `fileglancer/__init__.py` was previously empty, so confirm the new imports introduce no circular import — `client.py` imports only `fileglancer.model`, never `server` or `database`.

- [ ] **Step 7: Commit**

```bash
git add fileglancer/client.py fileglancer/__init__.py tests/test_client_paths.py
git commit -m "feat: add Python client with absolute path resolution"
```

---

### Task 6: Python client file operations

**Files:**
- Modify: `fileglancer/client.py`
- Test: `tests/test_client_files.py`

**Interfaces:**
- Consumes: `Fileglancer._resolve`, `Fileglancer._request` (Task 5).
- Produces:
  - `Fileglancer.ls(path: str) -> list[FileInfo]`
  - `Fileglancer.stat(path: str) -> FileInfo`
  - `Fileglancer.mkdir(path: str) -> None`
  - `Fileglancer.rename(src: str, dst: str) -> None`
  - `Fileglancer.delete(path: str) -> None`
  - `Fileglancer.read(path: str) -> bytes`
  - `Fileglancer.write(path: str, data: bytes) -> int` returning bytes written

- [ ] **Step 1: Write the failing tests**

Create `tests/test_client_files.py`:

```python
"""Client file operations, driven against the real app over ASGI.

Reuses the token_app fixture from test_api_token_auth so the client exercises
the full bearer-auth path rather than a dependency override.
"""
import os

import httpx
import pytest

from fileglancer.client import Fileglancer, FileglancerError
from fileglancer.database import create_api_token

from test_api_token_auth import token_app  # noqa: F401


@pytest.fixture
def fg(token_app):
    """A client wired to the test app via ASGI, with all scopes."""
    app, db_session = token_app
    _, plaintext = create_api_token(
        db_session, "alice", "test",
        ["files:write", "links:write", "jobs:write"])
    client = Fileglancer(url="http://testserver", token=plaintext,
                         transport=httpx.ASGITransport(app=app))
    yield client
    client.close()


@pytest.fixture
def share_root(token_app):
    """The temp directory backing the 'tempdir' file share."""
    app, db_session = token_app
    from fileglancer.database import get_file_share_paths
    return get_file_share_paths(db_session)[0].mount_path


def test_ls_lists_the_share_root(fg, share_root):
    os.makedirs(os.path.join(share_root, "adir"), exist_ok=True)

    names = [f.name for f in fg.ls(share_root)]

    assert "adir" in names


def test_ls_returns_absolute_paths(fg, share_root):
    os.makedirs(os.path.join(share_root, "adir"), exist_ok=True)

    entry = next(f for f in fg.ls(share_root) if f.name == "adir")

    assert entry.absolute_path == os.path.join(share_root, "adir")


def test_stat_describes_the_path_itself(fg, share_root):
    info = fg.stat(share_root)

    assert info.is_dir is True


def test_mkdir_creates_a_directory(fg, share_root):
    target = os.path.join(share_root, "created")

    fg.mkdir(target)

    assert os.path.isdir(target)


def test_write_then_read_round_trips(fg, share_root):
    target = os.path.join(share_root, "notes.txt")

    written = fg.write(target, b"hello world")

    assert written == 11
    assert fg.read(target) == b"hello world"


def test_rename_moves_within_a_share(fg, share_root):
    src = os.path.join(share_root, "before.txt")
    dst = os.path.join(share_root, "after.txt")
    fg.write(src, b"x")

    fg.rename(src, dst)

    assert os.path.exists(dst)
    assert not os.path.exists(src)


def test_rename_across_shares_is_refused_before_any_request(fg, share_root):
    # '/tempdir/test/path' is the linux_path of the same share, so build a
    # genuinely different one by pointing at a share that does not exist.
    with pytest.raises(FileglancerError, match="No file share matches"):
        fg.rename(os.path.join(share_root, "a.txt"), "/nowhere/b.txt")


def test_delete_removes_a_file(fg, share_root):
    target = os.path.join(share_root, "doomed.txt")
    fg.write(target, b"x")

    fg.delete(target)

    assert not os.path.exists(target)


def test_error_response_becomes_a_fileglancer_error(fg, share_root):
    with pytest.raises(FileglancerError) as excinfo:
        fg.ls(os.path.join(share_root, "does-not-exist"))

    assert excinfo.value.status_code in (403, 404)


def test_a_read_only_token_cannot_write(token_app, share_root):
    app, db_session = token_app
    _, plaintext = create_api_token(db_session, "alice", "ro", ["files:read"])
    client = Fileglancer(url="http://testserver", token=plaintext,
                         transport=httpx.ASGITransport(app=app))

    with pytest.raises(FileglancerError) as excinfo:
        client.mkdir(os.path.join(share_root, "nope"))

    assert excinfo.value.status_code == 403
    client.close()
```

Add a cross-share rename test that exercises the same-share check directly, since the fixture only has one share:

```python
def test_rename_rejects_a_cross_share_move(fg, monkeypatch):
    """Two resolvable paths on different shares must be refused locally."""
    monkeypatch.setattr(fg, "_resolve", lambda p: (
        ("shareA", "a.txt") if "a.txt" in p else ("shareB", "b.txt")))

    with pytest.raises(FileglancerError, match="same file share"):
        fg.rename("/x/a.txt", "/y/b.txt")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pixi run -e test test-backend -- tests/test_client_files.py -v`
Expected: FAIL with `AttributeError: 'Fileglancer' object has no attribute 'ls'`

- [ ] **Step 3: Implement the file operations**

Add to `fileglancer/client.py`. Add `from fileglancer.filestore import FileInfo` to the imports first.

```python
    # --- File operations ---

    def ls(self, path: str) -> List[FileInfo]:
        """List the contents of a directory.

        Each returned FileInfo carries an absolute_path, so results can be fed
        straight back into any other method.
        """
        fsp_name, subpath = self._resolve(path)
        data = self._request("GET", f"/api/files/{fsp_name}",
                             params={"subpath": subpath}).json()
        return [FileInfo(**entry) for entry in data.get("files", [])]

    def stat(self, path: str) -> FileInfo:
        """Get metadata for a single file or directory."""
        fsp_name, subpath = self._resolve(path)
        data = self._request("GET", f"/api/files/{fsp_name}",
                             params={"subpath": subpath}).json()
        return FileInfo(**data["info"])

    def mkdir(self, path: str) -> None:
        """Create a directory. The parent directory must already exist."""
        fsp_name, subpath = self._resolve(path)
        self._request("POST", f"/api/files/{fsp_name}",
                      params={"subpath": subpath}, json={"type": "directory"})

    def rename(self, src: str, dst: str) -> None:
        """Rename or move a file or directory within one file share."""
        src_fsp, src_subpath = self._resolve(src)
        dst_fsp, dst_subpath = self._resolve(dst)
        if src_fsp != dst_fsp:
            # The underlying PATCH /api/files cannot move across shares, so
            # fail here with a useful message rather than on a 400.
            raise FileglancerError(
                f"Cannot move between file shares: {src!r} is on {src_fsp!r} "
                f"but {dst!r} is on {dst_fsp!r}. Both must be on the same "
                f"file share.")
        self._request("PATCH", f"/api/files/{src_fsp}",
                      params={"subpath": src_subpath},
                      json={"path": dst_subpath})

    def delete(self, path: str) -> None:
        """Delete a file or an empty directory."""
        fsp_name, subpath = self._resolve(path)
        self._request("DELETE", f"/api/files/{fsp_name}",
                      params={"subpath": subpath})

    def read(self, path: str) -> bytes:
        """Read a file's contents."""
        fsp_name, subpath = self._resolve(path)
        return self._request("GET", f"/api/content/{fsp_name}",
                             params={"subpath": subpath}).content

    def write(self, path: str, data: bytes) -> int:
        """Write bytes to a file, creating or replacing it.

        The parent directory must already exist. Returns the number of bytes
        written.
        """
        fsp_name, subpath = self._resolve(path)
        response = self._request("PUT", f"/api/content/{fsp_name}",
                                 params={"subpath": subpath}, content=data)
        return response.json()["bytes_written"]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pixi run -e test test-backend -- tests/test_client_files.py -v`
Expected: PASS, 11 tests

- [ ] **Step 5: Commit**

```bash
git add fileglancer/client.py tests/test_client_files.py
git commit -m "feat: add file operations to the Python client"
```

---

### Task 7: Python client data links and Neuroglancer links

**Files:**
- Modify: `fileglancer/client.py`
- Test: `tests/test_client_links.py`

**Interfaces:**
- Consumes: `Fileglancer._resolve`, `Fileglancer._request`, `Fileglancer.abspath` (Task 5); `NEUROGLANCER_URL` (Task 5).
- Produces:
  - `Fileglancer.create_data_link(path: str, url_prefix: Optional[str] = None) -> ProxiedPath`
  - `Fileglancer.data_links() -> list[ProxiedPath]`
  - `Fileglancer.data_link(sharing_key: str) -> ProxiedPath`
  - `Fileglancer.delete_data_link(sharing_key: str) -> None`
  - `Fileglancer.create_ng_link(state: dict, url_base: str = NEUROGLANCER_URL, title: Optional[str] = None, short_name: Optional[str] = None) -> str`
  - `Fileglancer.ng_links() -> list[NeuroglancerShortLink]`
  - `Fileglancer.delete_ng_link(short_key: str) -> None`

Every returned `ProxiedPath` has its `path` field rewritten to an absolute path.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_client_links.py`:

```python
"""Client data-link and Neuroglancer-link operations."""
import os

import httpx
import pytest

from fileglancer.client import NEUROGLANCER_URL, Fileglancer, FileglancerError
from fileglancer.database import create_api_token, get_file_share_paths

from test_api_token_auth import token_app  # noqa: F401


@pytest.fixture
def fg(token_app):
    app, db_session = token_app
    _, plaintext = create_api_token(db_session, "alice", "test",
                                    ["files:write", "links:write"])
    client = Fileglancer(url="http://testserver", token=plaintext,
                         transport=httpx.ASGITransport(app=app))
    yield client
    client.close()


@pytest.fixture
def shared_dir(token_app):
    """A real directory inside the test share, ready to be linked."""
    _, db_session = token_app
    root = get_file_share_paths(db_session)[0].mount_path
    path = os.path.join(root, "sample.zarr")
    os.makedirs(path, exist_ok=True)
    return path


def test_create_data_link_from_an_absolute_path(fg, shared_dir):
    link = fg.create_data_link(shared_dir)

    assert link.fsp_name == "tempdir"
    assert link.sharing_key
    assert str(link.url).endswith("/sample.zarr")


def test_created_data_link_reports_an_absolute_path(fg, shared_dir):
    link = fg.create_data_link(shared_dir)

    assert link.path == shared_dir


def test_create_data_link_accepts_a_url_prefix(fg, shared_dir):
    link = fg.create_data_link(shared_dir, url_prefix="custom")

    assert str(link.url).endswith("/custom")


def test_create_data_link_rejects_an_unresolvable_path(fg):
    with pytest.raises(FileglancerError, match="No file share matches"):
        fg.create_data_link("/nowhere/at/all")


def test_list_data_links_reports_absolute_paths(fg, shared_dir):
    fg.create_data_link(shared_dir)

    links = fg.data_links()

    assert [link.path for link in links] == [shared_dir]


def test_get_data_link_by_sharing_key(fg, shared_dir):
    created = fg.create_data_link(shared_dir)

    fetched = fg.data_link(created.sharing_key)

    assert fetched.sharing_key == created.sharing_key
    assert fetched.path == shared_dir


def test_delete_data_link(fg, shared_dir):
    created = fg.create_data_link(shared_dir)

    fg.delete_data_link(created.sharing_key)

    assert fg.data_links() == []


def test_create_ng_link_returns_a_neuroglancer_url(fg):
    url = fg.create_ng_link({"layers": []}, title="sample")

    assert url.startswith(NEUROGLANCER_URL + "#!")
    assert "/ng/" in url


def test_create_ng_link_honours_a_custom_url_base(fg):
    url = fg.create_ng_link({"layers": []}, url_base="https://ng.example.com")

    assert url.startswith("https://ng.example.com#!")


def test_create_ng_link_with_a_short_name(fg):
    url = fg.create_ng_link({"layers": []}, short_name="my-view")

    assert url.endswith("/my-view")


def test_list_ng_links(fg):
    fg.create_ng_link({"layers": []}, title="sample")

    links = fg.ng_links()

    assert len(links) == 1


def test_delete_ng_link(fg):
    fg.create_ng_link({"layers": []}, short_name="doomed")
    short_key = fg.ng_links()[0].short_key

    fg.delete_ng_link(short_key)

    assert fg.ng_links() == []


def test_a_files_only_token_cannot_create_a_data_link(token_app, shared_dir):
    app, db_session = token_app
    _, plaintext = create_api_token(db_session, "alice", "files-only",
                                    ["files:write"])
    client = Fileglancer(url="http://testserver", token=plaintext,
                         transport=httpx.ASGITransport(app=app))

    with pytest.raises(FileglancerError) as excinfo:
        client.create_data_link(shared_dir)

    assert excinfo.value.status_code == 403
    client.close()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pixi run -e test test-backend -- tests/test_client_links.py -v`
Expected: FAIL with `AttributeError: 'Fileglancer' object has no attribute 'create_data_link'`

- [ ] **Step 3: Implement the link operations**

Add `from fileglancer.model import FileSharePath, NeuroglancerShortLink, ProxiedPath` to the client imports, then append to `fileglancer/client.py`:

```python
    # --- Data links ---

    def _absolutize(self, link: ProxiedPath) -> ProxiedPath:
        """Rewrite a ProxiedPath's FSP-relative path to an absolute one.

        The REST API defines ProxiedPath.path as relative to the file share.
        This client presents absolute paths throughout, so the value is
        replaced here. fsp_name is left in place for reference.
        """
        return link.model_copy(
            update={"path": self.abspath(link.fsp_name, link.path)})

    def create_data_link(self, path: str,
                         url_prefix: Optional[str] = None) -> ProxiedPath:
        """Create a data link that serves a folder over HTTP.

        Args:
            path: Absolute path to the folder to share.
            url_prefix: The URL segment after the sharing key. Defaults to the
                folder's basename.
        """
        fsp_name, subpath = self._resolve(path)
        params: Dict[str, Any] = {"fsp_name": fsp_name, "path": subpath}
        if url_prefix is not None:
            params["url_prefix"] = url_prefix
        data = self._request("POST", "/api/proxied-path", params=params).json()
        return self._absolutize(ProxiedPath(**data))

    def data_links(self) -> List[ProxiedPath]:
        """List the caller's data links."""
        data = self._request("GET", "/api/proxied-path").json()
        return [self._absolutize(ProxiedPath(**p)) for p in data["paths"]]

    def data_link(self, sharing_key: str) -> ProxiedPath:
        """Get one data link by its sharing key."""
        data = self._request("GET", f"/api/proxied-path/{sharing_key}").json()
        return self._absolutize(ProxiedPath(**data))

    def delete_data_link(self, sharing_key: str) -> None:
        """Delete a data link."""
        self._request("DELETE", f"/api/proxied-path/{sharing_key}")

    # --- Neuroglancer links ---

    def create_ng_link(self, state: Dict[str, Any],
                       url_base: str = NEUROGLANCER_URL,
                       title: Optional[str] = None,
                       short_name: Optional[str] = None) -> str:
        """Store a Neuroglancer state and return a shortened viewer URL.

        Args:
            state: A Neuroglancer state as a plain dict. This is exactly what
                neuroglancer.ViewerState.to_json() returns, so no dependency
                on the neuroglancer package is needed.
            url_base: The Neuroglancer instance the link should open in.
            title: Optional title shown in the browser tab.
            short_name: Optional human-friendly suffix for the link.
        """
        payload: Dict[str, Any] = {"state": state, "url_base": url_base}
        if title is not None:
            payload["title"] = title
        if short_name is not None:
            payload["short_name"] = short_name
        data = self._request("POST", "/api/neuroglancer/nglinks",
                             json=payload).json()
        return data["neuroglancer_url"]

    def ng_links(self) -> List[NeuroglancerShortLink]:
        """List the caller's stored Neuroglancer links."""
        data = self._request("GET", "/api/neuroglancer/nglinks").json()
        return [NeuroglancerShortLink(**link) for link in data["links"]]

    def delete_ng_link(self, short_key: str) -> None:
        """Delete a stored Neuroglancer link."""
        self._request("DELETE", f"/api/neuroglancer/nglinks/{short_key}")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pixi run -e test test-backend -- tests/test_client_links.py -v`
Expected: PASS, 13 tests

- [ ] **Step 5: Commit**

```bash
git add fileglancer/client.py tests/test_client_links.py
git commit -m "feat: add data link and Neuroglancer link methods to the client"
```

---

### Task 8: Python client job operations

**Files:**
- Modify: `fileglancer/client.py`
- Test: `tests/test_client_jobs.py`

**Interfaces:**
- Consumes: `Fileglancer._request` (Task 5).
- Produces:
  - `Fileglancer.jobs(status: Optional[str] = None) -> list[Job]`
  - `Fileglancer.job(job_id: int) -> Job`
  - `Fileglancer.submit_job(app_url: str, entry_point_id: str, **kwargs) -> Job`
  - `Fileglancer.cancel_job(job_id: int) -> None`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_client_jobs.py`:

```python
"""Client job operations.

Job submission needs a real app manifest and scheduler, so these tests cover
the request shaping and scope enforcement rather than an end-to-end launch.
"""
import httpx
import pytest

from fileglancer.client import Fileglancer, FileglancerError
from fileglancer.database import create_api_token

from test_api_token_auth import token_app  # noqa: F401


@pytest.fixture
def fg(token_app):
    app, db_session = token_app
    _, plaintext = create_api_token(db_session, "alice", "test", ["jobs:write"])
    client = Fileglancer(url="http://testserver", token=plaintext,
                         transport=httpx.ASGITransport(app=app))
    yield client
    client.close()


def test_jobs_is_empty_for_a_new_user(fg):
    assert fg.jobs() == []


def test_jobs_accepts_a_status_filter(fg):
    assert fg.jobs(status="RUNNING") == []


def test_unknown_job_id_raises(fg):
    with pytest.raises(FileglancerError) as excinfo:
        fg.job(99999)

    assert excinfo.value.status_code == 404


def test_submit_job_sends_app_url_and_entry_point(fg):
    # No such app is registered, so this fails at the server. What matters is
    # that the request was well-formed enough to reach that check.
    with pytest.raises(FileglancerError) as excinfo:
        fg.submit_job(app_url="https://github.com/example/none",
                      entry_point_id="main")

    assert excinfo.value.status_code in (400, 500)


def test_a_read_only_jobs_token_cannot_submit(token_app):
    app, db_session = token_app
    _, plaintext = create_api_token(db_session, "alice", "ro", ["jobs:read"])
    client = Fileglancer(url="http://testserver", token=plaintext,
                         transport=httpx.ASGITransport(app=app))

    with pytest.raises(FileglancerError) as excinfo:
        client.submit_job(app_url="https://github.com/example/none",
                          entry_point_id="main")

    assert excinfo.value.status_code == 403
    client.close()


def test_a_links_only_token_cannot_list_jobs(token_app):
    app, db_session = token_app
    _, plaintext = create_api_token(db_session, "alice", "links", ["links:read"])
    client = Fileglancer(url="http://testserver", token=plaintext,
                         transport=httpx.ASGITransport(app=app))

    with pytest.raises(FileglancerError) as excinfo:
        client.jobs()

    assert excinfo.value.status_code == 403
    client.close()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pixi run -e test test-backend -- tests/test_client_jobs.py -v`
Expected: FAIL with `AttributeError: 'Fileglancer' object has no attribute 'jobs'`

- [ ] **Step 3: Implement the job operations**

Add `Job` to the `fileglancer.model` import in the client, then append to `fileglancer/client.py`:

```python
    # --- Jobs ---

    def jobs(self, status: Optional[str] = None) -> List[Job]:
        """List the caller's jobs, optionally filtered by status."""
        params = {"status": status} if status else None
        data = self._request("GET", "/api/jobs", params=params).json()
        return [Job(**job) for job in data["jobs"]]

    def job(self, job_id: int) -> Job:
        """Get a single job by id."""
        return Job(**self._request("GET", f"/api/jobs/{job_id}").json())

    def submit_job(self, app_url: str, entry_point_id: str, **kwargs) -> Job:
        """Submit a job.

        Args:
            app_url: The app's repository URL.
            entry_point_id: Which entry point of the app to run.
            **kwargs: Any other field accepted by the /api/jobs endpoint, such
                as parameters, resources, name, env, or container.
        """
        payload = {"app_url": app_url, "entry_point_id": entry_point_id, **kwargs}
        return Job(**self._request("POST", "/api/jobs", json=payload).json())

    def cancel_job(self, job_id: int) -> None:
        """Cancel a running or pending job."""
        self._request("POST", f"/api/jobs/{job_id}/cancel")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pixi run -e test test-backend -- tests/test_client_jobs.py -v`
Expected: PASS, 6 tests

- [ ] **Step 5: Run the whole backend suite**

Run: `pixi run -e test test-backend`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add fileglancer/client.py tests/test_client_jobs.py
git commit -m "feat: add job methods to the Python client"
```

---

### Task 9: Frontend token queries

**Files:**
- Create: `frontend/src/queries/apiTokenQueries.ts`
- Test: `frontend/src/__tests__/apiTokenQueries.test.tsx`

**Interfaces:**
- Consumes: `GET/POST/DELETE /api/tokens` (Task 4); `sendFetchRequest` from `@/utils`; `getResponseJsonOrError` and `throwResponseNotOkError` from `@/queries/queryUtils`.
- Produces:
  - `export type ApiTokenInfo = { token_id, name, scopes, created_at, expires_at, last_used_at }`
  - `export type CreateTokenResult = { token: ApiTokenInfo; secret: string }`
  - `export const API_SCOPES: readonly string[]`
  - `export const apiTokenQueryKeys = { all, list }`
  - `export function useApiTokensQuery(): UseQueryResult<ApiTokenInfo[], Error>`
  - `export function useCreateApiTokenMutation(): UseMutationResult<CreateTokenResult, Error, CreateTokenParams>`
  - `export function useDeleteApiTokenMutation(): UseMutationResult<void, Error, string>`

This mirrors `frontend/src/queries/sshKeyQueries.ts` exactly; read that file first and follow its structure.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/apiTokenQueries.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  API_SCOPES,
  useApiTokensQuery,
  useCreateApiTokenMutation
} from '@/queries/apiTokenQueries';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('apiTokenQueries', () => {
  it('exposes the six documented scopes', () => {
    expect([...API_SCOPES].sort()).toEqual([
      'files:read',
      'files:write',
      'jobs:read',
      'jobs:write',
      'links:read',
      'links:write'
    ]);
  });

  it('returns the token list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            tokens: [
              {
                token_id: 'abc123',
                name: 'laptop',
                scopes: ['files:read'],
                created_at: '2026-08-24T00:00:00Z',
                expires_at: '2026-09-23T00:00:00Z',
                last_used_at: null
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const { result } = renderHook(() => useApiTokensQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe('laptop');
  });

  it('returns the one-time secret from a create', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            token: {
              token_id: 'abc123',
              name: 'laptop',
              scopes: ['files:read'],
              created_at: '2026-08-24T00:00:00Z',
              expires_at: '2026-09-23T00:00:00Z',
              last_used_at: null
            },
            secret: 'fgt_abc123_supersecret'
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const { result } = renderHook(() => useCreateApiTokenMutation(), {
      wrapper
    });
    const created = await result.current.mutateAsync({
      name: 'laptop',
      scopes: ['files:read'],
      expires_in_days: 30
    });

    expect(created.secret).toBe('fgt_abc123_supersecret');
  });

  it('surfaces an error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Unknown scopes: nope' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );

    const { result } = renderHook(() => useCreateApiTokenMutation(), {
      wrapper
    });

    await expect(
      result.current.mutateAsync({ name: 'x', scopes: ['nope'] })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pixi run test-frontend -- apiTokenQueries`
Expected: FAIL — cannot resolve `@/queries/apiTokenQueries`

- [ ] **Step 3: Write the queries module**

Create `frontend/src/queries/apiTokenQueries.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';

import { sendFetchRequest } from '@/utils';
import {
  getResponseJsonOrError,
  throwResponseNotOkError
} from '@/queries/queryUtils';

/**
 * The scopes an API token can grant. Must match API_SCOPES in
 * fileglancer/auth.py.
 */
export const API_SCOPES = [
  'files:read',
  'files:write',
  'links:read',
  'links:write',
  'jobs:read',
  'jobs:write'
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

/**
 * An API token, without its secret.
 */
export type ApiTokenInfo = {
  token_id: string;
  name: string;
  scopes: string[];
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
};

type ApiTokenListResponse = {
  tokens: ApiTokenInfo[];
};

/**
 * The result of creating a token. The secret is shown once and is not
 * recoverable afterwards.
 */
export type CreateTokenResult = {
  token: ApiTokenInfo;
  secret: string;
};

export type CreateTokenParams = {
  name: string;
  scopes: string[];
  expires_in_days?: number;
};

export const apiTokenQueryKeys = {
  all: ['apiTokens'] as const,
  list: () => ['apiTokens', 'list'] as const
};

const fetchApiTokens = async (
  signal?: AbortSignal
): Promise<ApiTokenInfo[]> => {
  const response = await sendFetchRequest('/api/tokens', 'GET', undefined, {
    signal
  });

  const body = await getResponseJsonOrError(response);

  if (!response.ok) {
    throwResponseNotOkError(response, body);
  }

  return (body as ApiTokenListResponse).tokens ?? [];
};

/**
 * Query hook for the current user's API tokens.
 */
export function useApiTokensQuery(): UseQueryResult<ApiTokenInfo[], Error> {
  return useQuery<ApiTokenInfo[], Error>({
    queryKey: apiTokenQueryKeys.list(),
    queryFn: ({ signal }) => fetchApiTokens(signal)
  });
}

/**
 * Mutation hook for creating an API token.
 *
 * The returned secret is the only copy; the server keeps a hash.
 */
export function useCreateApiTokenMutation(): UseMutationResult<
  CreateTokenResult,
  Error,
  CreateTokenParams
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTokenParams) => {
      const response = await sendFetchRequest('/api/tokens', 'POST', {
        name: params.name,
        scopes: params.scopes,
        expires_in_days: params.expires_in_days ?? 30
      });

      const body = await getResponseJsonOrError(response);

      if (!response.ok) {
        throwResponseNotOkError(response, body);
      }

      return body as CreateTokenResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiTokenQueryKeys.all });
    }
  });
}

/**
 * Mutation hook for revoking an API token by its public token_id.
 */
export function useDeleteApiTokenMutation(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokenId: string) => {
      // sendFetchRequest strips the body from DELETE requests, so the id goes
      // in the path.
      const response = await sendFetchRequest(
        `/api/tokens/${encodeURIComponent(tokenId)}`,
        'DELETE'
      );

      if (!response.ok) {
        const body = await getResponseJsonOrError(response);
        throwResponseNotOkError(response, body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiTokenQueryKeys.all });
    }
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pixi run test-frontend -- apiTokenQueries`
Expected: PASS, 4 tests

- [ ] **Step 5: Lint, format, and typecheck**

```bash
pixi run node-eslint-write
pixi run node-prettier-write
pixi run node-check
```

Expected: no new TypeScript errors. Five pre-existing errors in `ContextMenu`, `PathFormatOptions`, `PermissionsTable`, `sshKeyQueries`, and `ColorsPageSync.test` are known and not blocking.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/queries/apiTokenQueries.ts frontend/src/__tests__/apiTokenQueries.test.tsx
git commit -m "feat: add frontend queries for API tokens"
```

---

### Task 10: API tokens page, route, and navigation

**Files:**
- Create: `frontend/src/components/ApiTokens.tsx`
- Create: `frontend/src/components/ui/ApiTokens/ApiTokenCard.tsx`
- Modify: `frontend/src/App.tsx` (import near line 27; route near line 153)
- Modify: `frontend/src/components/ui/Navbar/ProfileMenu.tsx` (menu item near line 72)

**Interfaces:**
- Consumes: `useApiTokensQuery`, `useDeleteApiTokenMutation`, `ApiTokenInfo` (Task 9).
- Produces:
  - Default export `ApiTokens` from `@/components/ApiTokens`
  - `ApiTokenCard` taking `{ token: ApiTokenInfo }`
  - A route at `/api-tokens` and a Profile menu entry linking to it

Follow `frontend/src/components/SSHKeys.tsx` for the page shell: heading, explanatory paragraph, loading spinner, error card with retry, empty state, and list.

- [ ] **Step 1: Write the token card**

Create `frontend/src/components/ui/ApiTokens/ApiTokenCard.tsx`:

```tsx
import { Card, Typography } from '@material-tailwind/react';
import { HiOutlineTrash } from 'react-icons/hi';

import FgButton from '@/components/designSystem/atoms/FgButton';
import FgIcon from '@/components/designSystem/atoms/FgIcon';
import type { ApiTokenInfo } from '@/queries/apiTokenQueries';

function formatDate(value: string | null): string {
  if (!value) {
    return 'Never';
  }
  return new Date(value).toLocaleDateString();
}

export default function ApiTokenCard({
  token,
  onRevoke,
  isRevoking
}: {
  readonly token: ApiTokenInfo;
  readonly onRevoke: (tokenId: string) => void;
  readonly isRevoking: boolean;
}) {
  const isExpired = new Date(token.expires_at) < new Date();

  return (
    <Card className="p-4 dark:border-surface-light">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography className="text-foreground font-semibold">
            {token.name}
            {isExpired ? (
              <span className="ml-2 text-error text-sm font-normal">
                Expired
              </span>
            ) : null}
          </Typography>
          <Typography className="text-secondary text-sm">
            {token.scopes.join(', ')}
          </Typography>
          <Typography className="text-secondary text-sm">
            Created {formatDate(token.created_at)} &middot; Expires{' '}
            {formatDate(token.expires_at)} &middot; Last used{' '}
            {formatDate(token.last_used_at)}
          </Typography>
        </div>
        <FgButton
          disabled={isRevoking}
          icon={HiOutlineTrash}
          onClick={() => onRevoke(token.token_id)}
          size="sm"
        >
          Revoke
        </FgButton>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Write the page**

Create `frontend/src/components/ApiTokens.tsx`. Model it on `SSHKeys.tsx`; the create dialog referenced here lands in Task 11, so for now wire the button to a `useState` that is not yet consumed:

```tsx
import { useState } from 'react';
import { Card, Typography } from '@material-tailwind/react';
import { HiOutlineKey, HiOutlinePlus } from 'react-icons/hi';

import FgButton from '@/components/designSystem/atoms/FgButton';
import FgIcon from '@/components/designSystem/atoms/FgIcon';
import ApiTokenCard from '@/components/ui/ApiTokens/ApiTokenCard';
import { Spinner } from '@/components/ui/widgets/Loaders';
import {
  useApiTokensQuery,
  useDeleteApiTokenMutation
} from '@/queries/apiTokenQueries';

export default function ApiTokens() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data, isLoading, error, refetch } = useApiTokensQuery();
  const deleteToken = useDeleteApiTokenMutation();

  const tokens = data ?? [];
  const hasTokens = tokens.length > 0;

  return (
    <>
      <Typography className="mb-6 text-foreground font-bold" type="h5">
        API Tokens
      </Typography>

      <Typography className="mb-6 text-foreground">
        API tokens let scripts and notebooks use Fileglancer through the{' '}
        <code>fileglancer</code> Python package. A token acts on your behalf,
        limited to the scopes you grant it. The token is shown only once, when
        you create it.
      </Typography>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner text="Loading API tokens..." />
        </div>
      ) : null}

      {error ? (
        <Card className="p-4 bg-error/10 border border-error/20">
          <Typography className="text-error">
            Failed to load API tokens: {error.message}
          </Typography>
          <FgButton className="mt-2" onClick={() => refetch()} size="sm">
            Retry
          </FgButton>
        </Card>
      ) : null}

      {!isLoading && !error && !hasTokens ? (
        <Card className="mb-6 p-8 text-center dark:border-surface-light">
          <FgIcon
            className="mx-auto h-12 w-12 mb-4"
            color="secondary"
            icon={HiOutlineKey}
          />
          <Typography className="text-foreground font-semibold mb-2">
            No API tokens
          </Typography>
          <Typography className="text-secondary mb-4">
            Create a token to use Fileglancer from Python.
          </Typography>
          <FgButton
            icon={HiOutlinePlus}
            onClick={() => setShowCreateDialog(true)}
            size="sm"
          >
            New Token
          </FgButton>
        </Card>
      ) : null}

      {!isLoading && !error && hasTokens ? (
        <div className="mb-6">
          <div className="mb-4">
            <FgButton
              icon={HiOutlinePlus}
              onClick={() => setShowCreateDialog(true)}
              size="sm"
            >
              New Token
            </FgButton>
          </div>
          <div className="space-y-4">
            {tokens.map(token => (
              <ApiTokenCard
                isRevoking={deleteToken.isPending}
                key={token.token_id}
                onRevoke={id => deleteToken.mutate(id)}
                token={token}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
```

- [ ] **Step 3: Register the route**

In `frontend/src/App.tsx`, add the import beside the `SSHKeys` import at line 27:

```tsx
import ApiTokens from '@/components/ApiTokens';
```

And add the route inside the `OtherPagesLayout` block, after the `ssh-keys` route that ends at line 163:

```tsx
            <Route
              element={
                <RequireAuth>
                  <ApiTokens />
                </RequireAuth>
              }
              path="api-tokens"
            />
```

The page is not behind a feature flag: token auth is core, not an integration.

- [ ] **Step 4: Add the navigation entry**

In `frontend/src/components/ui/Navbar/ProfileMenu.tsx`, add after the SSH Keys menu item (ends around line 81). Import `HiOutlineCode` from `react-icons/hi` alongside the existing icon imports:

```tsx
            <Menu.Item
              as={Link}
              className="text-foreground hover:!text-foreground focus:!text-foreground hover:bg-hover-gradient hover:dark:bg-hover-gradient-dark focus:bg-hover-gradient focus:dark:bg-hover-gradient-dark"
              to="/api-tokens"
            >
              <FgIcon className="mr-2" icon={HiOutlineCode} />
              API Tokens
            </Menu.Item>
```

- [ ] **Step 5: Verify it renders**

```bash
pixi run node-build
pixi run dev-launch
```

Open http://localhost:7878/api-tokens. Expected: the heading, the explanatory paragraph, and the "No API tokens" empty state with a "New Token" button. The button does nothing yet; the dialog is Task 11.

- [ ] **Step 6: Lint, format, and typecheck**

```bash
pixi run node-eslint-write
pixi run node-prettier-write
pixi run node-check
```

Expected: no new TypeScript errors beyond the five known pre-existing ones.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ApiTokens.tsx frontend/src/components/ui/ApiTokens/ApiTokenCard.tsx frontend/src/App.tsx frontend/src/components/ui/Navbar/ProfileMenu.tsx
git commit -m "feat: add API tokens page with list and revoke"
```

---

### Task 11: Create-token dialog and one-time secret display

**Files:**
- Create: `frontend/src/components/ui/ApiTokens/CreateTokenDialog.tsx`
- Create: `frontend/src/components/ui/ApiTokens/NewTokenDialog.tsx`
- Modify: `frontend/src/components/ApiTokens.tsx`

**Interfaces:**
- Consumes: `useCreateApiTokenMutation`, `API_SCOPES`, `CreateTokenResult` (Task 9).
- Produces:
  - `CreateTokenDialog` taking `{ showDialog, setShowDialog, onTokenCreated }`
  - `NewTokenDialog` taking `{ result, onClose }`, showing the secret once with a copy button and the environment-variable snippet

Read `frontend/src/components/ui/SSHKeys/GenerateTempKeyDialog.tsx` and `TempKeyDialog.tsx` first and follow their dialog structure, since they already solve "show a secret exactly once."

- [ ] **Step 1: Write the create dialog**

Create `frontend/src/components/ui/ApiTokens/CreateTokenDialog.tsx`:

```tsx
import { useState } from 'react';
import { Dialog, Typography } from '@material-tailwind/react';

import FgButton from '@/components/designSystem/atoms/FgButton';
import {
  API_SCOPES,
  useCreateApiTokenMutation
} from '@/queries/apiTokenQueries';
import type { CreateTokenResult } from '@/queries/apiTokenQueries';

const EXPIRY_OPTIONS = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '365 days' }
];

export default function CreateTokenDialog({
  showDialog,
  setShowDialog,
  onTokenCreated
}: {
  readonly showDialog: boolean;
  readonly setShowDialog: (show: boolean) => void;
  readonly onTokenCreated: (result: CreateTokenResult) => void;
}) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['files:read']);
  const [expiryDays, setExpiryDays] = useState(30);
  const createToken = useCreateApiTokenMutation();

  const canSubmit = name.trim().length > 0 && scopes.length > 0;

  const toggleScope = (scope: string) => {
    setScopes(current =>
      current.includes(scope)
        ? current.filter(s => s !== scope)
        : [...current, scope]
    );
  };

  const handleSubmit = async () => {
    const result = await createToken.mutateAsync({
      name: name.trim(),
      scopes,
      expires_in_days: expiryDays
    });
    setName('');
    setScopes(['files:read']);
    setExpiryDays(30);
    setShowDialog(false);
    onTokenCreated(result);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <Dialog.Overlay>
        <Dialog.Content className="max-w-md">
          <Typography className="mb-4 text-foreground font-bold" type="h6">
            New API Token
          </Typography>

          <label className="block mb-4">
            <Typography className="text-foreground text-sm mb-1">
              Name
            </Typography>
            <input
              className="w-full rounded border border-surface-light bg-transparent px-2 py-1 text-foreground"
              onChange={event => setName(event.target.value)}
              placeholder="laptop notebook"
              value={name}
            />
          </label>

          <fieldset className="mb-4">
            <Typography className="text-foreground text-sm mb-1">
              Scopes
            </Typography>
            {API_SCOPES.map(scope => (
              <label className="flex items-center gap-2 mb-1" key={scope}>
                <input
                  checked={scopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                  type="checkbox"
                />
                <code className="text-foreground text-sm">{scope}</code>
              </label>
            ))}
            <Typography className="text-secondary text-xs mt-1">
              A <code>:write</code> scope also grants <code>:read</code>.
            </Typography>
          </fieldset>

          <label className="block mb-4">
            <Typography className="text-foreground text-sm mb-1">
              Expires in
            </Typography>
            <select
              className="w-full rounded border border-surface-light bg-transparent px-2 py-1 text-foreground"
              onChange={event => setExpiryDays(Number(event.target.value))}
              value={expiryDays}
            >
              {EXPIRY_OPTIONS.map(option => (
                <option key={option.days} value={option.days}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {createToken.error ? (
            <Typography className="text-error text-sm mb-2">
              {createToken.error.message}
            </Typography>
          ) : null}

          <div className="flex justify-end gap-2">
            <FgButton onClick={() => setShowDialog(false)} size="sm">
              Cancel
            </FgButton>
            <FgButton
              disabled={!canSubmit || createToken.isPending}
              onClick={handleSubmit}
              size="sm"
            >
              Create
            </FgButton>
          </div>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write the one-time secret dialog**

Create `frontend/src/components/ui/ApiTokens/NewTokenDialog.tsx`:

```tsx
import { Dialog, Typography } from '@material-tailwind/react';

import FgButton from '@/components/designSystem/atoms/FgButton';
import type { CreateTokenResult } from '@/queries/apiTokenQueries';

export default function NewTokenDialog({
  result,
  onClose
}: {
  readonly result: CreateTokenResult | null;
  readonly onClose: () => void;
}) {
  if (!result) {
    return null;
  }

  const snippet = `export FILEGLANCER_URL=${window.location.origin}\nexport FILEGLANCER_TOKEN=${result.secret}`;

  return (
    <Dialog open onOpenChange={onClose}>
      <Dialog.Overlay>
        <Dialog.Content className="max-w-lg">
          <Typography className="mb-2 text-foreground font-bold" type="h6">
            Token created
          </Typography>

          <Typography className="mb-4 text-error text-sm">
            Copy this now. It will not be shown again.
          </Typography>

          <pre className="mb-4 overflow-x-auto rounded bg-surface-light p-3 text-xs text-foreground">
            {snippet}
          </pre>

          <div className="flex justify-end gap-2">
            <FgButton
              onClick={() => navigator.clipboard.writeText(snippet)}
              size="sm"
            >
              Copy
            </FgButton>
            <FgButton onClick={onClose} size="sm">
              Done
            </FgButton>
          </div>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog>
  );
}
```

- [ ] **Step 3: Wire both dialogs into the page**

In `frontend/src/components/ApiTokens.tsx`, add the imports:

```tsx
import CreateTokenDialog from '@/components/ui/ApiTokens/CreateTokenDialog';
import NewTokenDialog from '@/components/ui/ApiTokens/NewTokenDialog';
import type { CreateTokenResult } from '@/queries/apiTokenQueries';
```

Add the state alongside `showCreateDialog`:

```tsx
  const [newToken, setNewToken] = useState<CreateTokenResult | null>(null);
```

And render both dialogs just before the closing `</>`:

```tsx
      <CreateTokenDialog
        onTokenCreated={setNewToken}
        setShowDialog={setShowCreateDialog}
        showDialog={showCreateDialog}
      />

      <NewTokenDialog onClose={() => setNewToken(null)} result={newToken} />
```

- [ ] **Step 4: Verify the flow by hand**

```bash
pixi run node-build
pixi run dev-launch
```

At http://localhost:7878/api-tokens: click "New Token", enter a name, check `files:read`, create. Expected: the secret dialog appears with an `fgt_` token and both export lines; after "Done", the list shows the new token with its scopes and expiry, and the secret is nowhere in the listing.

- [ ] **Step 5: Verify the token actually works end to end**

Copy the two export lines from the dialog into a shell, then:

```bash
pixi run python -c "
from fileglancer import Fileglancer
fg = Fileglancer()
print([f.name for f in fg.file_share_paths()])
"
```

Expected: the list of file share names. This is the first full-loop check that GUI-minted tokens authenticate the Python client.

- [ ] **Step 6: Lint, format, and typecheck**

```bash
pixi run node-eslint-write
pixi run node-prettier-write
pixi run node-check
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui/ApiTokens/CreateTokenDialog.tsx frontend/src/components/ui/ApiTokens/NewTokenDialog.tsx frontend/src/components/ApiTokens.tsx
git commit -m "feat: add create-token dialog and one-time secret display"
```

---

### Task 12: End-to-end test

**Files:**
- Create: `frontend/ui-tests/tests/apiTokens.spec.ts`

**Interfaces:**
- Consumes: the `/api-tokens` page (Tasks 10 and 11).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the spec**

Authentication is handled by the shared fixture at `frontend/ui-tests/fixtures/fileglancer-fixture`, which every existing spec imports instead of `@playwright/test`. Importing `test` from there is the whole login setup; there is no explicit login step to write.

Create `frontend/ui-tests/tests/api-tokens.spec.ts`:

```ts
import { expect, test } from '../fixtures/fileglancer-fixture';

test.describe('API tokens', () => {
  test('create, display once, and revoke a token', async ({ page }) => {
    await page.goto('/api-tokens', { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { name: 'API Tokens' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'New Token' }).click();
    await page.getByPlaceholder('laptop notebook').fill('e2e token');
    await page.getByRole('button', { name: 'Create' }).click();

    // The secret is shown exactly once, in the confirmation dialog.
    await expect(page.getByText('Copy this now')).toBeVisible();
    await expect(page.getByText(/FILEGLANCER_TOKEN=fgt_/)).toBeVisible();

    await page.getByRole('button', { name: 'Done' }).click();

    // The listing shows the token but never its secret.
    await expect(page.getByText('e2e token')).toBeVisible();
    await expect(page.getByText(/fgt_/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Revoke' }).click();
    await expect(page.getByText('No API tokens')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
pixi run test-ui -- tests/api-tokens.spec.ts
```

Expected: PASS. If Playwright browsers are not installed:

```bash
pixi run node-install-ui-tests
cd frontend/ui-tests && pixi run npx playwright install
```

- [ ] **Step 3: Commit**

```bash
git add frontend/ui-tests/tests/api-tokens.spec.ts
git commit -m "test: add end-to-end spec for API token creation and revocation"
```

---

### Task 13: Documentation

**Files:**
- Create: `../fileglancer-docs/src/content/docs/features/python-api.mdx`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing consumed by later tasks.

The docs site is a separate Astro Starlight repository at `../fileglancer-docs`. `features/` holds capability pages (`ssh-keys.mdx` is the closest neighbour — also a credential-driven capability); `workflows/` holds task walkthroughs. This page belongs in `features/`.

- [ ] **Step 1: Write the page**

Create `../fileglancer-docs/src/content/docs/features/python-api.mdx` with the content below. Read `features/ssh-keys.mdx` first and match its heading style. Remember: one line per paragraph, no hard wrapping.

````markdown
---
title: Python API
description: Use Fileglancer from Python with an API token
---

Fileglancer's HTTP API can be driven from Python using an API token. The client ships inside the same `fileglancer` package as the command-line tool.

## Create a token

Open the profile menu and choose **API Tokens**, then **New Token**.

Give the token a name you will recognise later, choose the scopes it needs, and pick an expiry. Tokens last 30 days by default and at most 365 days.

| Scope | Grants |
| --- | --- |
| `files:read` | List directories and read file contents |
| `files:write` | Create, rename, delete, and write files |
| `links:read` | List data links and Neuroglancer links |
| `links:write` | Create and delete data links and Neuroglancer links |
| `jobs:read` | List jobs |
| `jobs:write` | Submit and cancel jobs |

A `:write` scope also grants the matching `:read`.

The token is shown exactly once, when you create it. Copy it then; it cannot be recovered afterwards. If you lose it, revoke it and create another.

Tokens cannot reach every endpoint. SSH keys, app management, preferences, and token management itself are available only in the web interface, so a leaked token cannot be used to mint another one.

## Connect

The client reads two environment variables:

```bash
export FILEGLANCER_URL=https://your-fileglancer-server
export FILEGLANCER_TOKEN=fgt_...
```

```python
from fileglancer import Fileglancer

fg = Fileglancer()
```

You can also pass them directly, which takes precedence over the environment:

```python
fg = Fileglancer(url="https://your-fileglancer-server", token="fgt_...")
```

## Paths

Every method takes an absolute filesystem path, the same path you would use on the command line.

```python
fg.ls("/nearline/alice")
fg.mkdir("/nearline/alice/analysis")
fg.write("/nearline/alice/notes.txt", b"hello")
fg.read("/nearline/alice/notes.txt")
fg.rename("/nearline/alice/a.zarr", "/nearline/alice/b.zarr")
fg.delete("/nearline/alice/tmp")
```

Paths in Mac (`smb://...`) and Windows (`\\server\share\...`) form are accepted too. Paths returned by the client are always in Linux form.

`fg.file_share_paths()` lists the shares available to you. If a path matches no share, the error names the ones that exist.

## Data links

A data link serves a folder over HTTP so that a viewer can read it.

```python
link = fg.create_data_link("/nearline/alice/sample.zarr")
print(link.url)

fg.data_links()
fg.delete_data_link(link.sharing_key)
```

## Neuroglancer links

`create_ng_link` takes a Neuroglancer state as a plain dictionary, which is what `neuroglancer.ViewerState.to_json()` produces.

```python
import neuroglancer
from fileglancer import Fileglancer

fg = Fileglancer()
link = fg.create_data_link("/nearline/alice/sample.zarr")

state = neuroglancer.ViewerState()
state.layers["sample"] = neuroglancer.ImageLayer(source=f"zarr://{link.url}")

print(fg.create_ng_link(state.to_json(), title="sample"))
```

This needs `links:write` on the token, and `neuroglancer` installed separately — the Fileglancer client does not depend on it.

Pass `url_base` to open the link in a different Neuroglancer instance.

## Jobs

```python
fg.jobs()
fg.jobs(status="RUNNING")
fg.job(job_id)
fg.cancel_job(job_id)
```

## Errors

Anything the server rejects raises `FileglancerError`, carrying the server's message and its HTTP status code.

```python
from fileglancer import FileglancerError

try:
    fg.mkdir("/nearline/alice/new")
except FileglancerError as error:
    print(error, error.status_code)
```

A 403 usually means the token is missing a scope; the message names the one it needs.
````

- [ ] **Step 2: Verify the docs site builds**

Follow the build instructions in `../fileglancer-docs/README.md` and confirm the new page renders and appears in the Features section of the navigation.

- [ ] **Step 3: Commit**

The docs site is a separate repository. Commit there:

```bash
cd ../fileglancer-docs
git add src/content/docs/features/python-api.mdx
git commit -m "docs: add Python API page"
```

Do not push either repository. Report both commits and let the user decide when to push.

---

## Final verification

- [ ] Run the full backend suite: `pixi run -e test test-backend`
- [ ] Run the frontend unit tests: `pixi run test-frontend`
- [ ] Run the end-to-end tests: `pixi run test-ui`
- [ ] Run the checks the pre-push hook runs: `pixi run node-prettier-check && pixi run node-eslint-check`
- [ ] Confirm `pixi run migrate` reaches head `f2a8c1d94e60` on a fresh database
