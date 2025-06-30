# Making a new release of fileglancer_server

This extension can be distributed as Python packages. All of the Python
packaging instructions are in the `pyproject.toml` file to wrap your extension in a
Python package.

Make sure to do a clean build before building the package:

```bash
./clean.sh
pixi run dev-install
pixi run node-build
```

Bump the version using `hatch`. See the docs on [hatch-nodejs-version](https://github.com/agoose77/hatch-nodejs-version#semver) for details.

```bash
pixi run set-version <new-version>
```

To create a Python source package (`.tar.gz`) and the binary package (`.whl`) in the `dist/` directory, do:

```bash
pixi run pypi-build
```

To upload the package to the PyPI, you'll need one of the project owners to add you as a collaborator. After setting up your access token, do:

```bash
pixi run pypi-upload
```

The new version should now be [available on PyPI](https://pypi.org/project/fileglancer/).
