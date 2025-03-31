import json
import requests

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from tornado import web

from fileglancer.filestore import Filestore
from fileglancer.paths import get_fsp_manager


def _get_mounted_filestore(fsp):
    """
    Constructs a filestore for the given file share path, checking to make sure it is mounted. 
    If it is not mounted, returns None, otherwise returns the filestore.
    """
    filestore = Filestore(fsp)
    try:
        filestore.get_file_info(None)
    except FileNotFoundError:
        return None
    return filestore


class StreamingProxy(APIHandler):
    """
    API handler for proxying responses from the central server
    """
    def stream_response(self, url):
        """Stream response from central server back to client"""
        try:
            # Make request to central server
            response = requests.get(url, stream=True)
            response.raise_for_status()

            # Stream the response back
            self.set_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    self.write(chunk)
            self.finish()

        except requests.exceptions.RequestException as e:
            self.log.error(f"Error fetching {url}: {str(e)}")
            self.set_status(500)
            self.finish(json.dumps({
                "error": f"Error streaming response"
            }))


class FileSharePathsHandler(StreamingProxy): 
    """
    API handler for file share paths
    """
    @web.authenticated
    def get(self):
        self.log.info("GET /api/fileglancer/file-share-paths")
        file_share_paths = get_fsp_manager(self.settings).get_file_share_paths()
        self.set_header('Content-Type', 'application/json')
        self.set_status(200)
        # Convert Pydantic objects to dicts before JSON serialization
        file_share_paths_json = {"paths": [fsp.model_dump() for fsp in file_share_paths]}
        self.write(json.dumps(file_share_paths_json))
        self.finish()


class FileShareHandler(APIHandler):
    """
    API handler for file access using the Filestore class
    """

    def _get_filestore(self, path):
        """
        Get a filestore for the given path.
        """
        canonical_path = f"/{path}"
        fsp = get_fsp_manager(self.settings).get_file_share_path(canonical_path)
        if fsp is None:
            self.set_status(404)
            self.finish(json.dumps({"error": f"File share path '{canonical_path}' not found"}))
            self.log.error(f"File share path '{canonical_path}' not found")
            return None
        
        # Create a filestore for the file share path
        filestore = _get_mounted_filestore(fsp)
        if filestore is None:
            self.set_status(500)
            self.finish(json.dumps({"error": f"File share path '{canonical_path}' is not mounted"}))
            self.log.error(f"File share path '{canonical_path}' is not mounted")
            return None

        return filestore


    @web.authenticated
    def get(self, path=""):
        """
        Handle GET requests to list directory contents or stream file contents
        """
        subpath = self.get_argument("subpath", '')
        self.log.info(f"GET /api/fileglancer/files/{path} subpath={subpath}")

        
        filestore = self._get_filestore(path)
        if filestore is None:
            self.log.info("WTFFFFFFFFFF2"+path)
            return
        
        
        try:
            # Check if subpath is a directory by getting file info
            file_info = filestore.get_file_info(subpath)
            self.log.info(f"File info: {file_info}")
            
            if file_info.is_dir:
                # Write JSON response, streaming the files one by one
                self.set_status(200)
                self.set_header('Content-Type', 'application/json')
                self.write("{\n")
                self.write("\"files\": [\n")
                for i, file in enumerate(filestore.yield_file_infos(subpath)):
                    if i > 0:
                        self.write(",\n")
                    self.write(json.dumps(file.model_dump(), indent=4))
                self.write("]\n")
                self.write("}\n")
            else:
                # Stream file contents
                self.set_status(200)
                self.set_header('Content-Type', 'application/octet-stream')
                self.set_header('Content-Disposition', f'attachment; filename="{file_info.name}"')
                
                for chunk in filestore.stream_file_contents(subpath):
                    self.write(chunk)
                self.finish()
                
        except FileNotFoundError:
            self.log.error(f"File or directory not found: {subpath}")
            self.set_status(404)
            self.finish(json.dumps({"error": "File or directory not found"}))
        except PermissionError:
            self.set_status(403) 
            self.finish(json.dumps({"error": "Permission denied"}))


    @web.authenticated
    def post(self, path=""):
        """
        Handle POST requests to create a new file or directory
        """
        subpath = self.get_argument("subpath", '')
        self.log.info(f"POST /api/fileglancer/files/{path} subpath={subpath}")
        filestore = self._get_filestore(path)
        if filestore is None:
            return
        
        file_info = self.get_json_body()
        if file_info is None:
            raise web.HTTPError(400, "JSON body missing")
        
        file_type = file_info.get("type")
        if file_type == "directory":
            self.log.info(f"Creating {subpath} as a directory")
            filestore.create_dir(subpath)
        elif file_type == "file":
            self.log.info(f"Creating {subpath} as a file")
            filestore.create_empty_file(subpath)
        else:
            raise web.HTTPError(400, "Invalid file type")

        self.set_status(201)
        self.finish()


    @web.authenticated
    def patch(self, path=""):
        """
        Handle PATCH requests to rename or update file permissions.
        """
        subpath = self.get_argument("subpath", '')
        self.log.info(f"PATCH /api/fileglancer/files/{path} subpath={subpath}")
        filestore = self._get_filestore(path)
        if filestore is None:
            return
        
        file_info = self.get_json_body()
        if file_info is None:
            raise web.HTTPError(400, "JSON body missing")

        old_file_info = filestore.get_file_info(subpath)
        new_path = file_info.get("path")
        new_permissions = file_info.get("permissions")
        
        try:
            if new_permissions is not None and new_permissions != old_file_info.permissions:
                self.log.info(f"Changing permissions of {old_file_info.path} to {new_permissions}")
                filestore.change_file_permissions(subpath, new_permissions)

            if new_path is not None and new_path != old_file_info.path:
                self.log.info(f"Renaming {old_file_info.path} to {new_path}")
                filestore.rename_file_or_dir(old_file_info.path, new_path)

        except OSError as e:
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

        self.set_status(204)
        self.finish()


    @web.authenticated
    def delete(self, path=""):
        """
        Handle DELETE requests to remove a file or (empty) directory.
        """
        subpath = self.get_argument("subpath", '')
        self.log.info(f"DELETE /api/fileglancer/files/{path} subpath={subpath}")
        filestore = self._get_filestore(path)
        if filestore is None:
            return
        
        filestore.remove_file_or_dir(subpath)
        self.set_status(204)
        self.finish()


