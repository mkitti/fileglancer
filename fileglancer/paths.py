import os
import requests
import logging

from typing import Optional
from datetime import datetime, timedelta
from functools import cache

from fileglancer.uimodels import FileSharePath

log = logging.getLogger(__name__)


class FileSharePathManager:
    """Manage the list of file share paths from the central server.
    
    This class is used to manage the list of file share paths from the central server.
    It is used to get the file share paths from the central server and to cache them for a short time.
    """
    
    def __init__(self, central_url: str, jupyter_root_dir: str):
        """Initialize the file share path manager."""
        self.central_url = central_url
        if self.central_url:
            log.debug(f"Central URL: {self.central_url}")
            self._file_share_paths = None
            self._fsp_cache_time = None
            n = len(self.get_file_share_paths())
            log.info(f"Configured {n} file share paths")
        else:
            root_dir_expanded = os.path.abspath(os.path.expanduser(jupyter_root_dir))
            log.debug(f"Jupyter absolute directory: {root_dir_expanded}")
        
            log.warning("Central URL is not set. Using simple local file share config.")
            self._file_share_paths = [
                FileSharePath(
                    zone="Local",
                    name="local",
                    group="local",
                    storage="home",
                    mount_path=root_dir_expanded,
                )
            ]
            n = len(self._file_share_paths)
            log.info(f"Configured {n} file share paths")


    def get_file_share_paths(self) -> list[FileSharePath]:
        """Get the list of file share paths from the central server."""
        if self.central_url:
            # Check if we have a valid cache
            now = datetime.now()
            if not self._file_share_paths or not self._fsp_cache_time or now - self._fsp_cache_time > timedelta(hours=1):
                log.debug("Cache miss or expired, fetching fresh data")
                response = requests.get(f"{self.central_url}/file-share-paths")
                fsps = response.json()["paths"]
                self._file_share_paths = [FileSharePath(**fsp) for fsp in fsps]
                self._fsp_cache_time = now
            else:
                log.debug("Cache hit")
            
        return self._file_share_paths
    

    def get_file_share_path(self, name: str) -> Optional[FileSharePath]:
        """Lookup a file share path by its canonical path."""
        for fsp in self._file_share_paths:
            if name == fsp.name:
                return fsp
        return None


@cache
def _get_fsp_manager(central_url: str, jupyter_root_dir: str):
    return FileSharePathManager(central_url, jupyter_root_dir)


def get_fsp_manager(settings):
    # Extract the relevant settings from the settings dictionary, 
    # since it's not serializable and can't be passed to a @cache method
    jupyter_root_dir = settings.get("server_root_dir", os.getcwd())
    central_url = settings["fileglancer"].central_url
    return _get_fsp_manager(central_url, jupyter_root_dir)
