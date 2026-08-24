"""Tests for client construction and absolute-path resolution.

Resolution mirrors resolvePathToFsp in frontend/src/utils/pathHandling.ts.
The FSP fixture below is the shared fixture set both resolvers are checked
against; keep it in sync with the TypeScript test.
"""
import httpx
import pytest

from fileglancer.client import Fileglancer, FileglancerError
from fileglancer.model import FileSharePath


# Shared fixture set. The '/misc/public' vs '/misc/public-archive' pair is the
# prefix-boundary case; 'home' exercises an FSP with no alternate mount forms.
SHARED_FSPS = [
    FileSharePath(name="nearline", zone="z", mount_path="/nearline",
                  linux_path="/nearline", mac_path="smb://store/nearline",
                  windows_path="\\\\store\\nearline"),
    FileSharePath(name="public", zone="z", mount_path="/misc/public",
                  linux_path="/misc/public"),
    FileSharePath(name="public-archive", zone="z",
                  mount_path="/misc/public-archive",
                  linux_path="/misc/public-archive"),
    FileSharePath(name="home", zone="z", mount_path="/home/alice"),
]


@pytest.fixture
def fg():
    """A client with the FSP list pre-seeded, so no HTTP call is made."""
    client = Fileglancer(url="http://testserver", token="fgt_abc_def")
    client._fsp_cache = SHARED_FSPS
    return client


def test_requires_a_url(monkeypatch):
    monkeypatch.delenv("FILEGLANCER_URL", raising=False)
    monkeypatch.setenv("FILEGLANCER_TOKEN", "fgt_abc_def")

    with pytest.raises(FileglancerError, match="FILEGLANCER_URL"):
        Fileglancer()


def test_requires_a_token(monkeypatch):
    monkeypatch.setenv("FILEGLANCER_URL", "http://testserver")
    monkeypatch.delenv("FILEGLANCER_TOKEN", raising=False)

    with pytest.raises(FileglancerError, match="FILEGLANCER_TOKEN"):
        Fileglancer()


def test_reads_url_and_token_from_the_environment(monkeypatch):
    monkeypatch.setenv("FILEGLANCER_URL", "http://testserver/")
    monkeypatch.setenv("FILEGLANCER_TOKEN", "fgt_abc_def")

    client = Fileglancer()

    assert str(client._client.base_url) == "http://testserver"
    assert client._client.headers["authorization"] == "Bearer fgt_abc_def"


def test_explicit_arguments_win_over_the_environment(monkeypatch):
    monkeypatch.setenv("FILEGLANCER_URL", "http://from-env")
    monkeypatch.setenv("FILEGLANCER_TOKEN", "fgt_env_env")

    client = Fileglancer(url="http://explicit", token="fgt_x_y")

    assert str(client._client.base_url) == "http://explicit"
    assert client._client.headers["authorization"] == "Bearer fgt_x_y"


@pytest.mark.parametrize("path,expected", [
    ("/nearline/alice/sample.zarr", ("nearline", "alice/sample.zarr")),
    ("/nearline", ("nearline", "")),
    ("/nearline/", ("nearline", "")),
    ("/home/alice/data", ("home", "data")),
    ("smb://store/nearline/alice", ("nearline", "alice")),
    ("\\\\store\\nearline\\alice", ("nearline", "alice")),
    ("  /nearline/alice  ", ("nearline", "alice")),
])
def test_resolves_every_mount_form(fg, path, expected):
    assert fg._resolve(path) == expected


def test_longest_prefix_wins_at_a_shared_boundary(fg):
    # '/misc/public-archive/x' must not resolve to the 'public' share.
    assert fg._resolve("/misc/public-archive/x") == ("public-archive", "x")
    assert fg._resolve("/misc/public/x") == ("public", "x")


def test_partial_segment_does_not_match(fg):
    # '/nearlinex' shares a string prefix with '/nearline' but is a different
    # directory, so it must not resolve.
    with pytest.raises(FileglancerError):
        fg._resolve("/nearlinex/data")


def test_unmatched_path_error_lists_available_mounts(fg):
    with pytest.raises(FileglancerError) as excinfo:
        fg._resolve("/not/a/share/at/all")

    message = str(excinfo.value)
    assert "/not/a/share/at/all" in message
    assert "/nearline" in message
    assert "/home/alice" in message


def test_abspath_round_trips_resolve(fg):
    fsp_name, relative = fg._resolve("/nearline/alice/sample.zarr")

    assert fg.abspath(fsp_name, relative) == "/nearline/alice/sample.zarr"


def test_abspath_of_the_share_root(fg):
    assert fg.abspath("nearline") == "/nearline"


def test_abspath_rejects_an_unknown_share(fg):
    with pytest.raises(FileglancerError, match="Unknown file share"):
        fg.abspath("nosuchshare", "x")


def test_refresh_drops_the_cache(fg):
    assert fg._fsp_cache is not None

    fg.refresh()

    assert fg._fsp_cache is None


def test_error_message_uses_the_servers_error_key(fg):
    """The server rewrites every error body to {"error": ...}, so the message
    must be extracted from that key rather than falling back to raw JSON."""
    def handler(request):
        return httpx.Response(404, json={"error": "Token not found"})

    fg._client = httpx.Client(base_url="http://testserver",
                              transport=httpx.MockTransport(handler))

    with pytest.raises(FileglancerError) as excinfo:
        fg._request("GET", "/api/tokens/nope")

    assert "Token not found" in str(excinfo.value)
    assert "{" not in str(excinfo.value)
    assert excinfo.value.status_code == 404
