# HTTPS Proxy for App Services

Date: 2026-08-28

## Problem

Service-type app entry points (`type: service`) run on a compute node, bind a port, and publish `http://$FG_HOSTNAME:$FG_SERVICE_PORT<suffix>` to a `service_url` file in the job work directory. Fileglancer reads that file and renders it as the "Open Service" link on the job detail page.

Two problems with handing that URL to a browser:

1. **Mixed content.** Fileglancer is served over HTTPS. The service link is plain HTTP, so the browser flags it, and the `$FG_SERVICE_TOKEN` that authenticates the session travels in cleartext in the query string.
2. **Unstable, opaque URLs.** The hostname and port change on every launch, so the link is neither memorable nor shareable.

Reachability is explicitly *not* a problem being solved: users can already reach compute nodes directly, and will continue to be able to. Access control is also not a goal — the service's own token remains the only authentication, exactly as today.

## Approach

Address each running service at a per-job subdomain of a wildcard DNS zone, terminated by the existing nginx reverse proxy:

```
https://job-123.services.int.janelia.org/lab?token=abc
  → h11u02.int.janelia.org:41235/lab?token=abc
```

nginx resolves the dynamic `host:port` by asking Fileglancer, then proxies directly. **No proxied bytes pass through Python.** That matters: one of the shipped apps is a noVNC remote desktop, which is effectively a video stream.

### Why subdomains rather than a path prefix

A path prefix (`https://fileglancer/apps/proxy/123/...`) needs no new DNS or certificate, but requires every app to be told its base path and to behave correctly under it:

- JupyterLab (`--ServerApp.base_url`), marimo (`--base-url`) and TensorBoard (`--path_prefix`) have flags for it.
- openvscode-server does not document a subpath configuration; the VS Code web workbench resolves assets from an absolute root. This is the app most likely to be unfixable.
- The noVNC desktop's `path=websockify?token=` handshake needs rewriting on top of that.
- Apps still emit absolute `Location:` redirects and root-scoped `Set-Cookie`, so header rewriting is needed regardless of the flags.
- Every future app — including apps users add, which we do not control — needs its own base-path story.

The proxy core is comparably sized either way. The difference is that a path prefix buys an open-ended per-app debugging tail, while subdomains trade that for a one-time DNS and certificate request. Subdomains also give each app its own cookie jar for free.

### Why nginx rather than a proxy inside Fileglancer

Both are viable. nginx wins on the facts of this deployment:

- nginx already terminates TLS and already carries a `map $http_upgrade $connection_upgrade` block, so WebSocket upgrades pass through with no new code.
- The distribution's nginx is built `--with-http_auth_request_module`, so the dynamic-upstream lookup needs no OpenResty or Lua.
- Uvicorn runs with `--workers 10` behind nginx. Routing app traffic through it would put a remote-desktop video stream on the application server's event loop for no benefit.

Fileglancer's entire contribution is one small endpoint that answers "what is the upstream for this hostname?".

### DNS and certificate constraints

A wildcard certificate matches exactly one label, in the leftmost position only (RFC 6125), and browsers enforce this strictly. The existing `*.int.janelia.org` certificate therefore covers `foo.int.janelia.org` but **not** `job-123.services.int.janelia.org`.

Two shapes are possible, each needing one thing from operations:

| Hostname shape | Certificate | DNS |
| --- | --- | --- |
| `fgapp-123.int.janelia.org` | existing wildcard works | needs a wildcard A record at the `int.janelia.org` apex, which would swallow every mistyped internal hostname — not viable |
| `job-123.services.int.janelia.org` | needs a new `*.services.int.janelia.org` certificate | one wildcard record, scoped to that name |

The second shape is the viable one, and the certificate request is the same process already completed once for a different name.

The DNS side needs no zone delegation. A wildcard may sit at any level (RFC 4592), so one record in the existing `int.janelia.org` zone is sufficient:

```
*.services   IN  A   <fileglancer host IP>
```

Note that a wildcard never matches its own parent, so `services.int.janelia.org` itself is not covered by that record. Add a plain `services IN A` record if the bare alias should resolve; nothing in this design requires it, and the existing `*.int.janelia.org` certificate already covers that name.

Two certificates coexist on one nginx without difficulty: two `server` blocks on port 443, each with its own `ssl_certificate`, selected by SNI. The names cannot collide — `job-123.services.int.janelia.org` is two labels deep and so cannot match `*.int.janelia.org`. `default_server` stays on the primary block.

One thing to confirm before relying on this: a nested wildcard (`*.services.int.janelia.org` issued alongside an existing `*.int.janelia.org`) is routine for public CAs, but some internal PKI policies restrict wildcard depth.

### Shipping dark

