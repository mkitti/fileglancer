"""Client file operations, driven against the real app.

Reuses the token_app fixture from test_api_token_auth so the client exercises
the full bearer-auth path rather than a dependency override.
"""
import os

import pytest
from fastapi.testclient import TestClient

from fileglancer.client import Fileglancer, FileglancerError
from fileglancer.database import create_api_token

from test_api_token_auth import token_app  # noqa: F401


@pytest.fixture
def fg(token_app):
    """A client wired to the test app, with all scopes.

    TestClient is a synchronous httpx.Client that speaks ASGI directly, so the
    client's real request path is exercised with no server process. It also
    defaults to follow_redirects=True and base_url="http://testserver".
    """
    app, db_session = token_app
    _, plaintext = create_api_token(
        db_session, "alice", "test",
        ["files:write", "links:write", "jobs:write"])
    client = Fileglancer(url="http://testserver", token=plaintext)
    client._client = TestClient(
        app, headers={"Authorization": f"Bearer {plaintext}"})
    yield client
    client.close()


@pytest.fixture
def share_root(token_app):
    """The temp directory backing the 'tempdir' file share."""
    app, db_session = token_app
    from fileglancer.database import get_file_share_paths
    return get_file_share_paths(db_session)[0].mount_path


def test_ls_lists_the_share_root(fg, share_root):
    os.makedirs(os.path.join(share_root, "adir"), exist_ok=True)

    names = [f.name for f in fg.ls(share_root)]

    assert "adir" in names


def test_ls_returns_absolute_paths(fg, share_root):
    os.makedirs(os.path.join(share_root, "adir"), exist_ok=True)

    entry = next(f for f in fg.ls(share_root) if f.name == "adir")

    assert entry.absolute_path == os.path.join(share_root, "adir")


def test_stat_describes_the_path_itself(fg, share_root):
    info = fg.stat(share_root)

    assert info.is_dir is True


def test_mkdir_creates_a_directory(fg, share_root):
    target = os.path.join(share_root, "created")

    fg.mkdir(target)

    assert os.path.isdir(target)


def test_write_then_read_round_trips(fg, share_root):
    target = os.path.join(share_root, "notes.txt")

    written = fg.write(target, b"hello world")

    assert written == 11
    assert fg.read(target) == b"hello world"


def test_rename_moves_within_a_share(fg, share_root):
    src = os.path.join(share_root, "before.txt")
    dst = os.path.join(share_root, "after.txt")
    fg.write(src, b"x")

    fg.rename(src, dst)

    assert os.path.exists(dst)
    assert not os.path.exists(src)


def test_rename_across_shares_is_refused_before_any_request(fg, share_root):
    # '/tempdir/test/path' is the linux_path of the same share, so build a
    # genuinely different one by pointing at a share that does not exist.
    with pytest.raises(FileglancerError, match="No file share matches"):
        fg.rename(os.path.join(share_root, "a.txt"), "/nowhere/b.txt")


def test_delete_removes_a_file(fg, share_root):
    target = os.path.join(share_root, "doomed.txt")
    fg.write(target, b"x")

    fg.delete(target)

    assert not os.path.exists(target)


def test_ls_on_a_file_raises_rather_than_returning_empty(fg, share_root):
    """A file must not look like an empty directory."""
    target = os.path.join(share_root, "notafolder.txt")
    fg.write(target, b"x")

    with pytest.raises(FileglancerError, match="Not a directory"):
        fg.ls(target)


def test_error_response_becomes_a_fileglancer_error(fg, share_root):
    with pytest.raises(FileglancerError) as excinfo:
        fg.ls(os.path.join(share_root, "does-not-exist"))

    assert excinfo.value.status_code in (403, 404)


def test_a_read_only_token_cannot_write(token_app, share_root):
    app, db_session = token_app
    _, plaintext = create_api_token(db_session, "alice", "ro", ["files:read"])
    client = Fileglancer(url="http://testserver", token=plaintext)
    client._client = TestClient(
        app, headers={"Authorization": f"Bearer {plaintext}"})

    with pytest.raises(FileglancerError) as excinfo:
        client.mkdir(os.path.join(share_root, "nope"))

    assert excinfo.value.status_code == 403
    client.close()


def test_rename_rejects_a_cross_share_move(fg, monkeypatch):
    """Two resolvable paths on different shares must be refused locally."""
    monkeypatch.setattr(fg, "_resolve", lambda p: (
        ("shareA", "a.txt") if "a.txt" in p else ("shareB", "b.txt")))

    with pytest.raises(FileglancerError, match="same file share"):
        fg.rename("/x/a.txt", "/y/b.txt")
