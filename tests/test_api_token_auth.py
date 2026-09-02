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
    create_session,
    dispose_engine,
    sessionmaker,
)
from fileglancer.auth import API_SCOPES
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

    # Enables every scope: these tests exercise the scope model itself, not the
    # server's shipped default (which withholds files:write and jobs:write).
    # test_disabled_scopes.py covers the restricted configuration.
    settings = Settings(db_url=db_url, file_share_mounts=[], cli_mode=True,
                        api_token_scopes=sorted(API_SCOPES))
    # get_current_user resolves settings via get_settings() at request time.
    # server.py binds that name at import, so patch it there too (not just in
    # the settings/database modules) — otherwise the real endpoint would look
    # up the token in the default database instead of this test's.
    import fileglancer.server
    original = fileglancer.settings.get_settings
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
    fileglancer.settings.get_settings = original
    fileglancer.database.get_settings = original
    fileglancer.server.get_settings = original
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
    assert "files:write" in response.json()["error"]


def test_wrong_resource_scope_is_refused(token_app):
    client, _ = _client_with_token(token_app, ["links:read"])

    response = client.get("/api/files/tempdir")

    assert response.status_code == 403


def test_session_only_path_is_refused_to_every_token(token_app):
    client, _ = _client_with_token(token_app, ["files:write", "links:write",
                                               "jobs:write"])

    response = client.get("/api/ssh-keys")

    assert response.status_code == 403
    assert "not accessible with an API token" in response.json()["error"]


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
    assert "expired" in response.json()["error"].lower()


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
    assert "malformed" in response.json()["error"].lower()


def test_non_fgt_bearer_falls_through_to_cookie_auth(token_app):
    # A bearer value that is not an fgt_ token is not a Fileglancer API token,
    # so the request is treated as unauthenticated rather than rejected as a
    # bad token.
    app, _ = token_app
    client = TestClient(app)

    response = client.get("/api/files/tempdir",
                          headers={"Authorization": "Bearer someothertoken"})

    assert response.status_code == 401
    assert "log in" in response.json()["error"].lower()


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


def test_malformed_token_with_empty_id_is_rejected(token_app):
    app, _ = token_app
    client = TestClient(app)

    response = client.get("/api/files/tempdir",
                          headers={"Authorization": "Bearer fgt__secretonly"})

    assert response.status_code == 401
    assert "malformed" in response.json()["error"].lower()


def test_malformed_token_with_empty_secret_is_rejected(token_app):
    app, db_session = token_app
    row, _ = create_api_token(db_session, "alice", "test", ["files:read"])
    client = TestClient(app)

    response = client.get("/api/files/tempdir",
                          headers={"Authorization": f"Bearer fgt_{row.token_id}_"})

    assert response.status_code == 401
    assert "malformed" in response.json()["error"].lower()


def test_bearer_token_never_falls_back_to_cookie_auth(token_app):
    """A request carrying BOTH a bearer token and a session cookie must be
    authenticated by the token alone, never by the cookie.

    server.py skips the Origin check whenever a bearer token is present. If
    get_current_user ever fell back to the cookie when the token failed, that
    combination would authenticate a cross-origin cookie request with the
    Origin check skipped -- a CSRF hole. This pins the property shut.
    """
    app, db_session = token_app
    user_session = create_session(
        db_session, username="alice", email=None,
        expires_at=datetime.now(UTC) + timedelta(hours=1),
        session_secret_key="testkey")
    client = TestClient(app)
    client.cookies.set("fg_session", user_session.session_id)

    response = client.get(
        "/api/files/tempdir",
        headers={"Authorization": "Bearer fgt_deadbeefcafe_wrongsecret",
                 "Origin": "https://evil.example.com"})

    assert response.status_code == 401


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


def test_access_log_names_the_user_and_token(token_app):
    """End to end through the real bearer path, not a simulated request.state.

    Complements test_log.py, which stubs the state directly: this confirms
    get_user_from_token actually populates it on a genuine token request.
    """
    from loguru import logger

    app, db_session = token_app
    row, plaintext = create_api_token(db_session, "alice", "tracing",
                                      ["files:read"])

    lines = []
    sink_id = logger.add(lambda msg: lines.append(msg), format="{message}")
    try:
        client = TestClient(app)
        client.get("/api/files/tempdir",
                   headers={"Authorization": f"Bearer {plaintext}"})
    finally:
        logger.remove(sink_id)

    access_lines = [line for line in lines if "HTTP/1.1" in line]
    assert access_lines, lines
    assert f"[alice fgt:{row.token_id}]" in access_lines[-1], access_lines[-1]
