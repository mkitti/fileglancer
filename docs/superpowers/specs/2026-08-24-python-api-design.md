# Python API and API Tokens — Design

Status: approved, not yet implemented
Date: 2026-08-24

## Goal

Let users drive Fileglancer programmatically: create an API token in the GUI, then use it from a Python script or notebook to browse files, create data links, and turn those data links into Neuroglancer links.

The motivating workflow is: create a data link for a folder, build a Neuroglancer state from it with the `neuroglancer` Python package, and shorten that state into an NG link.

This adds **one new auth mechanism** and **one new client library**. It does not add, duplicate, or reshape any existing REST endpoint. Everything the Python client does, it does by calling the same HTTP API the web UI calls.

## Non-goals

- OAuth device flow or any interactive login from the client.
- Per-token rate limiting.
- Scopes for apps, catalog, tickets, preferences, or SSH keys — those stay browser-session-only.
- An async client.
- A separate `fileglancer-client` distribution. The client ships inside the `fileglancer` package alongside the CLI.

---

## 1. Token storage and verification

### Table

New table `api_tokens`, added by an Alembic migration whose `down_revision` is `e7b2a9c4f130` (the current head, `add_name_to_jobs`).

| column | type | notes |
| --- | --- | --- |
| `id` | Integer PK | autoincrement |
| `token_id` | String | 12-char public identifier, unique, indexed |
| `token_hash` | String | SHA-256 hex of the secret half |
| `username` | String | owner, indexed |
| `name` | String | user-supplied label, e.g. "laptop notebook" |
| `scopes` | String | space-separated, e.g. `files:read links:write` |
| `created_at` | DateTime | |
| `expires_at` | DateTime | non-null; see lifetime rules |
| `last_used_at` | DateTime | nullable |

Follows the `SessionDB` pattern in `fileglancer/database.py` — a model class plus module-level `create_api_token` / `get_api_token_by_id` / `list_api_tokens` / `delete_api_token` / `touch_api_token` functions.

### Token format

```
fgt_<token_id>_<secret>
```

`token_id` is 12 characters, `secret` is `secrets.token_urlsafe(32)`. The `token_id` gives an indexed single-row lookup; the secret is then compared with `hmac.compare_digest(sha256(secret), row.token_hash)`.

The full token string is returned exactly once, from `POST /api/tokens`. It is never stored and never recoverable.

> `ponytail:` SHA-256 rather than bcrypt/argon2. The secret is 32 bytes of `secrets` entropy, not a human-chosen password, so a slow KDF defends against nothing that matters here. Upgrade to a KDF only if user-chosen token secrets ever become a thing.

### Lifetime

`expires_at` is always set. The client picks the window at creation time; the server validates it.

- Default: 30 days.
- Maximum: 365 days. A request above the maximum is rejected with 400.
- No "never expires" option.

Verification rejects an expired token with 401 and a message naming the expiry date, so the failure is self-explanatory in a script's traceback. Expired rows are not auto-deleted; they stay visible in the GUI list marked expired until the user revokes them.

### Where it plugs in

`auth.get_current_user(request, settings)` in `fileglancer/auth.py:170` grows a single branch:

1. If an `Authorization: Bearer fgt_…` header is present, resolve it to a username via a new `auth.get_user_from_token()`, enforce scope (section 2), and return the username.
2. Otherwise, fall back to the existing cookie path unchanged.

Because every one of the ~55 authenticated routes already goes through the single `Depends(get_current_user)` dependency at `fileglancer/server.py:173`, no route needs editing. Token auth resolves to a username, and everything downstream — per-user worker dispatch, setuid file access, ownership checks on data links — behaves exactly as it does for a browser session.

`server.get_current_user` skips `auth.enforce_request_origin` when the request carries a bearer token. Origin enforcement exists to stop a same-site page from riding an ambient session cookie; a bearer token is not ambient, and a script sends no `Origin` header at all.

`last_used_at` is written only when the stored value is more than 5 minutes stale, so token auth does not cost a database write per request.

---

## 2. Scopes

Six scopes across three resources. `:write` implies `:read`.

```
files:read   files:write
links:read   links:write
jobs:read    jobs:write
```

### Enforcement

Annotating 55 routes with a `require_scope` dependency would be 55 places to get wrong. Instead there is one path-prefix table, consulted in the same place the token is resolved — it has both the request path and the method available.

| prefix | resource |
| --- | --- |
| `/api/files`, `/api/content` | `files` |
| `/api/proxied-path`, `/api/neuroglancer` | `links` |
| `/api/jobs`, `/api/cluster-defaults` | `jobs` |
| `/api/profile`, `/api/auth/status` | any valid token |
| anything else | 403 |

`GET` and `HEAD` require `:read`; every other method requires `:write`.

