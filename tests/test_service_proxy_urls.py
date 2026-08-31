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
    assert job_id_from_host("JOB-123.Services.Example.Org:443", DOMAIN) == 123


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


def test_job_id_from_host_rejects_absurd_job_id():
    """An unbounded digit run used to reach int()'s 4300-digit limit and raise,
    turning a bogus hostname into a 500 with a traceback instead of a refusal."""
    assert job_id_from_host(f"job-{'9' * 5000}.{DOMAIN}", DOMAIN) is None


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
    """This is the header-injection gate: nginx interpolates the result straight
    into proxy_pass, so anything unexpected must yield None. It constrains the
    authority's shape only — see the loopback/link-local and allowlist tests
    below for what bounds the destination."""
    assert upstream_from_service_url(url) is None


@pytest.mark.parametrize("url", [
    "http://127.0.0.1:8989/",
    "http://127.1.2.3:8989/",
    "http://localhost:8989/",
    "http://LOCALHOST:8989/",
    "http://foo.localhost:8989/",
    "http://169.254.169.254:80/",
    "http://0.0.0.0:8080/",
    "http://224.0.0.1:8080/",
])
def test_upstream_rejects_hosts_aimed_at_the_web_tier(url):
    """The upstream comes from a file the user's job wrote and is dialed by the
    reverse proxy from the Fileglancer host, so a loopback or link-local target
    would reach services no cluster user can reach directly."""
    assert upstream_from_service_url(url) is None


def test_upstream_suffix_allowlist_accepts_matching_host():
    assert upstream_from_service_url(
        "http://node01.nodes.example.org:41235/lab",
        allowed_suffix=".nodes.example.org") == "node01.nodes.example.org:41235"


def test_upstream_suffix_allowlist_rejects_other_hosts():
    assert upstream_from_service_url(
        "http://evil.example.org:41235/", allowed_suffix=".nodes.example.org") is None


def test_upstream_suffix_allowlist_is_case_insensitive():
    assert upstream_from_service_url(
        "http://NODE01.Nodes.Example.Org:41235/",
        allowed_suffix=".nodes.example.org") == "NODE01.Nodes.Example.Org:41235"
