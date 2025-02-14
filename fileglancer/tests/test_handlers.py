import json


async def test_get_example(jp_fetch):
    # When
    response = await jp_fetch("fileglancer", "get-example")

    # Then
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "data": "This is /fileglancer/get-example endpoint!"
    }


async def test_get_files(jp_fetch):
    # When
    response = await jp_fetch("fileglancer", "files")

    # Then
    assert response.code == 200
    payload = json.loads(response.body)
    assert isinstance(payload, dict)
    assert "files" in payload
    assert isinstance(payload["files"], list)


async def test_patch_files(jp_fetch):
    
    # Create an empty directory
    response = await jp_fetch("fileglancer/files/newdir", method="POST", body=json.dumps({"type": "directory"}))
    assert response.code == 201

    # Create an empty file in the new directory
    response = await jp_fetch("fileglancer/files/newdir/newfile.txt", method="POST", body=json.dumps({"type": "file"}))
    assert response.code == 201

    # Change the permissions of the new file
    response = await jp_fetch("fileglancer/files/newdir/newfile.txt", method="PATCH", body=json.dumps({"permissions": "-rw-r--r--"}))
    assert response.code == 204

    # Move the file out of the directory
    response = await jp_fetch("fileglancer/files/newdir/newfile.txt", method="PATCH", body=json.dumps({"path": "newfile.txt"}))
    assert response.code == 204

    # Remove the empty directory
    response = await jp_fetch("fileglancer/files/newdir", method="DELETE")
    assert response.code == 204

