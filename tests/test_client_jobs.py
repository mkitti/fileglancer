"""Client job operations.

Job submission needs a real app manifest and scheduler, so these tests cover
the request shaping and scope enforcement rather than an end-to-end launch.
"""
import pytest
from fastapi.testclient import TestClient

from fileglancer.client import Fileglancer, FileglancerError
from fileglancer.database import create_api_token

from test_api_token_auth import token_app  # noqa: F401


@pytest.fixture
def fg(token_app):
    app, db_session = token_app
    _, plaintext = create_api_token(db_session, "alice", "test", ["jobs:write"])
    client = Fileglancer(url="http://testserver", token=plaintext)
    client._client = TestClient(
        app, headers={"Authorization": f"Bearer {plaintext}"})
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
    client = Fileglancer(url="http://testserver", token=plaintext)
    client._client = TestClient(
        app, headers={"Authorization": f"Bearer {plaintext}"})

    with pytest.raises(FileglancerError) as excinfo:
        client.submit_job(app_url="https://github.com/example/none",
                          entry_point_id="main")

    assert excinfo.value.status_code == 403
    client.close()


def test_a_links_only_token_cannot_list_jobs(token_app):
    app, db_session = token_app
    _, plaintext = create_api_token(db_session, "alice", "links", ["links:read"])
    client = Fileglancer(url="http://testserver", token=plaintext)
    client._client = TestClient(
        app, headers={"Authorization": f"Bearer {plaintext}"})

    with pytest.raises(FileglancerError) as excinfo:
        client.jobs()

    assert excinfo.value.status_code == 403
    client.close()
