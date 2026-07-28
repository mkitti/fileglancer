"""Tests for /api/jobs rename (PATCH) endpoint."""

import os
import shutil
import tempfile

import pytest
from fastapi.testclient import TestClient

from fileglancer.settings import Settings
from fileglancer.server import create_app, get_current_user
from fileglancer.database import (
    Base,
    create_engine,
    dispose_engine,
    get_db_session,
    create_job,
)

OWNER = "alice"
OTHER = "bob"


@pytest.fixture
def temp_dir():
    d = tempfile.mkdtemp()
    yield d
    shutil.rmtree(d)


@pytest.fixture
def test_app(temp_dir):
    db_path = os.path.join(temp_dir, "test.db")
    db_url = f"sqlite:///{db_path}"
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)

    settings = Settings(db_url=db_url, file_share_mounts=[], cli_mode=True)

    import fileglancer.settings
    import fileglancer.database
    original_get_settings = fileglancer.settings.get_settings
    fileglancer.settings.get_settings = lambda: settings
    fileglancer.database.get_settings = lambda: settings
    fileglancer.database._migrations_run = True

    app = create_app(settings)
    yield app, db_url

    engine.dispose()
    dispose_engine(db_url)
    fileglancer.settings.get_settings = original_get_settings
    fileglancer.database.get_settings = original_get_settings
    fileglancer.database._migrations_run = False


@pytest.fixture
def client_factory(test_app):
    app, _ = test_app

    def _build(username):
        app.dependency_overrides[get_current_user] = lambda: username
        return TestClient(app)

    yield _build
    app.dependency_overrides.clear()


@pytest.fixture
def db_session(test_app):
    _, db_url = test_app
    session = get_db_session(db_url)
    yield session
    session.close()


def _seed_job(db_session, username=OWNER):
    return create_job(
        db_session, username, "https://github.com/owner/repo",
        "My App", "run", "Run Thing", {},
    )


def test_rename_job(client_factory, db_session):
    job = _seed_job(db_session)
    client = client_factory(OWNER)
    resp = client.patch(f"/api/jobs/{job.id}", json={"name": "  New Name  "})
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


def test_rename_job_blank_rejected(client_factory, db_session):
    job = _seed_job(db_session)
    client = client_factory(OWNER)
    resp = client.patch(f"/api/jobs/{job.id}", json={"name": "   "})
    assert resp.status_code == 400


def test_rename_job_not_owner(client_factory, db_session):
    job = _seed_job(db_session)
    client = client_factory(OTHER)
    resp = client.patch(f"/api/jobs/{job.id}", json={"name": "Nope"})
    assert resp.status_code == 404
