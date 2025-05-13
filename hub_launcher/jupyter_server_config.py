c = get_config()  #noqa

c.ServerApp.jpserver_extensions = {
    "fileglancer": True,
    "jupyterlab": False,
    "jupyterlab_server": False,
    "jupyter_lsp": False,
    "notebook_shim": False,
}

#.jpserver_extensions = <LazyConfigValue value={'jupyterhub': True, 'fileglancer': True, 'jupyter_lsp': True, 'jupyter_server_terminals': True, 'jupyterlab': True, 'notebook_shim': True}>


