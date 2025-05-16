import requests
import logging
from typing import Dict, Any, List, Optional
from collections import defaultdict
from functools import cache
from uimodels import ProxiedPath, CachedEntry


log = logging.getLogger("tornado.application")




class ProxiedPathManager:
    """Manage the list of user shared data paths from the central server."""

    def __init__(self, central_url: str):
        self.central_url = central_url
        self._cached_proxied_paths = {}
    
    def get_proxied_paths(self, username: str, sharing_key: Optional[str] = None) -> list[ProxiedPath]:
        """Lookup a user shared path by its sharing key."""
        cached_user_proxied_paths = self._cache_user_proxied_paths.get(username)
        if cached_user_proxied_paths is not None and cached_user_proxied_paths.is_not_expired():
            user_proxied_paths = cached_user_proxied_paths.entry()
        else:
            user_proxied_paths = self._cache_user_proxied_paths(username)
        if user_proxied_paths is None:
            return None
        elif sharing_key is not None:
            return [p for p in user_proxied_paths if p.sharing_key == sharing_key]
        else:
            return user_proxied_paths

    def create_proxied_path(self, username: str, a_path: str) -> ProxiedPath:
        """Create a proxied path with <a_path> as the mount_point"""
        del self._cache_user_proxied_paths[username] # invalidate the cache
        ppr = requests.post(
            f"{self.central_url}/proxied-path/{username}",
            params = {
                "mount_path": a_path
            }
        )
        return ProxiedPath(**ppr.json())

    def delete_proxied_path(self, username: str, sharing_key: str) -> None:
        del self._cache_user_proxied_paths[username] # invalidate the cache
        requests.delete(
            f"{self.central_url}/proxied-path/{username}/{sharing_key}"
        )

    def update_proxied_path(self, username: str, sharing_key, new_path: str, new_name) -> ProxiedPath:
        """Update a proxied path with <a_path> as the mount_point"""
        del self._cache_user_proxied_paths[username] # invalidate the cache
        pp_updates = {}
        if new_path:
            pp_updates["mount_path"] = new_path
        if new_name:
            pp_updates["sharing_name"] = new_name
        ppr = requests.put(
            f"{self.central_url}/proxied-path/{username}/{sharing_key}",
            params = pp_updates
        )
        return ProxiedPath(**ppr.json())

    def _cache_user_proxied_paths(self, username: str) -> list[ProxiedPath] | None:
        """Retrieve and cache user ."""
        if self.central_url and username:
            response = requests.get(f"{self.central_url}/proxied-path/{username}")
            pps_json = response.json()
            cached_proxied_paths = CachedEntry([ProxiedPath(**pp_json) for pp_json in pps_json])
            self._cached_proxied_paths[username] = cached_proxied_paths
            return cached_proxied_paths.entry()
        else:
            return None


@cache
def get_proxiedpath_manager(settings) -> ProxiedPathManager:
    """
    Get a proxied path manager instance based on the application settings.
    
    Args:
        settings: The application settings dictionary
        
    Returns:
        A proxied path manager instance
    """
    return ProxiedPathManager(settings["fileglancer"].central_url)



