# Fileglancer

[![Github Actions Status](https://github.com/JaneliaSciComp/fileglancer/workflows/Build/badge.svg)](https://github.com/JaneliaSciComp/fileglancer/actions/workflows/build.yml)

Fileglancer is a web application designed to allow researchers at Janelia to easily browse, share, and manage large scientific imaging data using [OME-NGFF](https://github.com/ome/ngff) (i.e. OME-Zarr). Our goal is to reduce the friction experienced by users who want to easily share their data with their colleagues. Simply browse to your data, click on the Neuroglancer link, and send that link to your collaborator.

Features:

- Easy file navigation - browse network file shares using an intuitive web UI
- Seamless data sharing - create a "data link" for any file share path
- Integration with web-based viewers - shareable links to Neuroglancer and other viewers

See the [Fileglancer User Guide](https://janeliascicomp.github.io/fileglancer-user-docs/) for more information.

## Architecture

Fileglancer is built on top of JuptyerHub, which provides the infrastructure for allowing users to login and interact directly with their files on mounted network file systems.

## Documentation

- [User guide](https://janeliascicomp.github.io/fileglancer-user-docs/)
- [Developer guide](docs/Development.md)

## Related repositories

- [fileglancer-central](https://github.com/JaneliaSciComp/fileglancer-central) - Central server managing access to a shared database and other resources
- [fileglancer-hub](https://github.com/JaneliaSciComp/fileglancer-hub) - Deployment of Fileglancer into JupyterHub
- [fileglancer-user-docs](https://github.com/JaneliaSciComp/fileglancer-user-docs) - User guide
