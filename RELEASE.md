# Making a new release of fileglancer_server

This extension can be distributed as Python packages. All of the Python
packaging instructions are in the `pyproject.toml` file to wrap your extension in a
Python package.

Make sure to clean up all the development files before building the package:

```bash
pixi run npm run clean:all
```

You could also clean up the local git repository:

```bash
git clean -dfX
```

Before generating a package, you first need to install some tools:

```bash
pixi run pip install build twine hatch
```

Bump the version using `hatch`. By default this will create a tag.
See the docs on [hatch-nodejs-version](https://github.com/agoose77/hatch-nodejs-version#semver) for details.

```bash
pixi run hatch version <new-version>
```

To create a Python source package (`.tar.gz`) and the binary package (`.whl`) in the `dist/` directory, do:

```bash
pixi run pypi-build
```

To upload the package to the PyPI, you'll need one of the project owners to add you as a collaborator. After setting up your access token, do:

```bash
pixi run twine upload dist/*
```

The new version should now be [available on PyPI](https://pypi.org/project/fileglancer/).
