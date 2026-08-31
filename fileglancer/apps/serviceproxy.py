"""URL helpers for serving app services behind an HTTPS reverse proxy.

A service job publishes ``http://<node>:<port><suffix>`` to its work directory.
When a proxy domain is configured, Fileglancer republishes that as
``https://job-<id>.<proxy_domain><suffix>`` and tells the reverse proxy which
upstream the hostname maps to. These functions are the whole translation layer
between the two forms, kept pure so they can be tested without a database.
"""

import ipaddress
import re
from functools import lru_cache
from typing import Iterable, Optional
from urllib.parse import urlsplit, urlunsplit

# An upstream nginx can hand to proxy_pass: hostname and explicit port, nothing
# else. Deliberately strict — the value is interpolated into a proxy_pass
# directive, so userinfo, whitespace, CR/LF and bracketed IPv6 literals are all
# rejected rather than escaped.
_UPSTREAM_RE = re.compile(r'^([A-Za-z0-9.-]+):(\d{1,5})$')

# Hostnames that always name the local machine, so an upstream naming one would
# aim the proxy at the web host itself rather than at a compute node.
_LOCAL_NAMES = frozenset({'localhost'})


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
        r'job-(\d{1,9})\.' + re.escape(proxy_domain.lower()), hostname)
    if match is None:
        return None
    return int(match.group(1))


def _is_ip_literal(host: str) -> bool:
    """Whether an upstream host is an IP address rather than a DNS name."""
    try:
        ipaddress.ip_address(host.strip().rstrip('.'))
        return True
    except ValueError:
        return False


def _host_matches_zone(host: str, allowed_zone: str) -> bool:
    """Whether an upstream host sits inside the configured allowed zone.

    Matching is on whole DNS labels, not raw text: a plain ``endswith`` would
    let ``evil-nodes.example.org`` satisfy a suffix of ``nodes.example.org``,
    which turns the allowlist into a prefix-guessing game the moment an
    operator omits the leading dot. Writing the suffix with or without that dot
    therefore means the same thing, and the zone's own name is allowed to be
    the upstream. A trailing root dot on either side is insignificant in DNS
    and is ignored here too.

    An IP literal is exempt rather than refused: it has no DNS zone to compare
    against, and some clusters publish a node's address instead of its name, so
    applying a zone here would silently break them. Literals are bounded by
    _is_safe_upstream_host instead.
    """
    if _is_ip_literal(host):
        return True
    zone = allowed_zone.lower().strip().rstrip('.').lstrip('.')
    if not zone:
        return True
    name = host.lower().rstrip('.')
    return name == zone or name.endswith('.' + zone)


@lru_cache(maxsize=8)
def _parse_networks(networks: tuple) -> tuple:
    """Parse CIDR strings once per distinct configuration, not per request.

    Entries are validated at startup, so anything unparseable here is dropped
    rather than raised: this runs on every proxied request, and a config error
    should have already stopped the server.
    """
    parsed = []
    for entry in networks:
        try:
            parsed.append(ipaddress.ip_network(entry.strip(), strict=False))
        except ValueError:
            continue
    return tuple(parsed)


def _host_in_networks(host: str, networks: Iterable[str]) -> bool:
    """Whether an upstream address falls inside one of the allowed networks.

    A hostname is exempt: there is no address to compare without a DNS lookup,
    which this path must not do. Names are governed by the zone check instead,
    so the two settings divide the space between them rather than overlapping.
    """
    allowed = _parse_networks(tuple(networks))
    if not allowed:
        return True
    try:
        addr = ipaddress.ip_address(host.strip().rstrip('.'))
    except ValueError:
        return True
    # Comparing across families raises, so pair each address with its own.
    return any(addr in net for net in allowed if net.version == addr.version)


def _is_safe_upstream_host(host: str) -> bool:
    """Reject upstreams that would aim the proxy at the Fileglancer host itself.

    The upstream comes from a file the user's own job wrote, and the reverse
    proxy dials it from the Fileglancer host rather than from the compute node.
    The privilege that must not be handed out is therefore narrow and specific:
    reaching a service that is *only* reachable from that host.

    In practice that means loopback and the unspecified address, which catch
    anything bound to localhost — the app server itself listens on
    127.0.0.1:8989 — plus link-local, which covers cloud instance-metadata
    endpoints. Multicast and reserved ranges are refused as well; they are not a
    threat, they are simply never a service.

    Private and public addresses are deliberately allowed. Some clusters publish
    a node's IP rather than its hostname, and an address bound to a routable
    interface is already reachable directly by any cluster user, so proxying to
    it grants nothing new. Blocking RFC 1918 would break real deployments to
    prevent nothing.

    Checks are textual and literal-only. Resolving a name here would mean a
    blocking DNS lookup on every proxied request; confining names to one zone is
    the job of service_proxy_upstream_zone.
    """
    name = host.lower().strip().rstrip('.')
    if name in _LOCAL_NAMES or name.endswith('.localhost'):
        return False
    try:
        addr = ipaddress.ip_address(name)
    except ValueError:
        return True  # A DNS name; bounded by the zone check when one is set.
    return not (
        addr.is_loopback or addr.is_unspecified or addr.is_link_local
        or addr.is_multicast or addr.is_reserved
    )


def upstream_from_service_url(service_url: Optional[str],
                              allowed_zone: str = "",
                              allowed_networks: Iterable[str] = ()) -> Optional[str]:
    """Extract a ``host:port`` upstream from a published service URL.

    Returns None unless the authority is exactly a hostname and an in-range
    port. The netloc regex is a header-injection gate — it constrains the
    authority's shape only, since the result is interpolated into the reverse
    proxy's ``proxy_pass`` target. The destination itself (where the proxy
    actually dials) is bounded separately: hosts that reach the Fileglancer host
    itself are rejected; ``allowed_zone``, when set, confines upstreams
    published as hostnames to one DNS zone; and ``allowed_networks``, when
    set, confines upstreams published as addresses to those CIDRs. The two
    allowlists divide the space rather than overlapping, since a bare address
    has no zone and a name has no address without a DNS lookup. All of this
    matters because the source string is a file written by the user's own job.
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
    host = match.group(1)
    if not _is_safe_upstream_host(host):
        return None
    if allowed_zone and not _host_matches_zone(host, allowed_zone):
        return None
    if not _host_in_networks(host, allowed_networks):
        return None
    return netloc
