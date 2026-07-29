"""Hatchling build hook: fail a wheel build if pyproject.toml's PyPI
dependency specs don't match the exact versions pixi.lock resolved.

Guards against publishing a wheel after `pixi update` without having re-run
`pixi run sync-pypi-versions` (see scripts/sync_pyproject_versions.py) --
that would publish a package whose declared dependencies no longer reflect
what was actually tested against.
"""

import subprocess
import sys
from pathlib import Path

from hatchling.builders.hooks.plugin.interface import BuildHookInterface

ROOT = Path(__file__).parent
CHECK_SCRIPT = ROOT / "scripts" / "sync_pyproject_versions.py"
PIXI_LOCK = ROOT / "pixi.lock"


class CheckPypiVersionsHook(BuildHookInterface):
    PLUGIN_NAME = "check-pypi-versions"

    def initialize(self, version, build_data):
        # `version` is "standard" for a real wheel build and "editable" for an
        # editable/development install (`pip install -e .`, and every pixi
        # environment via [tool.pixi.pypi-dependencies]). Only check the
        # former -- pixi resolves editable-install metadata constantly,
        # including while pyproject.toml is intentionally unpinned mid
        # `pixi run bump-pypi-versions`, and that must not fail.
        if self.target_name != "wheel" or version != "standard":
            return
        if not PIXI_LOCK.exists() or not CHECK_SCRIPT.exists():
            # Building from a context without pixi.lock/the script (e.g. a
            # trimmed-down source tree) -- nothing to validate against.
            return

        result = subprocess.run([sys.executable, str(CHECK_SCRIPT), "--check"], cwd=ROOT)
        if result.returncode != 0:
            raise Exception(
                "pyproject.toml's PyPI dependency versions don't match pixi.lock. "
                "Run `pixi run sync-pypi-versions` (or `pixi run bump-pypi-versions` "
                "if you also want to pick up newer pixi.lock versions first) and "
                "commit the result before building."
            )
