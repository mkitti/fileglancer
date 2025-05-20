"""Python unit tests for fileglancer."""
import pytest


TEST_CENTRAL_SERVER = "http://localhost:18788"


@pytest.fixture
def server_config_with_central_server():
    """Setup a server configuration with a central server."""
    config = {
        "ServerApp": {
            "jpserver_extensions": {
                "fileglancer": True
            }
        },
        "Fileglancer": {
            "central_url": TEST_CENTRAL_SERVER,
        }
    }
    return config


@pytest.fixture
def server_config_without_central_server():
    """Setup a server configuration without a central server."""
    config = {
        "ServerApp": {
            "jpserver_extensions": {
                "fileglancer": True
            }
        }
    }
    return config
