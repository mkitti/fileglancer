# Making a new release of Fileglancer

## Run Python 3.12 compatibility tests

Since the PyPI package supports Python 3.12 (`requires-python = ">=3.12.0"`), verify that the backend tests pass under Python 3.12 before releasing:

```bash
pixi run test-py312
```

## Verify the build won't be blocked

The wheel build (`pixi run pypi-build`) fails if `pyproject.toml`'s pinned PyPI dependency versions don't match `pixi.lock`. Check this up front, so a stale pin doesn't block the build *after* you've already bumped the version:

```bash
pixi run sync-pypi-versions --check
```

If it reports a mismatch, run `pixi run bump-pypi-versions` (to also pick up newer versions) or `pixi run sync-pypi-versions` (to pin to the current lock), then commit the result before continuing.

## Bump the version number

To view the current version:
```bash
pixi run version
```

To bump the minor version:
```bash
pixi run version minor
```

You can also specify "major", "patch", or a specific version like "2.1.0". See the docs on [hatch-nodejs-version](https://hatch.pypa.io/1.9/version/#supported-segments) for more details.

## Clean build

Make sure to do a clean build before building the package for release:

```bash
./clean.sh
pixi run dev-install
```

The `version` command updated the `package.json` and the clean build updated the `package-lock.json` file. Make sure to check these changes into the main branch.


## Package

Build the distribution bundle:

```bash
pixi run pypi-build
```

To upload the package to the PyPI, you'll need one of the project owners to add you as a collaborator. After setting up your access token, do:

```bash
pixi run pypi-upload
```

The new version should now be [available on PyPI](https://pypi.org/project/fileglancer/).

Now [draft a new release](https://github.com/JaneliaSciComp/fileglancer/releases/new). Create a new tag that is the same as the version number, and set the release title to the same (e.g. "1.0.0". Click on "Generate release notes" and make any necessary edits. Ideally, you should include any release notes from the associated [fileglancer-central](https://github.com/JaneliaSciComp/fileglancer-central) release.

## Post-deployment of a new release

Periodically, following a new release on production, run `pixi run bump-pypi-versions` - this command temporarily unpins the PyPI versions, runs `pixi update`, and then `pixi run sync-pypi-versions`, to allow packages to update and re-pin.

## Other documentation

- [Development](Development.md)
