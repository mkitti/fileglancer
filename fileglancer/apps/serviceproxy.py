"""URL helpers for serving app services behind an HTTPS reverse proxy.

A service job publishes ``http://<node>:<port><suffix>`` to its work directory.
When a proxy domain is configured, Fileglancer republishes that as
``https://job-<id>.<proxy_domain><suffix>`` and tells the reverse proxy which
upstream the hostname maps to. These functions are the whole translation layer
between the two forms, kept pure so they can be tested without a database.
"""

import re
from typing import Optional
from urllib.parse import urlsplit, urlunsplit

# An upstream nginx can hand to proxy_pass: hostname and explicit port, nothing
# else. Deliberately strict — the value is interpolated into a proxy_pass
# directive, so userinfo, whitespace, CR/LF and bracketed IPv6 literals are all
# rejected rather than escaped.
_UPSTREAM_RE = re.compile(r'^([A-Za-z0-9.-]+):(\d{1,5})$')


def build_proxied_service_url(service_url: Optional[str], job_id: int,
                              proxy_domain: str) -> Optional[str]:
    """Rewrite a published service URL to its HTTPS proxy form.

    Path, query and fragment are carried over verbatim: the query string holds
    the service's own access token, which remains the only credential.

    Returns None when there is nothing to rewrite or no proxy domain is
    configured, in which case the caller should publish the URL unchanged.
    """
    if not service_url or not proxy_domain:
        return None
    parts = urlsplit(service_url)
    return urlunsplit((
        'https',
        f'job-{job_id}.{proxy_domain}',
        parts.path,
        parts.query,
        parts.fragment,
    ))


def job_id_from_host(host: Optional[str], proxy_domain: str) -> Optional[int]:
    """Extract the job id from a proxy hostname, or None if it isn't one.

    Matches the whole hostname, so neither a longer suffix
    (``job-1.services.example.org.evil``) nor an extra label
    (``x.job-1.services.example.org``) is accepted.
    """
    if not host or not proxy_domain:
        return None
    # $host in nginx normally omits the port, but a client can send one.
    hostname = host.split(':', 1)[0].strip().lower()
    match = re.fullmatch(
        r'job-(\d+)\.' + re.escape(proxy_domain.lower()), hostname)
    if match is None:
        return None
    return int(match.group(1))


def upstream_from_service_url(service_url: Optional[str]) -> Optional[str]:
    """Extract a ``host:port`` upstream from a published service URL.

    Returns None unless the authority is exactly a hostname and an in-range
    port. This is a security boundary, not a convenience: the result is
    interpolated into the reverse proxy's ``proxy_pass`` target, and the source
    string is a file written by the user's own job.
    """
    if not service_url:
        return None
    try:
        netloc = urlsplit(service_url).netloc
    except ValueError:
        return None
    match = _UPSTREAM_RE.fullmatch(netloc)
    if match is None:
        return None
    port = int(match.group(2))
    if not 1 <= port <= 65535:
        return None
    return netloc
