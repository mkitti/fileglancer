import json
import pytest
import asyncio
import multiprocessing as mp
from traitlets.config import Config

import tornado.httpserver
import tornado.ioloop
import tornado.gen


TEST_SERVER_PORT = 18788
TEST_MESSAGE = {"paths": [{"zone": "local", "canonical_path": "/local", "linux_path": "/"}]}


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
    print(f"Mock central server listening on port {TEST_SERVER_PORT}")
    tornado.ioloop.IOLoop.current().start()


async def test_get_file_share_paths(jp_fetch):
    
    server_process = mp.Process(target=run_mock_central_server)
    server_process.start()
    
    try:
        await asyncio.sleep(1) # Wait for server to start
        response = await jp_fetch("api", "fileglancer", "file-share-paths")
        assert response.code == 200
        rj = json.loads(response.body)
        assert rj["paths"][0]["zone"] == TEST_MESSAGE["paths"][0]["zone"]
        assert rj["paths"][0]["canonical_path"] == TEST_MESSAGE["paths"][0]["canonical_path"]

    finally:
        # Stop the mock HTTP server
        server_process.terminate()
    