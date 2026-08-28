# App Service HTTPS Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish each running app service at a per-job HTTPS subdomain (`https://job-123.apps.example.org/...`) that nginx proxies to the service's `host:port` on a compute node.

**Architecture:** nginx terminates TLS for a wildcard zone and asks Fileglancer, via `auth_request`, which upstream a given hostname maps to. Fileglancer's contribution is one unauthenticated resolve endpoint plus a cached `service_url` column, so no proxied bytes pass through Python. The whole feature is gated on a setting that is empty by default; unset, behavior is unchanged.

**Tech Stack:** FastAPI, SQLAlchemy (sync), Alembic, pytest, nginx (`http_auth_request_module`).

**Spec:** `docs/superpowers/specs/2026-08-28-app-service-https-proxy-design.md`

## Global Constraints

- **Always use pixi.** Never call `pytest`, `npm`, or `alembic` directly. Backend tests are `pixi run -e test test-backend -- tests/` — always scope to `tests/`, or pytest will try to collect the whole pixi environment.
- **No Janelia specifics in `fileglancer` code or comments.** Setting names and docstrings stay generic (`example.org` in examples). Real hostnames, zones and certificate paths belong only in the deployment repo.
- **Alembic head is `f2a8c1d94e60`** (`add_api_tokens_table`). The new migration's `down_revision` is that value.
- **`get_db_session()` returns a plain SQLAlchemy Session and does not auto-commit.** Follow the existing convention: mutations live in a `db.*` function in `fileglancer/database.py` that calls `session.commit()` itself, as `update_job` does at `fileglancer/database.py:1194`.
- **The resolve endpoint must never echo a value that fails its netloc pattern.** nginx does `proxy_pass http://$upstream` with that header, so it is an SSRF and header-injection boundary.
- Python 3.12+, no new dependencies.

---

### Task 1: Cache `service_url` in the database

Today `service_url` exists only as a file in the user's NFS home, read through a per-user worker RPC at `fileglancer/server.py:2699`. nginx's `auth_request` fires once per HTTP request, so that path cannot be used for resolution. This task caches the value on the job row, written through at the point it is already being read.

**Files:**
- Modify: `fileglancer/database.py` (add column to `JobDB`, add two module functions)
- Create: `fileglancer/alembic/versions/c3e9b7f41a28_add_job_service_url.py`
- Modify: `fileglancer/server.py:2694-2705` (write-through in `get_job`)
- Create: `tests/test_service_proxy.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `JobDB.service_url: Optional[str]`
  - `db.get_job_by_id(session: Session, job_id: int) -> Optional[JobDB]`
  - `db.set_job_service_url(session: Session, job_id: int, service_url: str) -> None`

- [ ] **Step 1: Write the failing test**

Create `tests/test_service_proxy.py`. This file will grow across Tasks 1, 3 and 4; the fixtures below are copied from `tests/test_job_endpoints.py` and are reused by every later task.

```python
"""Tests for the app service HTTPS proxy: URL caching, rewriting, and resolution."""

import os
import shutil
import tempfile

import pytest
from fastapi.testclient import TestClient

from fileglancer.settings import Settings, AppsSettings
from fileglancer.server import create_app, get_current_user
from fileglancer.database import (
    Base,
    create_engine,
    dispose_engine,
    get_db_session,
    create_job,
    get_job_by_id,
    set_job_service_url,
)

OWNER = "alice"
PROXY_DOMAIN = "apps.example.org"


@pytest.fixture
def temp_dir():
    d = tempfile.mkdtemp()
    yield d
    shutil.rmtree(d)


@pytest.fixture
def settings_factory(temp_dir):
    """Build Settings against a fresh sqlite database, with the proxy domain
    configurable so the same fixtures cover both the on and off cases."""
    def _build(proxy_domain=""):
        db_path = os.path.join(temp_dir, "test.db")
        db_url = f"sqlite:///{db_path}"
        engine = create_engine(db_url)
        Base.metadata.create_all(engine)
        return Settings(
            db_url=db_url,
            file_share_mounts=[],
            cli_mode=True,
            apps=AppsSettings(service_proxy_domain=proxy_domain),
        ), db_url
    return _build


