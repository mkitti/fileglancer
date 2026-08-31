"""Tests for the app service HTTPS proxy: URL caching, rewriting, and resolution."""

import os
import shutil
import tempfile

import pytest
from fastapi.testclient import TestClient

from fileglancer.settings import Settings, AppsSettings
from fileglancer.server import create_app, get_current_user
from fileglancer.database import (
    Base,
    create_engine,
    dispose_engine,
    get_db_session,
    create_job,
    get_job_by_id,
    set_job_service_url,
)

OWNER = "alice"
PROXY_DOMAIN = "services.example.org"


@pytest.fixture
def temp_dir():
    d = tempfile.mkdtemp()
    yield d
    shutil.rmtree(d)


@pytest.fixture
def settings_factory(temp_dir):
    """Build Settings against a fresh sqlite database, with the proxy domain
    configurable so the same fixtures cover both the on and off cases."""
    def _build(proxy_domain=""):
        db_path = os.path.join(temp_dir, "test.db")
        db_url = f"sqlite:///{db_path}"
        engine = create_engine(db_url)
        Base.metadata.create_all(engine)
        return Settings(
            db_url=db_url,
            file_share_mounts=[],
            cli_mode=True,
            apps=AppsSettings(service_proxy_domain=proxy_domain),
        ), db_url
    return _build


@pytest.fixture
def app_factory(settings_factory):
    """Build the FastAPI app. Patches fileglancer.settings.get_settings because
    database and server code call it directly rather than taking it as an
    argument."""
    built = []

    def _build(proxy_domain=""):
        settings, db_url = settings_factory(proxy_domain)
        import fileglancer.settings
        import fileglancer.database
        original = fileglancer.settings.get_settings
        fileglancer.settings.get_settings = lambda: settings
        fileglancer.database.get_settings = lambda: settings
        fileglancer.database._migrations_run = True
        built.append((db_url, original))
        return create_app(settings), db_url

    yield _build

    import fileglancer.settings
    import fileglancer.database
    for db_url, original in built:
        dispose_engine(db_url)
        fileglancer.settings.get_settings = original
        fileglancer.database.get_settings = original
    fileglancer.database._migrations_run = False


def _seed_service_job(db_url, status="RUNNING", entry_point_type="service"):
    session = get_db_session(db_url)
    try:
        job = create_job(
            session, OWNER, "https://github.com/owner/repo",
            "My App", "serve", "Server", {},
            entry_point_type=entry_point_type,
        )
        job.status = status
        session.commit()
        return job.id
    finally:
        session.close()


def test_set_job_service_url_persists(app_factory):
    _, db_url = app_factory()
    job_id = _seed_service_job(db_url)

    session = get_db_session(db_url)
    try:
        assert get_job_by_id(session, job_id).service_url is None
    finally:
        session.close()

    session = get_db_session(db_url)
    try:
        set_job_service_url(session, job_id, "http://node01:41235/lab?token=abc")
    finally:
        session.close()

    session = get_db_session(db_url)
    try:
        assert get_job_by_id(session, job_id).service_url == "http://node01:41235/lab?token=abc"
    finally:
        session.close()


def test_get_job_by_id_ignores_username(app_factory):
    """Resolution happens with no authenticated user, so the lookup must not
    require one."""
    _, db_url = app_factory()
    job_id = _seed_service_job(db_url)
    session = get_db_session(db_url)
    try:
        assert get_job_by_id(session, job_id).id == job_id
        assert get_job_by_id(session, job_id + 999) is None
    finally:
        session.close()


def test_get_job_caches_service_url(app_factory, monkeypatch):
    """Opening the job detail page is the only way to obtain a proxied URL, so
    it is where the cache gets populated — no new poll-loop work needed.

    `_worker_exec` is a closure local of `create_app` (not a module attribute),
    so it can't be monkeypatched from outside. In CLI mode (used by these
    fixtures) it dispatches in-process to the `get_service_url` action, which
    calls fileglancer.apps.jobfiles.get_service_url/get_service_phase — patch
    those instead, which also exercises the real CLI-mode dispatch path.
    """
    app, db_url = app_factory()
    job_id = _seed_service_job(db_url)

    import fileglancer.apps.jobfiles as jobfiles
    monkeypatch.setattr(jobfiles, "get_service_url",
                         lambda db_job: "http://node01:41235/lab?token=abc")
    monkeypatch.setattr(jobfiles, "get_service_phase", lambda db_job: "running")

    app.dependency_overrides[get_current_user] = lambda: OWNER
    client = TestClient(app)
    resp = client.get(f"/api/jobs/{job_id}")
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["service_url"] == "http://node01:41235/lab?token=abc"

    session = get_db_session(db_url)
    try:
        assert get_job_by_id(session, job_id).service_url == "http://node01:41235/lab?token=abc"
    finally:
        session.close()