class PreferencesHandler(APIHandler):
    """
    Handler for user preferences API endpoints.
    """

    @web.authenticated
    def get(self):
        """
        Get all preferences or a specific preference for the current user.
        """
        key = self.get_argument("key", None)
        username = self.current_user.name
        self.log.info(f"GET /api/fileglancer/preference username={username} key={key}")

        try:
            response = requests.get(
                f"{self.settings['fileglancer'].central_url}/preference/{username}" + 
                (f"/{key}" if key else "")
            )
            if response.status_code == 404:
                self.set_status(404)
                self.finish(response.content)
                return
            response.raise_for_status()
            self.finish(response.json())

        except Exception as e:
            self.log.error(f"Error getting preference: {str(e)}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))


    @web.authenticated
    def put(self):
        """
        Set a preference for the current user.
        """
        key = self.get_argument("key")
        username = self.current_user.name
        value = self.get_json_body()
        self.log.info(f"PUT /api/fileglancer/preference username={username} key={key}")

        try:
            response = requests.put(
                f"{self.settings['fileglancer'].central_url}/preference/{username}/{key}",
                json=value
            )
            response.raise_for_status()
            self.set_status(204)
            self.finish()

        except Exception as e:
            self.log.error(f"Error setting preference: {str(e)}")
            self.set_status(500)
            self.finish(json.dumps({"z": str(e)}))


    @web.authenticated
    def delete(self):
        """
        Delete a preference for the current user.
        """
        key = self.get_argument("key")
        username = self.current_user.name
        self.log.info(f"DELETE /api/fileglancer/preference username={username} key={key}")

        try:
            response = requests.delete(
                f"{self.settings['fileglancer'].central_url}/preference/{username}/{key}"
            )
            if response.status_code == 404:
                self.set_status(404)
                self.finish(json.dumps({"error": "Preference not found"}))
                return
            response.raise_for_status()
            self.set_status(204)
            self.finish()

        except Exception as e:
            self.log.error(f"Error deleting preference: {str(e)}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))


class TicketHandler(APIHandler):
    """
    API handler for ticket operations
    """
    @web.authenticated
    def post(self):
        """Create a new ticket"""
        try:
            data = self.get_json_body()
            response = requests.post(
                f"{self.settings['fileglancer'].central_url}/ticket",
                params={
                    "project_key": data["project_key"],
                    "issue_type": data["issue_type"],
                    "summary": data["summary"], 
                    "description": data["description"]
                }
            )
            response.raise_for_status()
            self.set_status(200)
            self.finish(response.text)

        except Exception as e:
            self.log.error(f"Error creating ticket: {str(e)}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))


    @web.authenticated
    def get(self):
        """Get ticket details"""
        ticket_key = self.get_argument("ticket_key")
        try:
            response = requests.get(
                f"{self.settings['fileglancer'].central_url}/ticket/{ticket_key}"
            )
            if response.status_code == 404:
                self.set_status(404)
                self.finish(json.dumps({"error": "Ticket not found"}))
                return
            response.raise_for_status()
            self.set_status(200)
            self.finish(response.text)

        except Exception as e:
            self.log.error(f"Error getting ticket: {str(e)}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))


    @web.authenticated
    def delete(self):
        """Delete a ticket"""
        ticket_key = self.get_argument("ticket_key")
        try:
            response = requests.delete(
                f"{self.settings['fileglancer'].central_url}/ticket/{ticket_key}"
            )
            if response.status_code == 404:
                self.set_status(404)
                self.finish(json.dumps({"error": "Ticket not found"}))
                return
            response.raise_for_status()
            self.set_status(204)
            self.finish()

        except Exception as e:
            self.log.error(f"Error deleting ticket: {str(e)}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))


def setup_handlers(web_app):
    """ 
    Setup the URL handlers for the Fileglancer extension
    """
    base_url = web_app.settings["base_url"]
    handlers = [
        (url_path_join(base_url, "api", "fileglancer", "file-share-paths"), FileSharePathsHandler),
        (url_path_join(base_url, "api", "fileglancer", "files", "(.*)"), FileShareHandler),
        (url_path_join(base_url, "api", "fileglancer", "files"), FileShareHandler),
        (url_path_join(base_url, "api", "fileglancer", "preference"), PreferencesHandler),
        (url_path_join(base_url, "api", "fileglancer", "ticket"), TicketHandler),
    ]
    web_app.add_handlers(".*$", handlers)