@pytest.fixture
def app_factory(settings_factory):
    """Build the FastAPI app. Patches fileglancer.settings.get_settings because
    database and server code call it directly rather than taking it as an
    argument."""
    built = []

    def _build(proxy_domain=""):
        settings, db_url = settings_factory(proxy_domain)
        import fileglancer.settings
        import fileglancer.database
        original = fileglancer.settings.get_settings
        fileglancer.settings.get_settings = lambda: settings
        fileglancer.database.get_settings = lambda: settings
        fileglancer.database._migrations_run = True
        built.append((db_url, original))
        return create_app(settings), db_url

    yield _build

    import fileglancer.settings
    import fileglancer.database
    for db_url, original in built:
        dispose_engine(db_url)
        fileglancer.settings.get_settings = original
        fileglancer.database.get_settings = original
    fileglancer.database._migrations_run = False


def _seed_service_job(db_url, status="RUNNING", entry_point_type="service"):
    session = get_db_session(db_url)
    try:
        job = create_job(
            session, OWNER, "https://github.com/owner/repo",
            "My App", "serve", "Server", {},
            entry_point_type=entry_point_type,
        )
        job.status = status
        session.commit()
        return job.id
    finally:
        session.close()


def test_set_job_service_url_persists(app_factory):
    _, db_url = app_factory()
    job_id = _seed_service_job(db_url)

    session = get_db_session(db_url)
    try:
        assert get_job_by_id(session, job_id).service_url is None
    finally:
        session.close()

    session = get_db_session(db_url)
    try:
        set_job_service_url(session, job_id, "http://node01:41235/lab?token=abc")
    finally:
        session.close()

    session = get_db_session(db_url)
    try:
        assert get_job_by_id(session, job_id).service_url == "http://node01:41235/lab?token=abc"
    finally:
        session.close()


def test_get_job_by_id_ignores_username(app_factory):
    """Resolution happens with no authenticated user, so the lookup must not
    require one."""
    _, db_url = app_factory()
    job_id = _seed_service_job(db_url)
    session = get_db_session(db_url)
    try:
        assert get_job_by_id(session, job_id).id == job_id
        assert get_job_by_id(session, job_id + 999) is None
    finally:
        session.close()
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pixi run -e test test-backend -- tests/test_service_proxy.py -v
```

Expected: collection error — `ImportError: cannot import name 'get_job_by_id' from 'fileglancer.database'`.

- [ ] **Step 3: Add the column to `JobDB`**

In `fileglancer/database.py`, in `class JobDB`, immediately after the `work_dir_subpath` column (around line 197):

```python
    # Service URL as published by the job to its work directory, cached here so
    # the proxy-resolve endpoint can map a hostname to an upstream with one
    # indexed read, instead of a per-user worker RPC and an NFS stat on every
    # proxied request. NULL until the job publishes a URL and it is first read.
    service_url = Column(String, nullable=True)
```

- [ ] **Step 4: Add the two database functions**

In `fileglancer/database.py`, immediately after `get_job` (which ends at line 1191):

```python
def get_job_by_id(session: Session, job_id: int) -> Optional[JobDB]:
    """Get a job by ID without an ownership check.

    The proxy-resolve endpoint runs with no authenticated user — the browser's
    session cookie is scoped to the Fileglancer hostname and is never sent to an
    app subdomain — so it cannot use get_job(). Callers that do have a user must
    keep using get_job(), which filters by username.
    """
    return session.query(JobDB).filter_by(id=job_id).first()


def set_job_service_url(session: Session, job_id: int, service_url: str) -> None:
    """Cache a job's published service URL on its row."""
    job = session.query(JobDB).filter_by(id=job_id).first()
    if job is None or job.service_url == service_url:
        return
    job.service_url = service_url
    session.commit()
