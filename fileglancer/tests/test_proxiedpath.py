import json
import pytest

from unittest.mock import patch

from . import (server_config_with_central_server, TEST_CENTRAL_SERVER)


TEST_USER = "test_user"
TEST_URL = f"{TEST_CENTRAL_SERVER}/proxied-path/{TEST_USER}"


@pytest.fixture
def jp_server_config(server_config_with_central_server):
    return server_config_with_central_server


@patch("fileglancer.handlers.ProxiedPathHandler.get_current_user", return_value=TEST_USER)
async def test_get_all_user_proxied_paths(test_current_user, jp_fetch, requests_mock):
    test_data = [
        {
            "username": TEST_USER,
            "sharing_key": "test_key_1",
            "sharing_name": "test_name_1",
            "mount_path": "/test/path_1"
        },
        {
            "username": TEST_USER,
            "sharing_key": "test_key_2",
            "sharing_name": "test_name_2",
            "mount_path": "/test/path_2"
        }
    ]

    requests_mock.get(TEST_URL, json={"paths": test_data})

    response = await jp_fetch("api", "fileglancer", "proxied-path")

    assert response.code == 200
    rj = json.loads(response.body)
    assert len(rj["paths"]) == len(test_data)
    for i, path in enumerate(rj["paths"]):
        assert path["username"] == test_data[i]["username"]
        assert path["sharing_key"] == test_data[i]["sharing_key"]
        assert path["sharing_name"] == test_data[i]["sharing_name"]
        assert path["mount_path"] == test_data[i]["mount_path"]


@patch("fileglancer.handlers.ProxiedPathHandler.get_current_user", return_value=TEST_USER)
async def test_get_specific_user_proxied_path(test_current_user, jp_fetch, requests_mock):
    test_key = "test_key_2"
    test_data = [
        {
            "username": TEST_USER,
            "sharing_key": "test_key_1",
            "sharing_name": "test_name_1",
            "mount_path": "/test/path_1"
        },
        {
            "username": TEST_USER,
            "sharing_key": "test_key_2",
            "sharing_name": "test_name_2",
            "mount_path": "/test/path_2"
        }
    ]

    requests_mock.get(TEST_URL, json={"paths": test_data})

    response = await jp_fetch("api", "fileglancer", "proxied-path", params={"key": test_key})

    assert response.code == 200
    rj = json.loads(response.body)
    assert len(rj["paths"]) == 1
    for i, path in enumerate(rj["paths"]):
        if test_data[i]["sharing_key"] == test_key:
            assert path["username"] == test_data[i]["username"]
            assert path["sharing_key"] == test_data[i]["sharing_key"]
            assert path["sharing_name"] == test_data[i]["sharing_name"]
            assert path["mount_path"] == test_data[i]["mount_path"]


@patch("fileglancer.handlers.ProxiedPathHandler.get_current_user", return_value=TEST_USER)
async def test_get_user_proxied_path_when_key_not_present(test_current_user, jp_fetch, requests_mock):
    test_key = "test_key_3"
    test_data = [
        {
            "username": TEST_USER,
            "sharing_key": "test_key_1",
            "sharing_name": "test_name_1",
            "mount_path": "/test/path_1"
        }
    ]

    requests_mock.get(TEST_URL, json={"paths": test_data})

    try:
        await jp_fetch("api", "fileglancer", "proxied-path", params={"key": test_key})
        assert False, "Expected 404 error"
    except Exception as e:
        assert e.code == 404
        rj = json.loads(e.response.body)
        assert rj["error"] == "Proxied path not found"


