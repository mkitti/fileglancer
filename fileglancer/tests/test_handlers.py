import json


async def test_get_files(jp_fetch):
    # When
    path = "api/fileglancer/files/local"
    response = await jp_fetch(path)

    # Then
    assert response.code == 200
    assert response.body != b""
    payload = json.loads(response.body)
    assert isinstance(payload, dict)
    assert "files" in payload
    assert isinstance(payload["files"], list)


async def test_patch_files(jp_fetch):
    path = "api/fileglancer/files/local"

    # Create an empty directory
    response = await jp_fetch(path, method="POST", params={"subpath": "newdir"}, body=json.dumps({"type": "directory"}))
    assert response.code == 201

    # Create an empty file in the new directory
    response = await jp_fetch(path, method="POST", params={"subpath": "newdir/newfile.txt"}, body=json.dumps({"type": "file"}))
    assert response.code == 201

    # Change the permissions of the new file
    response = await jp_fetch(path, method="PATCH", params={"subpath": "newdir/newfile.txt"}, body=json.dumps({"permissions": "-rw-r--r--"}))
    assert response.code == 204

    # Move the file out of the directory
    response = await jp_fetch(path, method="PATCH", params={"subpath": "newdir/newfile.txt"}, body=json.dumps({"path": "newfile.txt"}))
    assert response.code == 204

    # Remove the empty directory
    response = await jp_fetch(path, method="DELETE", params={"subpath": "newdir"})
    assert response.code == 204


async def test_get_file_share_paths(jp_fetch):
    response = await jp_fetch("api", "fileglancer", "file-share-paths")
    assert response.code == 200
    payload = json.loads(response.body)
    assert isinstance(payload, dict)
    assert "paths" in payload
    assert isinstance(payload["paths"], list)
    assert payload["paths"][0]["name"] == "local"