`/api/file-share-paths`, `/api/external-buckets`, and `/api/version` are deliberately absent: they have no `Depends(get_current_user)` today and are already fully unauthenticated, so the scope check never runs for them. This matters for the client, whose path resolution depends on `/api/file-share-paths` — resolution works regardless of which scopes a token carries.

Deny-by-default is what makes this safe. It is why `/api/ssh-keys`, `/api/tokens`, `/api/apps`, `/api/catalog`, `/api/preference`, and `/api/ticket` are unreachable by token without any of them being named — including the important case that **a token cannot mint another token**.

The table is consulted only for bearer auth. Cookie sessions are entirely unaffected.

### Guarding against drift

A test enumerates `app.routes` and asserts that every `/api/*` path that depends on `get_current_user` either matches a prefix in the table or appears on an explicit session-only list. A new route added later cannot silently become token-reachable, and cannot silently break for token users either — one of the two lists must be updated, deliberately.

---

## 3. Token management: endpoints and GUI

### Endpoints

- `GET /api/tokens` — list the caller's tokens. Returns `token_id`, `name`, `scopes`, `created_at`, `expires_at`, `last_used_at`. Never returns a secret or a hash.
- `POST /api/tokens` — body `{name, scopes, expires_in_days}`. Validates the scope names against the known six and `expires_in_days` against the 365-day maximum. Returns the created token record **plus** the one-time plaintext token.
- `DELETE /api/tokens/{token_id}` — revoke.

These are cookie-only by virtue of deny-by-default; no extra guard is needed.

### GUI

A new page at `/api-tokens`, registered in `frontend/src/App.tsx` next to the existing `ssh-keys` route, built on the existing `TableCard` pattern. `TableCard`'s `DataType` union needs the new row type added.

The create dialog takes a name, scope checkboxes, and an expiry selector (30 / 90 / 365 days, defaulting to 30). On success it shows the token once, with a copy button and a ready-to-paste snippet:

```bash
export FILEGLANCER_URL=https://fileglancer.int.janelia.org
export FILEGLANCER_TOKEN=fgt_a1b2c3d4e5f6_...
```

The dialog states plainly that the token will not be shown again. This mirrors the existing `GenerateTempKeyDialog` / `TempKeyDialog` flow in `frontend/src/components/ui/SSHKeys/`, which already solves "show a secret exactly once."

---

## 4. Python client

Lives at `fileglancer/client.py`, exported as `from fileglancer import Fileglancer`. A hand-written wrapper over `httpx`, which is already a dependency — no new dependencies, no optional extras, no separate package.

### Construction

```python
Fileglancer(url=None, token=None)
```

Falls back to the `FILEGLANCER_URL` and `FILEGLANCER_TOKEN` environment variables. Nothing is read from or written to disk, which keeps it working unchanged inside cluster jobs and containers.

### Paths are absolute UNIX paths

The client's entire surface operates at the level the user sees on the filesystem, not at Fileglancer's internal `(fsp_name, relative_path)` level. Resolution is the client's job and happens entirely client-side.

`/api/file-share-paths` (`fileglancer/server.py:828`) is already unauthenticated and already returns every mount form for every share. The client fetches it once, caches it, and matches with pure string operations. This requires **zero server changes** and adds nothing to the REST API.

The algorithm mirrors the existing frontend resolver `resolvePathToFsp` in `frontend/src/utils/pathHandling.ts:227`, which has been solving this same problem for the navigation bar and file selector:

1. Normalize backslashes to forward slashes.
2. For each file share path, consider `mount_path`, `linux_path`, `mac_path`, and `windows_path` as candidate prefixes.
3. Keep the longest candidate that the input starts with, where the remainder is either empty or begins with `/`. The remainder check is what stops `/misc/public` from matching `/misc/public-archive`.
4. The remainder, with any leading slash stripped, is the FSP-relative path.

Accepting all four mount forms means a path pasted from a Mac Finder window or a Windows UNC share resolves just as well as a cluster path.

No match raises `FileglancerError` with a message listing the available mount points. This error message is load-bearing — it is the difference between a usable library and an infuriating one.

`fg.refresh()` busts the cache. `fg.file_share_paths()` exposes the underlying list.

### Methods

Each maps to exactly one existing endpoint and parses the response into the existing Pydantic types from `fileglancer.model` and `fileglancer.filestore`. The client re-describes no data structures. Note that `/api/files` returns a raw worker dict rather than a declared `response_model`, so the client does that parsing itself against `filestore.FileInfo`.

Files:

```python
fg.ls(path)                      # GET  /api/files
fg.mkdir(path)                   # POST /api/files
fg.rename(src, dst)              # PATCH /api/files
fg.delete(path)                  # DELETE /api/files
fg.read(path)                    # GET  /api/content
fg.write(path, data)             # PUT  /api/content
fg.file_share_paths()            # GET  /api/file-share-paths
```

