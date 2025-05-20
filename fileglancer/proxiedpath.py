import requests
import logging

from typing import Optional
from functools import cache

from .uimodels import ProxiedPath, CachedEntry


log = logging.getLogger(__name__)


class ProxiedPathManager:
    """Manage the list of user shared data paths from the central server."""

    def __init__(self, central_url: str):
        self.central_url = central_url
        self._cached_proxied_paths = {}
    
    def get_proxied_paths(self, username: str, sharing_key: Optional[str] = None) -> list[ProxiedPath]:
        """Lookup a user shared path by its sharing key."""
        cached_user_proxied_paths = self._cached_proxied_paths.get(username)
        if cached_user_proxied_paths is not None and cached_user_proxied_paths.is_not_expired():
            user_proxied_paths = cached_user_proxied_paths.entry()
        else:
            user_proxied_paths = self._cache_user_proxied_paths(username).entry()
        if user_proxied_paths is None:
            return None
        elif sharing_key is not None:
            return [p for p in user_proxied_paths if p.sharing_key == sharing_key]
        else:
            return user_proxied_paths

    def create_proxied_path(self, username: str, mount_path: str) -> requests.Response:
        """Create a proxied path with <a_path> as the mount_point"""
        self._cached_proxied_paths.pop(username, None)  # invalidate the cache
        return requests.post(
            f"{self.central_url}/proxied-path/{username}",
            params = {
                "mount_path": mount_path
            }
        )

    def delete_proxied_path(self, username: str, sharing_key: str) -> requests.Response:
        self._cached_proxied_paths.pop(username, None)  # invalidate the cache
        return requests.delete(
            f"{self.central_url}/proxied-path/{username}/{sharing_key}"
        )

    def update_proxied_path(self, username: str, sharing_key, new_path: Optional[str], new_name: Optional[str]) -> requests.Response:
        """Update a proxied path with <a_path> as the mount_point"""
        self._cached_proxied_paths.pop(username, None)  # invalidate the cache
        pp_updates = {}
        if new_path:
            pp_updates["mount_path"] = new_path
        if new_name:
            pp_updates["sharing_name"] = new_name
        return requests.put(
            f"{self.central_url}/proxied-path/{username}/{sharing_key}",
            params = pp_updates
        )

    def _cache_user_proxied_paths(self, username: str) -> list[ProxiedPath] | None:
        """Retrieve and cache user ."""
        if self.central_url and username:
            log.info(f"Cache proxied paths for user {username} from central server")
            response = requests.get(f"{self.central_url}/proxied-path/{username}")
            print('!!!!!!!! RESPONSE CODE:', response.status_code)
            response.raise_for_status()
            print('!!!!!!!! AFTER RAISE RESPONSE CODE:', response.status_code)
            pps_json = response.json()["paths"]
            cached_proxied_paths = CachedEntry([ProxiedPath(**pp_json) for pp_json in pps_json])
            self._cached_proxied_paths[username] = cached_proxied_paths
            return cached_proxied_paths
        else:
            # wrap a None value in a CachedEntry
            return CachedEntry(None)


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


