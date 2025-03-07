import os
import json
import requests
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from tornado import web
from fileglancer.filestore import Filestore


class ServerRootMixin:
    """
    Mixin for getting the server root directory
    """
    def get_server_root_dir(self):
        """
        Get the server root directory
        """
        jupyter_root_dir = self.settings.get("server_root_dir", os.getcwd())
        self.log.debug(f"Jupyter root directory: {jupyter_root_dir}")
        jupyter_root_dir = os.path.abspath(os.path.expanduser(jupyter_root_dir))
        self.log.debug(f"Jupyter absolute directory: {jupyter_root_dir}")
        return jupyter_root_dir


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


class FileSharePathsHandler(StreamingProxy, ServerRootMixin): 
    """
    API handler for file share paths
    """
    @web.authenticated
    def get(self):
        self.log.info("GET /fileglancer/file-share-paths")
        central_url = self.settings["fileglancer"].central_url

        if not central_url:
            server_root_dir = self.get_server_root_dir()
            self.log.warning("No central URL found, using local path")
            file_share_paths = [
            {
                "zone": "Local",
                "group": "local",
                "storage": "home",
                "linux_path": server_root_dir
                }
            ]
            self.set_header('Content-Type', 'application/json')
            self.set_status(200)
            self.write(json.dumps(file_share_paths))
            self.finish()

        else:
            self.log.info(f"Central URL: {central_url}")
            self.stream_response(f"{central_url}/file-share-paths")





class FilestoreHandler(APIHandler, ServerRootMixin):
    """
    API handler for file access using the Filestore class
    """

    def initialize(self):
        """
        Initialize the handler with a Filestore instance
        """
        self.filestore = Filestore(self.get_server_root_dir())
        self.log.info(f"Filestore initialized with root directory: {self.filestore.get_root_path()}")


    @web.authenticated
    def get(self, path=""):
        """
        Handle GET requests to list directory contents or stream file contents
        """
        self.log.info(f"GET /fileglancer/files/{path}")
        
        try:
            # Check if path is a directory by getting file info
            file_info = self.filestore.get_file_info(path)
            
            if file_info.is_dir:
                # Write JSON response, streaming the files one by one
                self.write("{\n")
                self.write("\"files\": [\n")
                for i, file in enumerate(self.filestore.yield_file_infos(path)):
                    if i > 0:
                        self.write(",\n")
                    self.write(json.dumps(file.model_dump(), indent=4))
                self.write("]\n")
                self.write("}\n")
            else:
                # Stream file contents
                self.set_header('Content-Type', 'application/octet-stream')
                self.set_header('Content-Disposition', f'attachment; filename="{file_info.name}"')
                
                for chunk in self.filestore.stream_file_contents(path):
                    self.write(chunk)
                self.finish()
                
        except FileNotFoundError:
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
        self.log.info(f"POST /fileglancer/files/{path}")
        file_info = self.get_json_body()
        if file_info is None:
            raise web.HTTPError(400, "JSON body missing")
        
        file_type = file_info.get("type")
        if file_type == "directory":
            self.log.info(f"Creating {path} as a directory")
            self.filestore.create_dir(path)
        elif file_type == "file":
            self.log.info(f"Creating {path} as a file")
            self.filestore.create_empty_file(path)
        else:
            raise web.HTTPError(400, "Invalid file type")

        self.set_status(201)
        self.finish()


    @web.authenticated
    def patch(self, path=""):
        """
        Handle PATCH requests to rename or update file permissions.
        """
        self.log.info(f"PATCH /fileglancer/files/{path}")
        file_info = self.get_json_body()
        if file_info is None:
            raise web.HTTPError(400, "JSON body missing")

        old_file_info = self.filestore.get_file_info(path)
        new_path = file_info.get("path")
        new_permissions = file_info.get("permissions")
        
        try:
            if new_permissions is not None and new_permissions != old_file_info.permissions:
                self.log.info(f"Changing permissions of {path} to {new_permissions}")
                self.filestore.change_file_permissions(path, new_permissions)

            if new_path is not None and new_path != old_file_info.path:
                self.log.info(f"Renaming {old_file_info.path} to {new_path}")
                self.filestore.rename_file_or_dir(old_file_info.path, new_path)

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
        self.log.info(f"DELETE /fileglancer/files/{path}")
        self.filestore.remove_file_or_dir(path)
        self.set_status(204)
        self.finish()


def setup_handlers(web_app):
    """ 
    Setup the URL handlers for the Fileglancer extension
    """
    base_url = web_app.settings["base_url"]
    handlers = [
        (url_path_join(base_url, "api", "fileglancer", "file-share-paths"), FileSharePathsHandler),
        (url_path_join(base_url, "api", "fileglancer", "files", "(.*)"), FilestoreHandler),
        (url_path_join(base_url, "api", "fileglancer", "files"), FilestoreHandler),
    ]
    web_app.add_handlers(".*$", handlers)
