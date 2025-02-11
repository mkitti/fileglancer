import os
import json

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
from .filestore import Filestore


class RouteHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        self.log.info("GET /fileglancer/get-example")
        self.finish(json.dumps({
            "data": "This is /fileglancer/get-example endpoint!"
        }))


class FilestoreHandler(APIHandler):
    def initialize(self):
        """
        Initialize the handler with a Filestore instance
        """
        self.filestore = Filestore(os.getcwd())
        self.log.info(f"Filestore initialized with root directory: {self.filestore.get_root_path()}")


    # TODO: auth is disabled for development purposes. 
    #@tornado.web.authenticated
    def get(self, path=""):
        """
        Handle GET requests to list directory contents or stream file contents
        """
        self.log.info(f"GET /fileglancer/files/{path}")
        
        try:
            # Check if path is a directory by getting file info
            file_info = self.filestore.get_file_info(path)
            
            if file_info.is_dir:
                # List directory contents
                files = self.filestore.get_file_list(path)

                # Write JSON response   
                self.write("{\n")
                self.write("\"files\": [\n")
                for i, file in enumerate(files):
                    dumped = json.dumps(file.model_dump(), indent=4)
                    self.write(dumped)
                    if i < len(files) - 1:
                        self.write(",\n")
                    else:
                        self.write("\n")
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


def setup_handlers(web_app):
    """ 
    Setup the URL handlers for the Fileglancer extension
    """

    base_url = web_app.settings["base_url"]
    handlers = [
        (url_path_join(base_url, "fileglancer", "get-example"), RouteHandler), 
        (url_path_join(base_url, "fileglancer", "files", ".*"), FilestoreHandler),
        (url_path_join(base_url, "fileglancer", "files"), FilestoreHandler),
    ]
    web_app.add_handlers(".*$", handlers)
