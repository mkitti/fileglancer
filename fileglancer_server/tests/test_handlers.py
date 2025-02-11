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
