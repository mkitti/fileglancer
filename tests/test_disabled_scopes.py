"""Tests for the server-configurable API token scope set.

`api_token_scopes` withholds files:write and jobs:write by default. A scope
left out of it cannot be granted to a new token AND is ignored on tokens that
already hold it, so an admin who removes one genuinely removes the capability
instead of only affecting tokens minted afterwards.

The shared `token_app` fixture in test_api_token_auth enables all six scopes;
this module builds its own app with a restricted set.
"""
import os
import shutil
import tempfile

import pytest
from fastapi.testclient import TestClient

import fileglancer.database
import fileglancer.server
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
def restricted_app():
    """App whose config withholds files:write, as the default does."""
    temp_dir = tempfile.mkdtemp()
    db_url = f"sqlite:///{os.path.join(temp_dir, 'test.db')}"
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    db_session = sessionmaker(bind=engine)()
    db_session.add(FileSharePathDB(
        name="tempdir", zone="testzone", group="testgroup", storage="local",
        mount_path=temp_dir,
    ))
    db_session.commit()

    settings = Settings(db_url=db_url, file_share_mounts=[], cli_mode=True,
                        api_token_scopes=["files:read", "links:read"])
    originals = (fileglancer.settings.get_settings,
                 fileglancer.database.get_settings,
                 fileglancer.server.get_settings)
    fileglancer.settings.get_settings = lambda: settings
    fileglancer.database.get_settings = lambda: settings
    fileglancer.server.get_settings = lambda: settings

    yield create_app(settings), db_session

    db_session.close()
    engine.dispose()
    dispose_engine(db_url)
    from fileglancer.user_worker import _filestore_cache, _user_groups_cache
    _filestore_cache.clear()
    _user_groups_cache.clear()
    (fileglancer.settings.get_settings,
     fileglancer.database.get_settings,
     fileglancer.server.get_settings) = originals
    shutil.rmtree(temp_dir)


def _client(app, plaintext):
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {plaintext}"
    return client


def test_enabled_scopes_endpoint_reports_the_configured_set(restricted_app):
    app, _ = restricted_app
    # Session-only, so use the dependency override rather than a token.
    from fileglancer.server import get_current_user
    app.dependency_overrides[get_current_user] = lambda: "alice"

    response = TestClient(app).get("/api/tokens/scopes")

    assert response.status_code == 200
    assert response.json() == {"scopes": ["files:read", "links:read"]}
    app.dependency_overrides.clear()


def test_creating_a_token_with_a_disabled_scope_is_refused(restricted_app):
    app, _ = restricted_app
    from fileglancer.server import get_current_user
    app.dependency_overrides[get_current_user] = lambda: "alice"

    response = TestClient(app).post("/api/tokens", json={
        "name": "writer", "scopes": ["files:read", "files:write"],
    })

    assert response.status_code == 400
    detail = response.json()["error"]
    assert "files:write" in detail
    assert "administrator" in detail
    # The remedy differs from an unknown scope, so the wording must too.
    assert "Unknown scopes" not in detail
    app.dependency_overrides.clear()


def test_an_enabled_scope_is_still_grantable(restricted_app):
    app, _ = restricted_app
    from fileglancer.server import get_current_user
    app.dependency_overrides[get_current_user] = lambda: "alice"

    response = TestClient(app).post("/api/tokens", json={
        "name": "reader", "scopes": ["files:read"],
    })

    assert response.status_code == 201
    app.dependency_overrides.clear()


def test_a_token_holding_a_since_disabled_scope_loses_it(restricted_app):
    """The case the design turns on.

    The token is created directly in the database, standing in for one minted
    while the scope was still enabled. Disabling it must take effect on that
    existing token, not just on tokens created afterwards.
    """
    app, db_session = restricted_app
    _, plaintext = create_api_token(db_session, "alice", "legacy",
                                    ["files:read", "files:write"])
    client = _client(app, plaintext)

    # The read half still works.
    assert client.get("/api/files/tempdir").status_code == 200

    # The write half does not, even though the token carries it.
    response = client.post("/api/files/tempdir?subpath=newdir",
                           json={"type": "directory"})

    assert response.status_code == 403
    detail = response.json()["error"]
    assert "files:write" in detail
    assert "not enabled on this server" in detail
    assert "administrator" in detail


def test_the_disabled_message_differs_from_a_missing_scope(restricted_app):
    """A user can fix a missing scope by minting a new token; they cannot fix
    a server-side decision, so the two must not read the same."""
    app, db_session = restricted_app
    _, plaintext = create_api_token(db_session, "alice", "reader",
                                    ["files:read"])
    client = _client(app, plaintext)

    # links:write is disabled server-wide.
    disabled = client.post("/api/proxied-path?fsp_name=tempdir&path=x")
    assert disabled.status_code == 403
    assert "not enabled on this server" in disabled.json()["error"]

    # links:read IS enabled; this token simply was not granted it.
    missing = client.get("/api/proxied-path")
    assert missing.status_code == 403
    assert "missing the required scope" in missing.json()["error"]


def test_disabling_a_scope_does_not_affect_cookie_sessions(restricted_app):
    """The scope set governs tokens only; a logged-in browser is unaffected."""
    app, _ = restricted_app
    from fileglancer.server import get_current_user
    app.dependency_overrides[get_current_user] = lambda: "alice"

    # files:write is disabled, but this is a session, not a token.
    response = TestClient(app).post("/api/files/tempdir?subpath=viacookie",
                                    json={"type": "directory"})

    assert response.status_code == 201
    app.dependency_overrides.clear()
