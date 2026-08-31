# HTTPS Proxy for App Services

Running app services (`type: service`) bind a port on a compute node and publish `http://<node>:<port>/...`. Set `apps.service_proxy_domain` to republish them over HTTPS at a per-job subdomain instead.

Design rationale: `docs/superpowers/specs/2026-08-28-app-service-https-proxy-design.md`.

## What you need

- **A wildcard DNS record for the zone**, e.g. `*.services.example.org`, pointing at the Fileglancer host. No zone delegation is required — a wildcard may sit at any level (RFC 4592), so one record in the parent zone is enough:

  ```
  *.services   IN  A   <fileglancer host IP>
  ```

  A wildcard never matches its own parent, so this does not make `services.example.org` itself resolve. Add a plain `services IN A` record if you want the bare alias to work; the proxy does not need it.

- **A wildcard TLS certificate for that zone.** A wildcard matches exactly one label, so a certificate for `*.example.org` does **not** cover `job-1.services.example.org` — it must name the zone you actually use. If the host already serves a `*.example.org` certificate, the two coexist fine: two `server` blocks on port 443, each with its own `ssl_certificate`, selected by SNI. Leave `default_server` on the primary block.

- **A reverse proxy with `http_auth_request_module`** compiled in (`nginx -V | grep auth_request`).

## Fileglancer configuration

```yaml
apps:
  service_proxy_domain: "services.example.org"
```

Leave it empty to disable; the direct `http://<node>:<port>` URL is then published unchanged.

## Reverse proxy configuration

Fileglancer does not proxy the traffic itself. It exposes `GET /api/apps/resolve`, which reads the `Host` header and answers `204` with `X-Fg-Upstream: <host>:<port>`, or `403`. The reverse proxy resolves each request through it and connects to the upstream directly, so no proxied bytes pass through the application server.

Add a server block for the wildcard zone. This assumes a `map $http_upgrade $connection_upgrade` block already exists at the http level:

```nginx
server {
  listen 443 ssl http2;
  server_name ~^job-\d+\.services\.example\.org$;

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

    # Required because proxy_pass targets a variable. Use whatever resolver the
    # host actually runs; 127.0.0.53 is systemd-resolved's stub.
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

Also add this to the **main** server block, so the resolve endpoint is not reachable on the primary hostname:

```nginx
  location = /api/apps/resolve { return 404; }
```

Four details are load-bearing:

- **`internal;`** on the `/_fg_resolve` location makes it reachable only from nginx's own `auth_request` subrequest, never from a client. Together with the `return 404` in the main server block, it is what keeps the unauthenticated resolve endpoint off the network. Do not remove either.
- **`proxy_set_header Host $host`** passes the app subdomain through unchanged, so the app sees `Host` and `Origin` as the same value. This is what makes JupyterLab's WebSocket origin check pass without per-app configuration.
- **`resolver`** is mandatory. Without it nginx refuses to start when `proxy_pass` targets a variable.
- **`proxy_buffering off`** and the long `proxy_read_timeout` suit long-lived WebSocket and streaming sessions, such as the remote desktop app.

The existing HTTP-to-HTTPS redirect block is typically `default_server` with `server_name _`, in which case it already covers the new subdomains.

## Verification

Once DNS and the certificate are in place, launch each service app and confirm it loads and stays connected. WebSocket behavior is the thing to watch:

- JupyterLab — kernel connects, a cell executes.
- marimo — the notebook is interactive, not stuck "connecting".
- OpenVSCode — the editor loads and a terminal opens.
- Remote Desktop — the noVNC canvas renders and accepts input.
- TensorBoard — plots load.

If an app rejects the proxied origin, fix it in that app's manifest (most servers have an allowed-origin or base-URL option); do not weaken the proxy configuration.

## Residual risks

- Set `apps.service_proxy_upstream_suffix`. Without it the proxy will dial any host the Fileglancer host can reach, because the upstream comes from a file the user's job wrote. Loopback, link-local, multicast and reserved addresses are always refused, but a suffix is what actually confines the proxy to cluster nodes.
- Per-job subdomains make a running service much cheaper to *find* — `https://job-<small number>.<zone>/` instead of port-scanning compute nodes — and the proxy vhost is reachable from wherever the Fileglancer HTTPS host is. The service's own token is still the only credential, but weigh this before exposing the vhost on a wide network.
- The resolve endpoint is called once per proxied HTTP request and each call produces an access-log line, so a single page load of an app like JupyterLab generates dozens. Expect the volume if you ship access logs to a log aggregator.
- A service that manages its own URL (`auto_url` unset) should write its URL file exactly once. The cached upstream is refreshed only while someone has the job's detail page open, so a URL that changes mid-run can go stale.