Data links:

```python
fg.create_data_link(path, url_prefix=None)
fg.data_links()
fg.data_link(sharing_key)
fg.delete_data_link(sharing_key)
```

Neuroglancer links:

```python
fg.create_ng_link(state, url_base=NEUROGLANCER_URL, title=None, short_name=None)
fg.ng_links()
fg.delete_ng_link(short_key)
```

Jobs:

```python
fg.jobs()
fg.submit_job(...)
fg.cancel_job(job_id)
```

`rename` resolves both sides and rejects a cross-share move up front with a clear message, because the underlying `PATCH /api/files` cannot perform one.

`NEUROGLANCER_URL` is a module constant, `https://neuroglancer-demo.appspot.com`. The server has no configured default Neuroglancer base URL, and `POST /api/neuroglancer/nglinks` requires `url_base` when given a state directly, so the default has to live in the client.

`create_ng_link` takes a plain dict. That is precisely what `neuroglancer.ViewerState.to_json()` produces, so the useful integration costs the client no dependency on the `neuroglancer` package and no ownership of Neuroglancer layer-type heuristics.

### Outputs are absolute too

`ls()` needs no work: `FileInfo.absolute_path` (`fileglancer/filestore.py:44`) is already populated by `from_stat` and already passed through `/api/files` untouched.

`ProxiedPath.path` is FSP-relative as the REST API defines it, so the client returns `p.model_copy(update={"path": absolute_path})` — same type, absolute value, one line. `fsp_name` remains on the object for reference.

One wrinkle to document rather than code around: returned paths are always in `mount_path` form. A Windows or SMB path fed to the client resolves correctly, but what comes back is the Linux path.

### Errors

Any non-2xx response raises `FileglancerError` carrying the status code and the API's `detail` string.

### Target workflow

```python
import neuroglancer
from fileglancer import Fileglancer

fg = Fileglancer()
link = fg.create_data_link("/nearline/rokickik/sample.zarr")

state = neuroglancer.ViewerState()
state.layers["sample"] = neuroglancer.ImageLayer(source=f"zarr://{link.url}")

print(fg.create_ng_link(state.to_json(), title="sample"))
# https://neuroglancer-demo.appspot.com#!https://fileglancer.../ng/aB3xK9
```

---

## 5. Testing

Backend unit tests (`tests/`):

- Token hash round-trip; `hmac.compare_digest` used for the comparison.
- Expired token rejected with 401 and an expiry date in the message.
- Malformed and unknown tokens rejected with 401.
- `expires_in_days` above 365 rejected with 400; default is 30.
- `:write` satisfies a `:read` requirement; `:read` does not satisfy `:write`.
- The route-coverage assertion from section 2.

Integration tests via `TestClient`:

- A token scoped `files:read` can `GET /api/files` and is refused `POST /api/files`.
- A token of any scope is refused `/api/ssh-keys` and `/api/tokens`.
- A cookie session is unaffected by all of the above.

Client tests, run against the app through `httpx.ASGITransport` — real client code, no server process:

- Path resolution, table-driven across all four mount forms.
- Longest-prefix tie-break: `/misc/public` versus `/misc/public-archive`.
- No-match error text names the available mount points.
- Cross-share rename rejected before any HTTP call.
- A shared fixture set asserting the Python and TypeScript resolvers agree.

One Playwright spec in `frontend/ui-tests/tests/`: create a token, confirm the secret is shown once, revoke it.

---

## 6. Documentation

A user-facing page in the separate docs site at `../fileglancer-docs`, covering token creation in the GUI, the two environment variables, the method reference, and the Neuroglancer workflow above.

---

## Files touched

Backend:

- `fileglancer/database.py` — `ApiTokenDB` model and CRUD functions.
- `fileglancer/alembic/versions/<new>.py` — migration, `down_revision = 'e7b2a9c4f130'`.
- `fileglancer/auth.py` — `get_user_from_token()`, bearer branch in `get_current_user()`, scope table and check.
- `fileglancer/server.py` — three `/api/tokens` routes; skip origin enforcement for bearer auth.
- `fileglancer/model.py` — request and response models for the token endpoints.
- `fileglancer/client.py` — new; the Python client.
- `fileglancer/__init__.py` — export `Fileglancer` and `FileglancerError`.

Frontend:

- `frontend/src/App.tsx` — `/api-tokens` route.
- `frontend/src/components/ui/ApiTokens/` — new; list card and create dialog.
- `frontend/src/queries/` — token queries.
- `frontend/src/components/ui/Table/TableCard.tsx` — add the new row type to `DataType`.