```

- [ ] **Step 5: Create the migration**

Create `fileglancer/alembic/versions/c3e9b7f41a28_add_job_service_url.py`:

```python
"""add service_url to jobs

Revision ID: c3e9b7f41a28
Revises: f2a8c1d94e60
Create Date: 2026-08-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3e9b7f41a28'
down_revision = 'f2a8c1d94e60'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('service_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('jobs', 'service_url')
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
pixi run -e test test-backend -- tests/test_service_proxy.py -v
```

Expected: both tests PASS.

- [ ] **Step 7: Verify the migration applies to a scratch database**

`env.py` ignores `sqlalchemy.url` from the config file; it reads `FILEGLANCER_MIGRATION_DB_URL` or the app settings' `db_url`. Set the env var so this never touches a real database:

```bash
FILEGLANCER_MIGRATION_DB_URL=sqlite:////tmp/claude-990465/-groups-scicompsoft-home-rokickik-dev-fileglancer/434f7bd3-4d05-4a80-8300-30c8cbbcd3f6/scratchpad/migrate_check.db pixi run migrate
```

Expected: alembic logs `Running upgrade f2a8c1d94e60 -> c3e9b7f41a28, add service_url to jobs` and exits 0.

- [ ] **Step 8: Write the failing write-through test**

Append to `tests/test_service_proxy.py`:

```python
def test_get_job_caches_service_url(app_factory, monkeypatch):
    """Opening the job detail page is the only way to obtain a proxied URL, so
    it is where the cache gets populated — no new poll-loop work needed."""
    app, db_url = app_factory()
    job_id = _seed_service_job(db_url)

    async def fake_worker_exec(username, action, **kwargs):
        return {"service_url": "http://node01:41235/lab?token=abc", "phase": "running"}

    import fileglancer.server
    monkeypatch.setattr(fileglancer.server, "_worker_exec", fake_worker_exec)

    app.dependency_overrides[get_current_user] = lambda: OWNER
    client = TestClient(app)
    resp = client.get(f"/api/jobs/{job_id}")
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["service_url"] == "http://node01:41235/lab?token=abc"

    session = get_db_session(db_url)
    try:
        assert get_job_by_id(session, job_id).service_url == "http://node01:41235/lab?token=abc"
    finally:
        session.close()
```

- [ ] **Step 9: Run it to verify it fails**

```bash
pixi run -e test test-backend -- tests/test_service_proxy.py::test_get_job_caches_service_url -v
```

Expected: FAIL — the assertion on the persisted `service_url` gets `None`.

Note: `_worker_exec` is referenced as a module-level name inside `create_app`'s closure, so `monkeypatch.setattr` on the module works. If it turns out to be a closure-local, patch `fileglancer.server._worker_exec` before calling `create_app` instead.

- [ ] **Step 10: Add the write-through**

In `fileglancer/server.py`, inside the `get_job` handler, replace the body of the `try` block (currently lines 2698-2703):

```python
                try:
                    svc_result = await _worker_exec(
                        username, "get_service_url", job_id=job_id,
                        job=serialize_job_for_worker(db_job))
                    service_url = svc_result.get("service_url")
                    phase = svc_result.get("phase")
                    if service_url:
                        # Cache it so /api/apps/resolve can map a proxy hostname
                        # to an upstream without a worker RPC per request.
                        db.set_job_service_url(session, job_id, service_url)
                except Exception:
                    pass
```

- [ ] **Step 11: Run the tests to verify they pass**

```bash
pixi run -e test test-backend -- tests/test_service_proxy.py -v
```

Expected: all three tests PASS.

- [ ] **Step 12: Run the full backend suite for regressions**

```bash
pixi run -e test test-backend -- tests/
```

Expected: no new failures. `tests/test_job_endpoints.py` and `tests/test_database.py` exercise `JobDB` and must still pass.

- [ ] **Step 13: Commit**

```bash
git add fileglancer/database.py fileglancer/server.py fileglancer/alembic/versions/c3e9b7f41a28_add_job_service_url.py tests/test_service_proxy.py
git commit -m "feat: cache a service job's published URL on its row

The proxy-resolve endpoint runs per proxied HTTP request, which rules out
the per-user worker RPC and NFS read that currently fetch service_url.
Write it through where it is already read, on the job detail endpoint."
```

---

### Task 2: Service proxy URL helpers

Three pure functions, in their own module so they can be tested without a database or an HTTP client. Everything that parses or constructs a proxy URL lives here, including the SSRF gate.

**Files:**
- Create: `fileglancer/apps/serviceproxy.py`
- Modify: `fileglancer/apps/__init__.py` (re-export, following the existing style)
- Create: `tests/test_service_proxy_urls.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `build_proxied_service_url(service_url: str, job_id: int, proxy_domain: str) -> Optional[str]`
  - `job_id_from_host(host: str, proxy_domain: str) -> Optional[int]`
  - `upstream_from_service_url(service_url: str) -> Optional[str]`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_service_proxy_urls.py`:

```python
"""Tests for the pure URL helpers behind the app service HTTPS proxy."""

import pytest

from fileglancer.apps.serviceproxy import (
    build_proxied_service_url,
    job_id_from_host,
    upstream_from_service_url,
)

DOMAIN = "apps.example.org"


# --- build_proxied_service_url ---

def test_build_swaps_scheme_and_host_keeping_path_and_query():
    """The query string carries $FG_SERVICE_TOKEN, so it must survive intact."""
    assert build_proxied_service_url(
        "http://node01:41235/lab?token=abc", 123, DOMAIN
    ) == "https://job-123.apps.example.org/lab?token=abc"


def test_build_preserves_fragment():
    assert build_proxied_service_url(
        "http://node01:41235/vnc.html?autoconnect=true#top", 7, DOMAIN
    ) == "https://job-7.apps.example.org/vnc.html?autoconnect=true#top"


def test_build_preserves_bare_root_url():
    assert build_proxied_service_url(
        "http://node01:41235", 7, DOMAIN
    ) == "https://job-7.apps.example.org"


def test_build_returns_none_without_a_proxy_domain():
    """Empty domain is the off switch: callers fall back to the raw URL."""
    assert build_proxied_service_url("http://node01:41235/", 1, "") is None


def test_build_returns_none_for_empty_service_url():
    assert build_proxied_service_url("", 1, DOMAIN) is None
    assert build_proxied_service_url(None, 1, DOMAIN) is None


# --- job_id_from_host ---

def test_job_id_from_host_extracts_id():
    assert job_id_from_host("job-123.apps.example.org", DOMAIN) == 123


def test_job_id_from_host_strips_port_and_case():
    assert job_id_from_host("JOB-123.Apps.Example.Org:443", DOMAIN) == 123


@pytest.mark.parametrize("host", [
    "apps.example.org",              # no job label
    "job-.apps.example.org",         # no digits
    "job-abc.apps.example.org",      # not numeric
    "job-123.evil.example.org",      # wrong zone
    "job-123.apps.example.org.evil", # suffix attack
    "x.job-123.apps.example.org",    # extra label
    "",
])
def test_job_id_from_host_rejects_bad_hosts(host):
    assert job_id_from_host(host, DOMAIN) is None


def test_job_id_from_host_rejects_everything_without_a_domain():
    """Guards against an empty domain turning the pattern into a wildcard."""
    assert job_id_from_host("job-123.apps.example.org", "") is None


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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pixi run -e test test-backend -- tests/test_service_proxy_urls.py -v
```

Expected: collection error — `ModuleNotFoundError: No module named 'fileglancer.apps.serviceproxy'`.

- [ ] **Step 3: Write the implementation**

Create `fileglancer/apps/serviceproxy.py`:

```python
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
    (``job-1.apps.example.org.evil``) nor an extra label
    (``x.job-1.apps.example.org``) is accepted.
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
```

- [ ] **Step 4: Re-export from the apps package**

In `fileglancer/apps/__init__.py`, after the existing `from fileglancer.apps.jobfiles import (...)` block that ends at line 47, add a matching block. The `# noqa: F401` marker is the file's convention for these re-export imports and is required to keep the linter quiet:

```python
from fileglancer.apps.serviceproxy import (  # noqa: F401
    build_proxied_service_url,
    job_id_from_host,
    upstream_from_service_url,
)
```

The package has no `__all__` list, so nothing else needs updating. This re-export is what lets `fileglancer/server.py` call these through its existing `apps_module` alias in Tasks 3 and 4.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
pixi run -e test test-backend -- tests/test_service_proxy_urls.py -v
```

Expected: all PASS. If the bracketed-IPv6 or CR/LF case fails, the regex is wrong — fix the regex, not the test.

- [ ] **Step 6: Commit**

```bash
git add fileglancer/apps/serviceproxy.py fileglancer/apps/__init__.py tests/test_service_proxy_urls.py
git commit -m "feat: add URL helpers for the app service HTTPS proxy

Pure translation between a job's published http://node:port URL and its
https://job-<id>.<domain> proxy form, plus the strict host:port validation
that guards what gets interpolated into the proxy's proxy_pass target."
```

---

### Task 3: The resolve endpoint

The endpoint nginx calls once per proxied request. It answers "which upstream serves this hostname?" and refuses everything else.

**Files:**
- Modify: `fileglancer/settings.py` (add `service_proxy_domain` to `AppsSettings`)
- Modify: `fileglancer/server.py` (add the endpoint after the `get_job` handler, around line 2705)
- Modify: `tests/test_service_proxy.py` (append tests)
- Modify: `docs/config.yaml.template` (document the setting)

**Interfaces:**
- Consumes: `db.get_job_by_id`, `job_id_from_host`, `upstream_from_service_url` from Tasks 1 and 2.
- Produces: `GET /api/apps/resolve` → `204` with header `X-Fg-Upstream: <host>:<port>`, or `403`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_service_proxy.py`:

```python
# --- /api/apps/resolve ---

def _resolve(app, host):
    return TestClient(app).get("/api/apps/resolve", headers={"Host": host})


def _seed_running_service_with_url(db_url, url="http://node01:41235/lab?token=abc"):
    job_id = _seed_service_job(db_url)
    session = get_db_session(db_url)
    try:
        set_job_service_url(session, job_id, url)
    finally:
        session.close()
    return job_id


def test_resolve_returns_upstream(app_factory):
    app, db_url = app_factory(PROXY_DOMAIN)
    job_id = _seed_running_service_with_url(db_url)
    resp = _resolve(app, f"job-{job_id}.{PROXY_DOMAIN}")
    assert resp.status_code == 204
    assert resp.headers["x-fg-upstream"] == "node01:41235"


def test_resolve_rejects_finished_job(app_factory):
    """Compute-node ports get recycled. A stale subdomain must not be proxied to
    whatever service now holds that port on that node."""
    app, db_url = app_factory(PROXY_DOMAIN)
    job_id = _seed_running_service_with_url(db_url)
    session = get_db_session(db_url)
    try:
        get_job_by_id(session, job_id).status = "DONE"
        session.commit()
    finally:
        session.close()
    resp = _resolve(app, f"job-{job_id}.{PROXY_DOMAIN}")
    assert resp.status_code == 403
    assert "x-fg-upstream" not in resp.headers


def test_resolve_rejects_non_service_job(app_factory):
    app, db_url = app_factory(PROXY_DOMAIN)
    job_id = _seed_service_job(db_url, entry_point_type="job")
    session = get_db_session(db_url)
    try:
        set_job_service_url(session, job_id, "http://node01:41235/")
    finally:
        session.close()
    assert _resolve(app, f"job-{job_id}.{PROXY_DOMAIN}").status_code == 403


def test_resolve_rejects_job_without_cached_url(app_factory):
    app, db_url = app_factory(PROXY_DOMAIN)
    job_id = _seed_service_job(db_url)
    assert _resolve(app, f"job-{job_id}.{PROXY_DOMAIN}").status_code == 403


def test_resolve_rejects_unknown_job(app_factory):
    app, db_url = app_factory(PROXY_DOMAIN)
    assert _resolve(app, f"job-999999.{PROXY_DOMAIN}").status_code == 403


@pytest.mark.parametrize("host", [
    "fileglancer.example.org",
    "job-1.evil.example.org",
    "job-abc.apps.example.org",
])
def test_resolve_rejects_bad_hosts(app_factory, host):
    app, db_url = app_factory(PROXY_DOMAIN)
    _seed_running_service_with_url(db_url)
    assert _resolve(app, host).status_code == 403


def test_resolve_disabled_when_no_proxy_domain(app_factory):
    """With the feature off, the endpoint refuses everything."""
    app, db_url = app_factory("")
    job_id = _seed_running_service_with_url(db_url)
    assert _resolve(app, f"job-{job_id}.{PROXY_DOMAIN}").status_code == 403


def test_resolve_rejects_malformed_cached_url(app_factory):
    """SSRF regression test: the cached value comes from a file the user's own
    job wrote, and the result is interpolated into the proxy's proxy_pass."""
    app, db_url = app_factory(PROXY_DOMAIN)
    job_id = _seed_running_service_with_url(
        db_url, url="http://evil.example.org:80\r\nX-Injected: 1/")
    resp = _resolve(app, f"job-{job_id}.{PROXY_DOMAIN}")
    assert resp.status_code == 403
    assert "x-fg-upstream" not in resp.headers
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pixi run -e test test-backend -- tests/test_service_proxy.py -v
```

Expected: the resolve tests fail. Most return `404` (no such route); `test_resolve_disabled_when_no_proxy_domain` may pass incidentally — that is fine, it is guarding the off switch.

Note: if `Settings(apps=AppsSettings(service_proxy_domain=...))` raises before this step, add the setting from Step 3 first and re-run.

- [ ] **Step 3: Add the setting**

In `fileglancer/settings.py`, in `class AppsSettings`, after `unknown_timeout_hours`:

```python
    # Wildcard DNS zone serving per-job HTTPS subdomains for running services,
    # e.g. "apps.example.org" to publish https://job-<id>.apps.example.org/.
    # Requires a matching wildcard certificate and a reverse proxy configured to
    # resolve upstreams via GET /api/apps/resolve; see
    # docs/superpowers/specs/2026-08-28-app-service-https-proxy-design.md.
    # Empty (the default) publishes the service's own http://host:port URL
    # unchanged.
    service_proxy_domain: str = ""
