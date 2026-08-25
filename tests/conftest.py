import os
import shutil
import tempfile

import pytest


def _can_create_symlink():
    """Probe whether the current OS/user can create symlinks."""
    try:
        with tempfile.TemporaryDirectory() as tmp:
            target = os.path.join(tmp, "target")
            with open(target, "w") as f:
                f.write("")
            os.symlink(target, os.path.join(tmp, "link"))
            return True
    except OSError:
        return False


# Skip markers for tests that require OS-specific features
requires_symlinks = pytest.mark.skipif(
    not _can_create_symlink(),
    reason="Creating symlinks not supported (requires admin privileges or Developer Mode on Windows)"
)

requires_ssh_keygen = pytest.mark.skipif(
    shutil.which("ssh-keygen") is None,
    reason="ssh-keygen not found on PATH"
)


@pytest.fixture(autouse=True)
def _clear_fsp_caches():
    """Drop the file-share-path caches between tests.

    They are keyed by database URL, so tests can't read each other's shares,
    but a test that adds a share to its own database and reads it back would
    otherwise be racing the TTL.
    """
    from fileglancer import database, worker_pool
    database._fsp_cache.clear()
    worker_pool._fsp_row_cache.clear()
    yield


def pytest_sessionstart(session):
    """
    Called after the Session object has been created and before performing collection
    and entering the run test loop.
    """
    os.environ['FGC_EXTERNAL_PROXY_URL'] = 'http://localhost/files'
    os.environ['FGC_USE_ACCESS_FLAGS'] = 'false'

def same_path(a: str, b: str) -> bool:
    """Compare two paths that should point at the same place.

    Windows reaches one directory by several spellings: backslash or forward
    slash separators, 8.3 short names (``RUNNER~1``) alongside long ones
    (``runneradmin``), and case-insensitively. The Fileglancer client
    deliberately normalizes separators to ``/``, so a literal comparison
    against ``os.path.join`` output fails on Windows with neither side being
    wrong.

    normcase lowercases and switches to the native separator on Windows and is
    a no-op on POSIX; realpath collapses 8.3 names and symlinks. Applied to
    both sides, so the comparison stays symmetric.
    """
    def norm(path: str) -> str:
        return os.path.normcase(os.path.realpath(path)).replace("\\", "/")

    return norm(a) == norm(b)
