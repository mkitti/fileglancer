import requests
import logging
from typing import Dict, Any, Optional, Protocol, runtime_checkable
from collections import defaultdict
from functools import cache

log = logging.getLogger("tornado.application")

@runtime_checkable
class PreferenceManager(Protocol):
    """Protocol defining the interface for preference management."""

    def get_preference(self, username: str, key: Optional[str] = None) -> Any:
        """
        Get a preference or all preferences for a user.
        
        Args:
            username: The username to get preferences for
            key: Optional specific preference key to get
            
        Returns:
            The preference value for the specified key, or a dictionary of all preferences
            if no key is specified
            
        Raises:
            KeyError: If the specified key does not exist
        """
        ...
    
    def set_preference(self, username: str, key: str, value: Any) -> None:
        """
        Set a preference for a user.
        
        Args:
            username: The username to set the preference for
            key: The preference key to set
            value: The value to set for the preference
        """
        ...
    
    def delete_preference(self, username: str, key: str) -> None:
        """
        Delete a preference for a user.
        
        Args:
            username: The username to delete the preference for
            key: The preference key to delete
            
        Raises:
            KeyError: If the specified key does not exist
        """
        ...


class InMemoryPreferenceManager:
    """Preference manager that stores preferences in memory."""
    
    def __init__(self):
        """Initialize the in-memory preference store."""
        # Using defaultdict to automatically create user entries
        self._preferences: Dict[str, Dict[str, Any]] = defaultdict(dict)
        log.info("Initialized InMemoryPreferenceManager")
    
    def get_preference(self, username: str, key: Optional[str] = None) -> Any:
        """
        Get a preference or all preferences for a user from memory.
        
        Args:
            username: The username to get preferences for
            key: Optional specific preference key to get
            
        Returns:
            The preference value or dictionary of all preferences
            
        Raises:
            KeyError: If the preference key does not exist
        """
        if username not in self._preferences:
            if key:
                raise KeyError(f"Preference '{key}' not found for user '{username}'")
            return {}
            
        if key is not None:
            if key not in self._preferences[username]:
                raise KeyError(f"Preference '{key}' not found for user '{username}'")
            return self._preferences[username][key]
        
        return self._preferences[username].copy()
    
    def set_preference(self, username: str, key: str, value: Any) -> None:
        """
        Set a preference in memory.
        
        Args:
            username: The username to set the preference for
            key: The preference key to set
            value: The value to set for the preference
        """
        self._preferences[username][key] = value
    
    def delete_preference(self, username: str, key: str) -> None:
        """
        Delete a preference from memory.
        
        Args:
            username: The username to delete the preference for
            key: The preference key to delete
            
        Raises:
            KeyError: If the preference key does not exist
        """
        if username not in self._preferences or key not in self._preferences[username]:
            raise KeyError(f"Preference '{key}' not found for user '{username}'")
        
        del self._preferences[username][key]


class RemotePreferenceManager:
    """Preference manager that uses a remote API to store preferences."""
    
    def __init__(self, central_url: str, logger=None):
        """
        Initialize the remote preference manager.
        
        Args:
            central_url: The URL of the central server API
            logger: Optional logger instance for logging errors
        """
        self.central_url = central_url
        self.logger = logger
        log.info(f"Initialized RemotePreferenceManager with central URL: {central_url}")
    
    def get_preference(self, username: str, key: Optional[str] = None) -> Any:
        """
        Get preferences from the remote API.
        
        Args:
            username: The username to get preferences for
            key: Optional specific preference key to get
            
        Returns:
            The preference value or dictionary of all preferences
            
        Raises:
            KeyError: If the preference key does not exist
            RuntimeError: If there is an error communicating with the API
        """
        try:
            response = requests.get(
                f"{self.central_url}/preference/{username}" + 
                (f"/{key}" if key else "")
            )
            
            if response.status_code == 404:
                if key:
                    raise KeyError(f"Preference '{key}' not found for user '{username}'")
                else:
                    raise KeyError(f"No preferences found for user '{username}'")
                
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            if self.logger:
                self.logger.error(f"Error getting preference: {str(e)}")
            raise RuntimeError(f"Error communicating with preference API: {str(e)}")
    
    def set_preference(self, username: str, key: str, value: Any) -> None:
        """
        Set a preference using the remote API.
        
        Args:
            username: The username to set the preference for
            key: The preference key to set
            value: The value to set for the preference
            
        Raises:
            RuntimeError: If there is an error communicating with the API
        """
        try:
            response = requests.put(
                f"{self.central_url}/preference/{username}/{key}",
                json=value
            )
            response.raise_for_status()
            
        except requests.exceptions.RequestException as e:
            if self.logger:
                self.logger.error(f"Error setting preference: {str(e)}")
            raise RuntimeError(f"Error communicating with preference API: {str(e)}")
    
    def delete_preference(self, username: str, key: str) -> None:
        """
        Delete a preference using the remote API.
        
        Args:
            username: The username to delete the preference for
            key: The preference key to delete
            
        Raises:
            KeyError: If the preference key does not exist
            RuntimeError: If there is an error communicating with the API
        """
        try:
            response = requests.delete(
                f"{self.central_url}/preference/{username}/{key}"
            )
            
            if response.status_code == 404:
                raise KeyError(f"Preference '{key}' not found for user '{username}'")
                
            response.raise_for_status()
            
        except requests.exceptions.RequestException as e:
            if self.logger:
                self.logger.error(f"Error deleting preference: {str(e)}")
            raise RuntimeError(f"Error communicating with preference API: {str(e)}")


@cache
def _get_preference_manager(central_url: str) -> PreferenceManager:
    """
    Create a preference manager based on configuration parameters.
    This function is cached so that only one instance is created per set of parameters.
    
    Args:
        central_url: The URL of the central server API
        
    Returns:
        A preference manager instance
    """
    if central_url is None or central_url == "":
        return InMemoryPreferenceManager()
    else:
        return RemotePreferenceManager(central_url)


def get_preference_manager(settings) -> PreferenceManager:
    """
    Get a preference manager instance based on the application settings.
    
    Args:
        settings: The application settings dictionary
        
    Returns:
        A preference manager instance
    """
    return _get_preference_manager(settings["fileglancer"].central_url)