```

Settable as `apps.service_proxy_domain` in `config.yaml` or `FGC_APPS__SERVICE_PROXY_DOMAIN` in the environment.

- [ ] **Step 4: Add the endpoint**

In `fileglancer/server.py`, immediately after the `get_job` handler ends (after the `return _convert_job(...)` at line 2705), add:

```python
    @app.get("/api/apps/resolve", include_in_schema=False)
    async def resolve_service_upstream(request: Request):
        """Map a service proxy hostname to its upstream, for the reverse proxy.

        Called once per proxied request via nginx's auth_request, so it must stay
        a single indexed read. Deliberately unauthenticated: the session cookie
        is scoped to the Fileglancer hostname and is never sent to an app
        subdomain, so there is no user to check. It discloses only a host:port
        that the job's detail page already shows, and the reverse proxy marks its
        location `internal` so it is not reachable from outside.

        Returns 204 with X-Fg-Upstream on success and 403 for everything else, so
        auth_request denies the request.
        """
        # ponytail: one indexed read per proxied request. If this ever shows up
        # in profiling, wrap it in a short TTL cache keyed by job id.
        proxy_domain = settings.apps.service_proxy_domain
        job_id = apps_module.job_id_from_host(
            request.headers.get('host'), proxy_domain)
        if job_id is None:
            raise HTTPException(status_code=403, detail="Not a service proxy host")

        with db.get_db_session(settings.db_url) as session:
            db_job = db.get_job_by_id(session, job_id)
            if (db_job is None
                    or getattr(db_job, 'entry_point_type', 'job') != 'service'
                    or db_job.status != 'RUNNING'):
                raise HTTPException(status_code=403, detail="No running service for this host")
            upstream = apps_module.upstream_from_service_url(db_job.service_url)

        if upstream is None:
            raise HTTPException(status_code=403, detail="No usable upstream for this host")

        return Response(status_code=204, headers={"X-Fg-Upstream": upstream})
