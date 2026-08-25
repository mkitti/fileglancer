"""Client data-link and Neuroglancer-link operations."""
import os

import pytest
from fastapi.testclient import TestClient

from conftest import same_path
from fileglancer.client import NEUROGLANCER_URL, Fileglancer, FileglancerError
from fileglancer.database import (
    ProxiedPathDB,
    create_api_token,
    get_file_share_paths,
)

from test_api_token_auth import token_app  # noqa: F401


@pytest.fixture
def fg(token_app):
    app, db_session = token_app
    _, plaintext = create_api_token(db_session, "alice", "test",
                                    ["files:write", "links:write"])
    client = Fileglancer(url="http://testserver", token=plaintext)
    client._client = TestClient(
        app, headers={"Authorization": f"Bearer {plaintext}"})
    yield client
    client.close()


@pytest.fixture
def shared_dir(token_app):
    """A real directory inside the test share, ready to be linked."""
    _, db_session = token_app
    root = get_file_share_paths(db_session)[0].mount_path
    path = os.path.join(root, "sample.zarr")
    os.makedirs(path, exist_ok=True)
    return path


def test_create_data_link_from_an_absolute_path(fg, shared_dir):
    link = fg.create_data_link(shared_dir)

    assert link.fsp_name == "tempdir"
    assert link.sharing_key
    assert str(link.url).endswith("/sample.zarr")


def test_created_data_link_reports_an_absolute_path(fg, shared_dir):
    link = fg.create_data_link(shared_dir)

    assert same_path(link.path, shared_dir)


def test_create_data_link_accepts_a_url_prefix(fg, shared_dir):
    link = fg.create_data_link(shared_dir, url_prefix="custom")

    assert str(link.url).endswith("/custom")


def test_create_data_link_rejects_an_unresolvable_path(fg):
    with pytest.raises(FileglancerError, match="No file share matches"):
        fg.create_data_link("/nowhere/at/all")


def test_list_data_links_reports_absolute_paths(fg, shared_dir):
    fg.create_data_link(shared_dir)

    links = fg.data_links()

    assert len(links) == 1
    assert same_path(links[0].path, shared_dir)


def test_data_links_lists_the_rest_when_one_link_has_a_stale_share(fg, shared_dir, token_app):
    """A link whose file share has since disappeared from the table (e.g.
    the external process that maintains it removed the entry) must not make
    the rest of the listing raise.

    Bypasses create_proxied_path/create_data_link (which validate the share
    exists) to plant a row directly, simulating a share that was valid when
    the link was made but has since been removed from file_share_paths.
    """
    _, db_session = token_app
    real = fg.create_data_link(shared_dir)
    db_session.add(ProxiedPathDB(
        username="alice", sharing_key="stale", sharing_name="stale",
        fsp_name="ghost-share", path="some/relative/path"))
    db_session.commit()

    links = fg.data_links()

    assert {link.fsp_name for link in links} == {real.fsp_name, "ghost-share"}
    stale_link = next(link for link in links if link.fsp_name == "ghost-share")
    assert stale_link.path == "some/relative/path"


def test_get_data_link_by_sharing_key(fg, shared_dir):
    created = fg.create_data_link(shared_dir)

    fetched = fg.data_link(created.sharing_key)

    assert fetched.sharing_key == created.sharing_key
    assert same_path(fetched.path, shared_dir)


def test_delete_data_link(fg, shared_dir):
    created = fg.create_data_link(shared_dir)

    fg.delete_data_link(created.sharing_key)

    assert fg.data_links() == []


def test_create_ng_link_returns_a_neuroglancer_url(fg):
    url = fg.create_ng_link({"layers": []}, title="sample")

    assert url.startswith(NEUROGLANCER_URL + "#!")
    assert "/ng/" in url


def test_create_ng_link_honours_a_custom_url_base(fg):
    url = fg.create_ng_link({"layers": []}, url_base="https://ng.example.com")

    assert url.startswith("https://ng.example.com#!")


def test_create_ng_link_with_a_short_name(fg):
    url = fg.create_ng_link({"layers": []}, short_name="my-view")

    assert url.endswith("/my-view")


def test_list_ng_links(fg):
    fg.create_ng_link({"layers": []}, title="sample")

    links = fg.ng_links()

    assert len(links) == 1


def test_delete_ng_link(fg):
    fg.create_ng_link({"layers": []}, short_name="doomed")
    short_key = fg.ng_links()[0].short_key

    fg.delete_ng_link(short_key)

    assert fg.ng_links() == []


def test_a_files_only_token_cannot_create_a_data_link(token_app, shared_dir):
    app, db_session = token_app
    _, plaintext = create_api_token(db_session, "alice", "files-only",
                                    ["files:write"])
    client = Fileglancer(url="http://testserver", token=plaintext)
    client._client = TestClient(
        app, headers={"Authorization": f"Bearer {plaintext}"})

    with pytest.raises(FileglancerError) as excinfo:
        client.create_data_link(shared_dir)

    assert excinfo.value.status_code == 403
    client.close()
