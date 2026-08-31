"""Tests for the pure URL helpers behind the app service HTTPS proxy."""

import pytest

from fileglancer.apps.serviceproxy import (
    build_proxied_service_url,
    job_id_from_host,
    upstream_from_service_url,
)

DOMAIN = "services.example.org"


# --- build_proxied_service_url ---

def test_build_swaps_scheme_and_host_keeping_path_and_query():
    """The query string carries $FG_SERVICE_TOKEN, so it must survive intact."""
    assert build_proxied_service_url(
        "http://node01:41235/lab?token=abc", 123, DOMAIN
    ) == "https://job-123.services.example.org/lab?token=abc"


def test_build_preserves_fragment():
    assert build_proxied_service_url(
        "http://node01:41235/vnc.html?autoconnect=true#top", 7, DOMAIN
    ) == "https://job-7.services.example.org/vnc.html?autoconnect=true#top"


def test_build_preserves_bare_root_url():
    assert build_proxied_service_url(
        "http://node01:41235", 7, DOMAIN
    ) == "https://job-7.services.example.org"


def test_build_returns_none_without_a_proxy_domain():
    """Empty domain is the off switch: callers fall back to the raw URL."""
    assert build_proxied_service_url("http://node01:41235/", 1, "") is None


def test_build_returns_none_for_empty_service_url():
    assert build_proxied_service_url("", 1, DOMAIN) is None
    assert build_proxied_service_url(None, 1, DOMAIN) is None


# --- job_id_from_host ---

def test_job_id_from_host_extracts_id():
    assert job_id_from_host("job-123.services.example.org", DOMAIN) == 123


def test_job_id_from_host_strips_port_and_case():
    assert job_id_from_host("JOB-123.services.example.org:443", DOMAIN) == 123


@pytest.mark.parametrize("host", [
    "services.example.org",              # no job label
    "job-.services.example.org",         # no digits
    "job-abc.services.example.org",      # not numeric
    "job-123.evil.example.org",      # wrong zone
    "job-123.services.example.org.evil", # suffix attack
    "x.job-123.services.example.org",    # extra label
    "",
])
def test_job_id_from_host_rejects_bad_hosts(host):
    assert job_id_from_host(host, DOMAIN) is None


def test_job_id_from_host_rejects_everything_without_a_domain():
    """Guards against an empty domain turning the pattern into a wildcard."""
    assert job_id_from_host("job-123.services.example.org", "") is None


# --- upstream_from_service_url ---

def test_upstream_extracts_host_and_port():
    assert upstream_from_service_url("http://node01:41235/lab?token=abc") == "node01:41235"


def test_upstream_accepts_fqdn():
    assert upstream_from_service_url("http://node01.cluster.example.org:8080/") == \
        "node01.cluster.example.org:8080"


@pytest.mark.parametrize("url", [
    "http://node01/lab",                     # no port: nothing to proxy to
    "http://user:pw@node01:41235/",          # userinfo
    "http://node01:41235x/",                 # non-numeric port
    "http://node01:99999/",                  # port out of range
    "http://node01:0/",                      # port 0
    "http://[::1]:8080/",                    # bracketed IPv6, unsupported upstream form
    "http://node01:8080\r\nX-Evil: 1/",      # header injection attempt
    "not a url",
    "",
])
def test_upstream_rejects_unproxyable_urls(url):
    """This is the SSRF and header-injection gate: nginx interpolates the result
    straight into proxy_pass, so anything unexpected must yield None."""
    assert upstream_from_service_url(url) is None
