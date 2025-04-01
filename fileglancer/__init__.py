"""Initialize the backend server extension"""
from traitlets import CFloat, List, Dict, Unicode, Bool, default
from traitlets.config import Configurable

try:
    from ._version import __version__
except ImportError:
    # Fallback when using the package in dev mode without installing
    # in editable mode with pip. It is highly recommended to install
    # the package from a stable release or in editable mode: https://pip.pypa.io/en/stable/topics/local-project-installs/#editable-installs
    import warnings
    warnings.warn("Importing 'fileglancer' outside a proper installation.")
    __version__ = "dev"

from .handlers import setup_handlers


def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "fileglancer"
    }]


def _jupyter_server_extension_points():
    return [{
        "module": "fileglancer"
    }]


class Fileglancer(Configurable):
    """
    Configuration for the Fileglancer extension
    """
    central_url = Unicode(
        help="The URL of the central server",
        default_value="",
        config=True,
    )
    dev_mode = Bool(
        help="Whether to run in dev mode",
        default_value=False,
        config=True,
    )


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    config = Fileglancer(config=server_app.config)
    server_app.web_app.settings["fileglancer"] = config
    setup_handlers(server_app.web_app)
    name = "fileglancer"
    server_app.log.info(f"Registered {name} server extension")
