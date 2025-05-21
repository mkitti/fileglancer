import json
import pytest

from unittest.mock import patch

from . import (server_config_with_central_server, TEST_CENTRAL_SERVER)


TEST_USER = "test_user"
TEST_URL = f"{TEST_CENTRAL_SERVER}/proxied-path/{TEST_USER}"
TEST_INVALID_USER = "invalid_user"


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


@patch("fileglancer.handlers.ProxiedPathHandler.get_current_user", return_value=TEST_INVALID_USER)
async def test_get_user_proxied_path_when_central_responds_with_404(test_current_user, jp_fetch, requests_mock):
    url_for_invalid_user = f"{TEST_CENTRAL_SERVER}/proxied-path/{TEST_INVALID_USER}"

    requests_mock.get(url_for_invalid_user, json={"error": "Returned an error"}, status_code=404)

    try:
        await jp_fetch("api", "fileglancer", "proxied-path")
        assert False, "Expected 404 error"
    except Exception as e:
        assert e.code == 404
        rj = json.loads(e.response.body)
        assert rj["error"] == "{\"error\": \"Returned an error\"}"


@patch("fileglancer.handlers.ProxiedPathHandler.get_current_user", return_value=TEST_USER)
async def test_delete_user_proxied(test_current_user, jp_fetch, requests_mock):
    test_key = "test_key_2"
    test_delete_url = f"{TEST_URL}/{test_key}"
    requests_mock.delete(test_delete_url, status_code=204)
    response = await jp_fetch("api", "fileglancer", "proxied-path", method="DELETE", params={"username": TEST_USER, "key": test_key})
    assert response.code == 204


@patch("fileglancer.handlers.ProxiedPathHandler.get_current_user", return_value=TEST_USER)
async def test_delete_user_proxied_path_exception(test_current_user, jp_fetch, requests_mock):
    try:
        test_key = "test_key_2"
        test_delete_url = f"{TEST_URL}/{test_key}"
        requests_mock.delete(test_delete_url, status_code=404)
        await jp_fetch("api", "fileglancer", "proxied-path", method="DELETE", params={"username": TEST_USER, "key": test_key})
        assert False, "Expected 404 error"
    except Exception as e:
        assert e.code == 404
        rj = json.loads(e.response.body)
        assert rj["error"] == f"404 Client Error: None for url: {test_delete_url}"


async def test_delete_user_proxied_path_without_key(jp_fetch):
    try:
        await jp_fetch("api", "fileglancer", "proxied-path", method="DELETE", params={"username": TEST_USER})
        assert False, "Expected 400 error"
    except Exception as e:
        assert e.code == 400
        rj = json.loads(e.response.body)
        assert rj["error"] == "Key is required to delete a proxied path"


@patch("fileglancer.handlers.ProxiedPathHandler.get_current_user", return_value=TEST_USER)
async def test_post_user_proxied_path(test_current_user, jp_fetch, requests_mock):
    payload = {
        "mount_path": "/test/path"
    }
    requests_mock.post(f"{TEST_URL}?mount_path=/test/path",
                       status_code=201,
                       json={
                           "username": TEST_USER,
                           "sharing_key": "test_key",
                           "sharing_name": "test_name",
                           "mount_path": "/test/path"
                       })

    response = await jp_fetch("api", "fileglancer", "proxied-path",
                              method="POST",
                              body=json.dumps(payload),
                              headers={"Content-Type": "application/json"})
    rj = json.loads(response.body)
    assert response.code == 201
    assert rj["username"] == TEST_USER
    assert rj["sharing_key"] == "test_key"
    assert rj["sharing_name"] == "test_name"
    assert rj["mount_path"] == "/test/path"


@patch("fileglancer.handlers.ProxiedPathHandler.get_current_user", return_value=TEST_USER)
async def test_post_user_proxied_path_exception(test_current_user, jp_fetch, requests_mock):
    try:
        payload = {
            "mount_path": "/test/path"
        }
        requests_mock.post(f"{TEST_URL}?mount_path=/test/path",
                        status_code=404,
                        json={
                            "error": "Some error"
                        })

        await jp_fetch("api", "fileglancer", "proxied-path",
                        method="POST",
                        body=json.dumps(payload),
                        headers={"Content-Type": "application/json"})
        assert False, "Expected 404 error"        
    except Exception as e:
        assert e.code == 404
        rj = json.loads(e.response.body)
        assert rj["error"] == "{\"error\": \"Some error\"}"


async def test_post_user_proxied_path_without_mountpath(jp_fetch):
    try:
        await jp_fetch("api", "fileglancer", "proxied-path",
                       method="POST",
                       body=json.dumps({}), # empty payload
                       headers={"Content-Type": "application/json"})
        assert False, "Expected 400 error"
    except Exception as e:
        assert e.code == 400
        rj = json.loads(e.response.body)
        assert rj["error"] == "Mount path is required to create a proxied path"


@patch("fileglancer.handlers.ProxiedPathHandler.get_current_user", return_value=TEST_USER)
async def test_put_user_proxied_path(test_current_user, jp_fetch, requests_mock):
    test_key = "test_key"
    new_mount_path = "/test/path"
    new_sharing_name = "newname"
    requests_mock.put(f"{TEST_URL}/{test_key}?mount_path={new_mount_path}&sharing_name={new_sharing_name}",
                       status_code=200,
                       json={
                            "username": TEST_USER,
                            "sharing_key": test_key,
                            "sharing_name": new_sharing_name,
                            "mount_path": new_mount_path
                       })

    response = await jp_fetch("api", "fileglancer", "proxied-path",
                              method="PUT",
                              params={
                                  "key": test_key,
                                  "mount-path": new_mount_path,
                                  "sharing-name": new_sharing_name
                              },
                              body=json.dumps({}),
                              headers={"Content-Type": "application/json"})
    rj = json.loads(response.body)
    assert response.code == 200
    assert rj["username"] == TEST_USER
    assert rj["sharing_key"] == test_key
    assert rj["sharing_name"] == new_sharing_name
    assert rj["mount_path"] == new_mount_path


@patch("fileglancer.handlers.ProxiedPathHandler.get_current_user", return_value=TEST_USER)
async def test_put_user_proxied_path_exception(test_current_user, jp_fetch, requests_mock):
    try:
        test_key = "test_key"
        new_mount_path = "/test/path"
        new_sharing_name = "newname"
        requests_mock.put(f"{TEST_URL}/{test_key}?mount_path={new_mount_path}&sharing_name={new_sharing_name}",
                          status_code=404,
                          json={
                            "error": "Some error"
                          })

        await jp_fetch("api", "fileglancer", "proxied-path",
                        method="PUT",
                        params={
                            "key": test_key,
                            "mount-path": new_mount_path,
                            "sharing-name": new_sharing_name
                        },
                        body=json.dumps({}),
                        headers={"Content-Type": "application/json"})
        assert False, "Expected 404 error"        
    except Exception as e:
        assert e.code == 404
        rj = json.loads(e.response.body)
        assert rj["error"] == "{\"error\": \"Some error\"}"


async def test_post_user_proxied_path_without_sharingkey(jp_fetch):
    try:
        await jp_fetch("api", "fileglancer", "proxied-path",
                       method="PUT",
                       body=json.dumps({}), # empty payload
                       headers={"Content-Type": "application/json"})
        assert False, "Expected 400 error"
    except Exception as e:
        assert e.code == 400
        rj = json.loads(e.response.body)
        assert rj["error"] == "Key is required to update a proxied path"
