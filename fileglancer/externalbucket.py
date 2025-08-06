import requests
import logging

from typing import Optional
from functools import cache

log = logging.getLogger(__name__)

class ExternalBucketManager:
    """Manage external bucket information from the central server."""

    def __init__(self, central_url: str):
        self.central_url = central_url

    def get_buckets(self, fsp_name: Optional[str] = None) -> requests.Response:
        """
        Retrieve all external buckets or buckets for a specific FSP.
        
        Args:
            fsp_name: Optional FSP name to filter buckets
            
        Returns:
            Response containing bucket information
        """
        log.info(f"Retrieve external buckets from {self.central_url}")
        if fsp_name:
            return requests.get(f"{self.central_url}/external-buckets/{fsp_name}")
        else:
            return requests.get(f"{self.central_url}/external-buckets")


def get_externalbucket_manager(settings) -> ExternalBucketManager:
    """
    Get an external bucket manager instance based on the application settings.
    
    Args:
        settings: The application settings dictionary
        
    Returns:
        An external bucket manager instance
    """
    central_url = settings["fileglancer"].central_url
    return _get_externalbucket_manager(central_url)


@cache
def _get_externalbucket_manager(central_url: str):
    return ExternalBucketManager(central_url)
