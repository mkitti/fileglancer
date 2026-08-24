"""Tests for the API token scope table and scope matching.

Both functions under test are pure, so these are plain table-driven tests
with no database or app fixture.
"""
import pytest

from fileglancer.auth import (
    ANY_SCOPE,
    API_SCOPES,
    required_scope,
    token_has_scope,
)


def test_api_scopes_are_exactly_the_six_documented_names():
    assert API_SCOPES == frozenset({
        "files:read", "files:write",
        "links:read", "links:write",
        "jobs:read", "jobs:write",
    })


@pytest.mark.parametrize("path,method,expected", [
    ("/api/files/tempdir", "GET", "files:read"),
    ("/api/files/tempdir", "POST", "files:write"),
    ("/api/files/tempdir", "PATCH", "files:write"),
    ("/api/files/tempdir", "DELETE", "files:write"),
    ("/api/content/tempdir/a.txt", "GET", "files:read"),
    ("/api/content/tempdir/a.txt", "HEAD", "files:read"),
    ("/api/content/tempdir/a.txt", "PUT", "files:write"),
    ("/api/proxied-path", "GET", "links:read"),
    ("/api/proxied-path", "POST", "links:write"),
    ("/api/proxied-path/abc123", "DELETE", "links:write"),
    ("/api/neuroglancer/nglinks", "GET", "links:read"),
    ("/api/neuroglancer/nglinks", "POST", "links:write"),
    ("/api/jobs", "GET", "jobs:read"),
    ("/api/jobs", "POST", "jobs:write"),
    ("/api/jobs/12/cancel", "POST", "jobs:write"),
    ("/api/cluster-defaults", "GET", "jobs:read"),
])
def test_required_scope_maps_path_and_method(path, method, expected):
    assert required_scope(path, method) == expected


@pytest.mark.parametrize("path", ["/api/profile", "/api/auth/status"])
def test_paths_readable_by_any_valid_token(path):
    assert required_scope(path, "GET") == ANY_SCOPE


@pytest.mark.parametrize("path", [
    "/api/ssh-keys",
    "/api/ssh-keys/generate-temp",
    "/api/tokens",
    "/api/tokens/abc123",
    "/api/apps",
    "/api/catalog",
    "/api/preference/foo",
    "/api/ticket",
])
def test_unlisted_paths_are_not_token_reachable(path):
    assert required_scope(path, "GET") is None


def test_prefix_match_does_not_leak_across_similar_paths():
    # "/api/filesystem-admin" must not match the "/api/files" prefix.
    assert required_scope("/api/filesystem-admin", "GET") is None


@pytest.mark.parametrize("granted,required,expected", [
    ("files:read", "files:read", True),
    ("files:read", "files:write", False),
    ("files:write", "files:read", True),      # write implies read
    ("files:write", "files:write", True),
    ("files:read links:write", "links:read", True),
    ("files:read", "links:read", False),
    ("files:write", "jobs:read", False),
    ("", "files:read", False),
])
def test_token_has_scope(granted, required, expected):
    assert token_has_scope(granted, required) is expected


@pytest.mark.parametrize("granted", ["", "files:read", "jobs:write"])
def test_any_scope_is_satisfied_by_any_token(granted):
    assert token_has_scope(granted, ANY_SCOPE) is True
