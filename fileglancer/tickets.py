import requests
import logging

from typing import Optional
from functools import cache

log = logging.getLogger(__name__)

class TicketsManager:
    """Manage the list of user-submitted JIRA tickets from the central server."""
    def __init__(self, central_url: str):
        self.central_url = central_url
        self._cached_proxied_paths = {}

    def get_tickets(self, username: str, fsp_name: Optional[str] = None, path: Optional[str] = None) -> requests.Response:
        """Retrieve tickets created by the user, optionally filtered by fsp_name and path."""
        log.info(f"Retrieve all tickets for user {username} from {self.central_url}")
        return requests.get(
            f"{self.central_url}/ticket/{username}", 
            params = {
                "fsp_name": fsp_name,
                "path": path
            }
        )

    def create_ticket(self, username: str, fsp_name: str, path: str, project_key: str, issue_type: str, summary:str, description:str) -> requests.Response:
        """Create a JIRA ticket for the given username, project_key, issue_type, summary, and description."""
        return requests.post(
                f"{self.central_url}/ticket",
                params={
                    "username": username,
                    "fsp_name": fsp_name,
                    "path": path,
                    "project_key": project_key,
                    "issue_type": issue_type,
                    "summary": summary,
                    "description": description
                }
            )
 

def get_tickets_manager(settings) -> TicketsManager:
    """
    Get an tickets manager instance based on the application settings.
    
    Args:
        settings: The application settings dictionary
        
    Returns:
        An tickets manager instance
    """
    central_url = settings["fileglancer"].central_url
    return _get_tickets_manager(central_url)


@cache
def _get_tickets_manager(central_url: str):
    return TicketsManager(central_url)