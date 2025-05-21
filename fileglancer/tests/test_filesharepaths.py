import json
import pytest

from . import (server_config_with_central_server, TEST_CENTRAL_SERVER)


@pytest.fixture
def jp_server_config(server_config_with_central_server):
    return server_config_with_central_server


async def test_get_file_share_paths(jp_fetch, requests_mock):
    test_data = {"paths": [{"zone": "local", "name": "local", "mount_path": "/"}]}
    requests_mock.get(
        f"{TEST_CENTRAL_SERVER}/file-share-paths",
        json=test_data,
    )
    response = await jp_fetch("api", "fileglancer", "file-share-paths")
    assert response.code == 200
    rj = json.loads(response.body)
    assert rj["paths"][0]["zone"] == test_data["paths"][0]["zone"]
    assert rj["paths"][0]["name"] == test_data["paths"][0]["name"]
