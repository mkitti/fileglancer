import json
import pytest
import asyncio
import multiprocessing as mp
from traitlets.config import Config

import tornado.web
import tornado.httpserver
import tornado.ioloop
import tornado.gen


TEST_SERVER_PORT = 18788
TEST_MESSAGE = {"paths": ["/path1", "/path2"]}

@pytest.fixture
def jp_server_config():
    """Allows tests to setup their specific configuration values."""
    config = {
        "ServerApp": {
            "jpserver_extensions": {
                "fileglancer": True
            }
        },
        "Fileglancer": {
            "central_url": f"http://localhost:{TEST_SERVER_PORT}",
        }
    }
    return Config(config)


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


def run_mock_central_server():
    """Run a mock central server that returns test data."""
    class MockHandler(tornado.web.RequestHandler):
        def get(self):
            self.write(TEST_MESSAGE)
    
    app = tornado.web.Application([
        (r"/file-share-paths", MockHandler),
    ])
    http_server = tornado.httpserver.HTTPServer(app)
    http_server.listen(TEST_SERVER_PORT)
    tornado.ioloop.IOLoop.current().start()


async def test_get_file_share_paths(jp_fetch):
    
    server_process = mp.Process(target=run_mock_central_server)
    server_process.start()
    
    try:
        await asyncio.sleep(1) # Wait for server to start
        response = await jp_fetch("fileglancer", "file-share-paths")
        assert response.code == 200
        assert json.loads(response.body) == TEST_MESSAGE

    finally:
        # Stop the mock HTTP server
        server_process.terminate()
    