```

`Response`, `Request` and `HTTPException` are all already imported at `fileglancer/server.py:24-26`. No new imports are needed.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
pixi run -e test test-backend -- tests/test_service_proxy.py -v
```

Expected: all PASS.

- [ ] **Step 6: Document the setting**

The whole `apps:` block in `docs/config.yaml.template` is commented out and uses a trailing-comment column. Append to it, directly after the `unknown_timeout_hours` entry that currently ends at line 195:

```
#   service_proxy_domain: apps.example.org
#                               # Wildcard DNS zone serving per-job HTTPS
#                               # subdomains for running services. When set, a
#                               # service is published at
#                               # https://job-<id>.<zone>/ instead of its own
#                               # http://<node>:<port>/ URL. Needs a wildcard
#                               # certificate for the zone and a reverse proxy
#                               # resolving upstreams via /api/apps/resolve;
#                               # see docs/ServiceProxy.md. Empty = direct URL.
```

- [ ] **Step 7: Check the config template test still passes**

`tests/test_config_template.py` validates the template against `Settings`.

```bash
pixi run -e test test-backend -- tests/test_config_template.py -v
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add fileglancer/settings.py fileglancer/server.py tests/test_service_proxy.py docs/config.yaml.template
git commit -m "feat: add /api/apps/resolve for the service HTTPS proxy

Maps a job-<id>.<zone> hostname to the service's host:port upstream for a
reverse proxy's auth_request. Refuses anything that is not a RUNNING
service job with a well-formed cached upstream."
```