The feature is gated on a single setting that is empty by default. With it unset, the published URL is unchanged byte for byte: the raw `http://host:port` URL is published exactly as it is today. Database traffic is not quite as inert, though — the cache write happens whenever a service job publishes a URL, regardless of the setting, so a `RUNNING` service job's detail fetch now also caches `service_url` to the row. The frontend polls the job detail endpoint every 5 seconds while a job is active, so this adds one write per poll. This lets the code merge and be tested before DNS and the certificate exist, and lights up when they land.

## Design

### 1. Persist `service_url` to the database

`auth_request` fires once per HTTP request, and a single JupyterLab page load is dozens of requests. Today `service_url` lives only as a file in the user's NFS home, read through a per-user worker RPC (`fileglancer/server.py:2699`) because root cannot read user files under NFS root squash. A worker round trip plus an NFS read per proxied request is not viable.

Add one nullable column:

```python
# fileglancer/database.py, class JobDB
# Service URL as published by the job to its work directory, cached here so the
# proxy-resolve endpoint can map a hostname to an upstream with a single indexed
# read instead of a per-user worker RPC and an NFS stat per proxied request.
service_url = Column(String, nullable=True)
```

One Alembic migration adds it. Chain it off the current head computed from the revision graph, not a remembered value.

It is written through at the existing read site in `get_job`, where the URL is already being fetched in user context:

```python
service_url = svc_result.get("service_url")
if service_url and service_url != db_job.service_url:
    db_job.service_url = service_url
```

No poll-loop change and no new worker action are needed. The job detail page is where the "Open Service" link lives, so a user cannot obtain the proxied URL without first triggering the write. The stored value survives a server restart, so a bookmarked subdomain keeps working.

The column is never cleared. Staleness is handled at resolve time by the status check, which is a stronger guarantee than clearing.

### 2. Resolve endpoint

```
GET /api/apps/resolve
```

Behavior:

1. Read the `Host` header and match it against `^job-(\d+)\.<service_proxy_domain>$`. No match → `403`.
2. Load the job by id. Missing → `403`.
3. Require `entry_point_type == 'service'`, `status == 'RUNNING'`, and a non-null `service_url`. Otherwise → `403`.
4. Parse the stored URL and extract its netloc.
5. Validate the netloc against `^[A-Za-z0-9.-]+:\d{1,5}$`. No match → `403`.
6. Return `204 No Content` with header `X-Fg-Upstream: <netloc>`.

Three points carry weight:

**The `RUNNING` check is a security control, not a nicety.** Compute-node ports are recycled. Without it, a stale subdomain from a finished job would proxy to whatever service now occupies that port on that node — potentially another user's.

**The netloc regex is the header-injection gate.** nginx performs `proxy_pass http://$upstream` using this header's value, so nothing that fails the pattern is ever echoed. It constrains the authority's *shape* only — hostname and in-range port — not where it points. The value originates from a file the user's own job wrote, so it is untrusted input; the destination is bounded separately. The privilege being withheld is narrow: reaching a service that is reachable *only* from the Fileglancer host. So loopback, the unspecified address and link-local are refused (the app server itself listens on 127.0.0.1:8989, and link-local covers instance metadata), while private and public node addresses are allowed — an address bound to a routable interface is already reachable directly by any cluster user, so proxying to it grants nothing new. The optional `service_proxy_upstream_zone` then confines hostnames to one DNS zone, matched on whole labels; IP literals are exempt from it, since some clusters publish a node's address rather than its name.

**The endpoint is deliberately unauthenticated.** nginx marks its location `internal`, and the main server block returns `404` for the path so it is not reachable from outside. Even if it were reached, it discloses only a `host:port` that the job detail page already displays to the job's owner.

Note that resolve does not check that the requesting user owns the job. It cannot: the browser's session cookie is scoped to the Fileglancer hostname and is not sent to the app subdomain. This is intentional and matches the current security model, where possession of the service token is what grants access. It is also why the token stays in the URL (see below).

### 3. URL rewrite for display

New setting on `AppsSettings` in `fileglancer/settings.py`:

```python
# Wildcard DNS zone serving per-job HTTPS subdomains for running services, e.g.
# "services.example.org" to publish https://job-<id>.services.example.org/. Requires a
# matching wildcard certificate and a reverse proxy configured to resolve
# upstreams via /api/apps/resolve. Empty (the default) publishes the service's
# own http://host:port URL unchanged.
service_proxy_domain: str = ""
```

Settable as `apps.service_proxy_domain` in `config.yaml` or `FGC_APPS__SERVICE_PROXY_DOMAIN` in the environment.

When set, `get_job` swaps scheme and netloc while preserving path, query and fragment verbatim — the query string is what carries the token:

