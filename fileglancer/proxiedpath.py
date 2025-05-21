import requests
import logging

from typing import Optional
from functools import cache

from .uimodels import ProxiedPath, ProxiedPathResponse


log = logging.getLogger(__name__)


class ProxiedPathManager:
    """Manage the list of user shared data paths from the central server."""

    def __init__(self, central_url: str):
        self.central_url = central_url
        self._cached_proxied_paths = {}
    
    def get_proxied_paths(self, username: str, sharing_key: Optional[str] = None) -> ProxiedPath | ProxiedPathResponse:
        """
        Retrieve user proxied paths.
        If no sharing_key is provided, all shared paths of the specified user are returned.
        """
        if sharing_key:
            log.info(f"Retrieve proxied path {sharing_key} for user {username} from {self.central_url}")
            return requests.get(f"{self.central_url}/proxied-path/{username}/{sharing_key}")
        else:
            log.info(f"Retrieve all proxied paths for user {username} from {self.central_url}")
            return requests.get(f"{self.central_url}/proxied-path/{username}")

    def create_proxied_path(self, username: str, mount_path: str) -> requests.Response:
        """Create a proxied path with <a_path> as the mount_point"""
        return requests.post(
            f"{self.central_url}/proxied-path/{username}",
            params = {
                "mount_path": mount_path
            }
        )

    def delete_proxied_path(self, username: str, sharing_key: str) -> requests.Response:
        return requests.delete(
            f"{self.central_url}/proxied-path/{username}/{sharing_key}"
        )

    def update_proxied_path(self, username: str, sharing_key, new_path: Optional[str], new_name: Optional[str]) -> requests.Response:
        """Update a proxied path with <a_path> as the mount_point"""
        pp_updates = {}
        if new_path:
            pp_updates["mount_path"] = new_path
        if new_name:
            pp_updates["sharing_name"] = new_name
        return requests.put(
            f"{self.central_url}/proxied-path/{username}/{sharing_key}",
            params = pp_updates
        )


def get_proxiedpath_manager(settings) -> ProxiedPathManager:
    """
    Get a proxied path manager instance based on the application settings.
    
    Args:
        settings: The application settings dictionary
        
    Returns:
        A proxied path manager instance
    """
    central_url = settings["fileglancer"].central_url
    return _get_proxiedpath_manager(central_url)


@cache
def _get_proxiedpath_manager(central_url: str):
    return ProxiedPathManager(central_url)