---

### Task 4: Publish the proxied URL

The user-visible half. With a proxy domain configured, the job detail endpoint returns the HTTPS subdomain instead of the raw URL. The frontend needs no changes — `JobDetail.tsx:724` renders whatever `job.service_url` contains.

**Files:**
- Modify: `fileglancer/server.py:2694-2705` (rewrite before returning)
- Modify: `tests/test_service_proxy.py` (append tests)

**Interfaces:**
- Consumes: `build_proxied_service_url` from Task 2; the write-through from Task 1.
- Produces: `GET /api/jobs/{id}` returns a rewritten `service_url` when `apps.service_proxy_domain` is set.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_service_proxy.py`:

```python
# --- proxied URL publication ---

def _get_job_with_worker_url(app, job_id, url, monkeypatch):
    async def fake_worker_exec(username, action, **kwargs):
        return {"service_url": url, "phase": "running"}

    import fileglancer.server
    monkeypatch.setattr(fileglancer.server, "_worker_exec", fake_worker_exec)
    app.dependency_overrides[get_current_user] = lambda: OWNER
    try:
        return TestClient(app).get(f"/api/jobs/{job_id}")
    finally:
        app.dependency_overrides.clear()


def test_job_detail_publishes_proxied_url(app_factory, monkeypatch):
    app, db_url = app_factory(PROXY_DOMAIN)
    job_id = _seed_service_job(db_url)
    resp = _get_job_with_worker_url(
        app, job_id, "http://node01:41235/lab?token=abc", monkeypatch)
    assert resp.status_code == 200
    assert resp.json()["service_url"] == \
        f"https://job-{job_id}.{PROXY_DOMAIN}/lab?token=abc"