```
http://h11u02:41235/lab?token=abc  →  https://job-123.services.int.janelia.org/lab?token=abc
```

The stored value stays raw, since it is the upstream the proxy needs. Only the value returned to the client is rewritten.

The frontend requires no changes: `JobDetail.tsx` renders whatever `job.service_url` contains.

The setting name and value are deployment configuration. No Janelia hostname, zone, or certificate path appears anywhere in `fileglancer` code or comments; the examples in this document are illustrative of one deployment.

### 4. nginx configuration

Lives in the separate deployment repository, alongside the existing `nginx.conf`. It reuses the `$connection_upgrade` map already defined there.

```nginx
server {
  listen 443 ssl http2;
  server_name ~^job-(?<jobid>\d+)\.services\.int\.janelia\.org$;

  ssl_certificate     /etc/nginx/certs/services-wildcard.crt;
  ssl_certificate_key /etc/nginx/certs/services-wildcard.key;

  location = /_fg_resolve {
    internal;
    proxy_pass              http://127.0.0.1:8989/api/apps/resolve;
    proxy_pass_request_body off;
    proxy_set_header        Content-Length "";
    proxy_set_header        Host $host;
  }

  location / {
    auth_request     /_fg_resolve;
    auth_request_set $upstream $upstream_http_x_fg_upstream;

    resolver 127.0.0.53 valid=30s;
    proxy_pass http://$upstream;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;

    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    proxy_http_version 1.1;
    proxy_buffering    off;
    proxy_read_timeout 3600s;
  }
}
```

Details that are load-bearing:

- **`Host $host`** passes the app subdomain through unchanged, so the app sees `Host` and `Origin` as the same value. This is what makes JupyterLab's WebSocket origin check pass without any per-app configuration.
- **`resolver`** is required because `proxy_pass` targets a variable; without it nginx refuses to start. The address shown is systemd-resolved's stub; use whatever the host actually runs.
- **`proxy_buffering off`** and a long `proxy_read_timeout` suit long-lived streaming and WebSocket sessions.
- The main server block gains `location = /api/apps/resolve { return 404; }` so the endpoint is not reachable on the primary hostname.

The HTTP-to-HTTPS redirect server block is already `default_server` with `server_name _`, so it covers the new subdomains without modification.

## Testing

Backend tests in `tests/`, run with `pixi run -e test test-backend`:

Resolve endpoint:
- Happy path: running service job with a stored URL returns `204` and the correct `X-Fg-Upstream`.
- Job is not a service entry point → `403`.
- Job is not `RUNNING` → `403`. This is the port-recycling case and deserves an explicit test.
- Job has no stored `service_url` → `403`.
- Host does not match the expected pattern, or `service_proxy_domain` is unset → `403`.
- Stored `service_url` has a malformed netloc → `403`, and the response carries no `X-Fg-Upstream` header. This is the SSRF regression test.

URL rewrite:
- Query string and fragment survive the rewrite intact.
- With `service_proxy_domain` empty, `get_job` returns the raw URL unchanged.

Write-through:
- Fetching a running service job persists `service_url` to the row.

nginx cannot be tested here. Verify it by hand once DNS and the certificate exist, against each of the five shipped apps.

## Risks

**Per-app WebSocket origin validation.** Passing `Host $host` should satisfy JupyterLab and marimo, whose checks compare `Origin` against `Host`. openvscode-server and the noVNC desktop cannot be proven until there is real DNS to test against. Verification is cheap once the zone exists and impossible before it. If an app does reject the proxied origin, the fallback is per-app configuration in that app's manifest, not a change to this design.

**One indexed database read per proxied request, cached.** A page load is dozens of resolves, so successful resolutions are held in a bounded TTL cache (10 seconds, 1024 entries) and the endpoint is excluded from the per-request access log, reporting aggregate totals once a minute instead. Refusals are not cached, so a starting service resolves as soon as it publishes. The TTL is the window in which a stopped job can still be proxied, which is why it is seconds rather than minutes. Each uvicorn worker holds its own cache, so expect up to one miss per worker per TTL.

**Configuration split across two repositories.** The setting lives in `fileglancer`, the nginx block in the deployment repository. They must be changed together. Both sides should carry a comment pointing at the other.

## Out of scope

- Authentication at the proxy. The service token remains the only credential.
- Hiding the token from the URL. Doing so requires a subdomain-scoped cookie handshake and proxy-side token injection; it is a real feature with real value, but it is a separate piece of work.
- Sharing a running service with users other than the owner.
- A path-prefix fallback for deployments without wildcard DNS.
- Removing the direct `http://host:port` URL. It remains reachable, and the job's `service_url` file remains visible in the job files panel as a fallback when the proxy misbehaves.
