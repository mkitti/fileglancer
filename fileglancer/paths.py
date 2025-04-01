import os
import requests
import logging
from typing import Optional
from datetime import datetime, timedelta
from functools import cache
from pydantic import BaseModel, Field

log = logging.getLogger("tornado.application")

# Copied from fileglancer-central/fileglancer_central/app.py
# TODO: consider extracting this to a shared library
class FileSharePath(BaseModel):
    """A file share path from the database"""
    name: str = Field(
        description="The name of the file share, which uniquely identifies the file share."
    )
    zone: str = Field(
        description="The zone of the file share, for grouping paths in the UI."
    )
    group: Optional[str] = Field(
        description="The group that owns the file share",
        default=None
    )
    storage: Optional[str] = Field(
        description="The storage type of the file share (home, primary, scratch, etc.)",
        default=None
    )
    mount_path: str = Field(
        description="The path where the file share is mounted on the local machine"
    )
    mac_path: Optional[str] = Field(
        description="The path used to mount the file share on Mac (e.g. smb://server/share)",
        default=None
    )
    windows_path: Optional[str] = Field(
        description="The path used to mount the file share on Windows (e.g. \\\\server\\share)",
        default=None
    )
    linux_path: Optional[str] = Field(
        description="The path used to mount the file share on Linux (e.g. /unix/style/path)",
        default=None
    )
        

class FileSharePathManager:
    """Manage the list of file share paths from the central server.
    
    This class is used to manage the list of file share paths from the central server.
    It is used to get the file share paths from the central server and to cache them for a short time.
    """
    
    def __init__(self, central_url: str, dev_mode: bool, jupyter_root_dir: str):
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
            
            if dev_mode:
                log.warning("Dev mode is enabled, using fake file share config")
                import random
                
                # Lists of words to generate random zone and path names
                adjectives = ["Red", "Blue", "Green", "Purple", "Golden", "Silver", "Crystal", "Mystic", "Ancient", "Cosmic"]
                nouns = ["Forest", "Mountain", "Ocean", "Desert", "Valley", "Canyon", "River", "Cave", "Plains", "Ridge"]
                path_types = ["Data", "Projects", "Archive", "Scratch", "Storage"]
                
                # Generate 10 zones with 5 paths each
                zones = []
                while len(zones) < 10:
                    adj = random.choice(adjectives)
                    noun = random.choice(nouns)
                    zone = f"{adj} {noun}"
                    if zone not in zones:  # Avoid duplicates
                        zones.append(zone)
                
                self._file_share_paths = []
                for zone in zones:
                    for path_type in path_types:
                        name = f"{zone.lower().replace(' ', '-')}-{path_type.lower()}"
                        self._file_share_paths.append(
                            FileSharePath(
                                zone=zone,
                                name=name,
                                group=zone.lower().replace(' ', '_'),
                                storage=path_type.lower(),
                                mount_path=root_dir_expanded,
                                mac_path=f"smb://dev-server/{name}",
                                windows_path=f"\\\\dev-server\\{name}",
                                linux_path=f"/mnt/dev/{name}"
                            )
                        )
                n = len(self._file_share_paths)
                log.info(f"Configured {n} file share paths in dev mode")
            else:
                log.warning("Central URL is not set but dev mode is not enabled. Using simple local file share config.")
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
def _get_fsp_manager(central_url: str, dev_mode: bool, jupyter_root_dir: str):
    return FileSharePathManager(central_url, dev_mode, jupyter_root_dir)

def get_fsp_manager(settings):
    # Extract the relevant settings from the settings dictionary, 
    # since it's not serializable and can't be passed to a @cache method
    jupyter_root_dir = settings.get("server_root_dir", os.getcwd())
    central_url = settings["fileglancer"].central_url
    dev_mode = settings["fileglancer"].dev_mode
    return _get_fsp_manager(central_url, dev_mode, jupyter_root_dir)