def test_job_detail_publishes_raw_url_when_proxy_disabled(app_factory, monkeypatch):
    """The off switch: unchanged behavior, byte for byte."""
    app, db_url = app_factory("")
    job_id = _seed_service_job(db_url)
    resp = _get_job_with_worker_url(
        app, job_id, "http://node01:41235/lab?token=abc", monkeypatch)
    assert resp.json()["service_url"] == "http://node01:41235/lab?token=abc"


def test_job_detail_caches_the_raw_url_not_the_proxied_one(app_factory, monkeypatch):
    """The cached value is the upstream, so it must stay in its raw form."""
    app, db_url = app_factory(PROXY_DOMAIN)
    job_id = _seed_service_job(db_url)
    _get_job_with_worker_url(
        app, job_id, "http://node01:41235/lab?token=abc", monkeypatch)
    session = get_db_session(db_url)
    try:
        assert get_job_by_id(session, job_id).service_url == \
            "http://node01:41235/lab?token=abc"
    finally:
        session.close()
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pixi run -e test test-backend -- tests/test_service_proxy.py -v
```

Expected: `test_job_detail_publishes_proxied_url` FAILS (returns the raw URL). The other two PASS already — they are regression guards.

- [ ] **Step 3: Add the rewrite**

In `fileglancer/server.py`, in the `get_job` handler, replace the final `return` (line 2705):

```python
            # The cached value stays raw — it is the proxy's upstream. Only what
            # goes back to the browser is rewritten.
            proxied = apps_module.build_proxied_service_url(
                service_url, job_id, settings.apps.service_proxy_domain)
            return _convert_job(db_job, service_url=proxied or service_url,
                                files=files, phase=phase)
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pixi run -e test test-backend -- tests/test_service_proxy.py -v
```

Expected: all PASS.

- [ ] **Step 5: Run the full backend suite**

```bash
pixi run -e test test-backend -- tests/
```

Expected: no new failures.

- [ ] **Step 6: Commit**

```bash
git add fileglancer/server.py tests/test_service_proxy.py
git commit -m "feat: publish service jobs at their HTTPS proxy URL

When apps.service_proxy_domain is set, the job detail endpoint returns
https://job-<id>.<zone> with the path and query carried over verbatim, so
the service's own token still authenticates. Unset, nothing changes."
```

---

### Task 5: Deployment configuration

nginx lives in a separate repository, so this task is a documented handoff rather than code in this one. It cannot be verified until DNS and the certificate exist.

**Files:**
- Create: `docs/ServiceProxy.md`
- Modify: `../fileglancer-hub/nginx.conf` (separate repository — a separate commit and pull request there)

- [ ] **Step 1: Write the operator documentation**

Create `docs/ServiceProxy.md`:

````markdown
# HTTPS Proxy for App Services

Running app services (`type: service`) bind a port on a compute node and publish `http://<node>:<port>/...`. Set `apps.service_proxy_domain` to republish them over HTTPS at a per-job subdomain instead.

Design rationale: `docs/superpowers/specs/2026-08-28-app-service-https-proxy-design.md`.

## What you need

- A wildcard DNS record for the zone, e.g. `*.apps.example.org`, pointing at the Fileglancer host.
- A wildcard TLS certificate for that zone. Note that a wildcard certificate matches exactly one label: a certificate for `*.example.org` does **not** cover `job-1.apps.example.org`. The certificate must name the zone you actually use.
- A reverse proxy with `http_auth_request_module` compiled in (`nginx -V | grep auth_request`).

## Fileglancer configuration

```yaml
apps:
  service_proxy_domain: "apps.example.org"
```

Leave it empty to disable; the direct `http://<node>:<port>` URL is then published unchanged.

## Reverse proxy configuration

Fileglancer does not proxy the traffic itself. It exposes `GET /api/apps/resolve`, which reads the `Host` header and answers `204` with `X-Fg-Upstream: <host>:<port>`, or `403`. The reverse proxy resolves each request through it and connects to the upstream directly, so no proxied bytes pass through the application server.

Add a server block for the wildcard zone. This assumes a `map $http_upgrade $connection_upgrade` block already exists at the http level:

```nginx
server {
  listen 443 ssl http2;
  server_name ~^job-\d+\.apps\.example\.org$;

  ssl_certificate     /etc/nginx/certs/apps-wildcard.crt;
  ssl_certificate_key /etc/nginx/certs/apps-wildcard.key;

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

Three details are load-bearing:

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
````

- [ ] **Step 2: Commit the documentation**

```bash
git add docs/ServiceProxy.md
git commit -m "docs: document the app service HTTPS proxy setup"
```

- [ ] **Step 3: Link it from the development guide**

Two indexes need the entry:

In `CLAUDE.md`, under "Related Documentation", add:

```markdown
- [Service Proxy Guide](docs/ServiceProxy.md)
```

In `docs/Development.md`, under "Other documentation" (line 280, currently a single-item list), add:

```markdown
- [HTTPS proxy for app services](ServiceProxy.md)
```

```bash
git add CLAUDE.md docs/Development.md
git commit -m "docs: link the service proxy guide"
```

- [ ] **Step 4: Prepare the deployment repository change**

This is a separate repository (`../fileglancer-hub`) and therefore a separate commit and pull request. Do not commit it as part of this work unless explicitly asked.

Apply the server block from `docs/ServiceProxy.md` to `nginx.conf`, substituting the real zone and certificate paths, and add the `location = /api/apps/resolve { return 404; }` line to the existing main server block. Add a comment in `nginx.conf` pointing at `docs/ServiceProxy.md` in this repository, since the two must change together.

Validate before reloading:

```bash
nginx -t
```

- [ ] **Step 5: Report what remains**

The feature ships dark. Report to the user that the code is merged and inert, and that lighting it up requires, in order: the wildcard DNS record, the wildcard certificate, the nginx block, and finally setting `apps.service_proxy_domain`. Per-app WebSocket verification can only happen after all four.
