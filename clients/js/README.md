# @fileglancer/client

Browser client for the Fileglancer programmatic API. Lets another web app read and write scientific data files through Fileglancer, as the logged-in user, without implementing its own login.

## How authentication works

Fileglancer authenticates with a `SameSite=Lax` session cookie. When your app and Fileglancer are served from the same registrable domain (for example `ai-cryoet.int.janelia.org` and `fileglancer.int.janelia.org`, both under `janelia.org`), the browser automatically attaches that cookie to requests your app makes to Fileglancer. So:

- Your app does **not** handle any tokens or credentials.
- Your app does **not** need its own login.
- The first time a user needs an authenticated operation, `connect()` opens a small Fileglancer popup that runs the normal login (Okta or simple auth) and closes itself. If the user already has a Fileglancer session, this is instant.

For this to work, an administrator must add your app's origin to Fileglancer's `api_allowed_origins` setting. Requests from origins not on that list are rejected with `403`.

## Install

This package lives in the Fileglancer repo under `clients/js`. Build it with `npm run build` (or `pixi`-managed Node), then depend on it locally, or copy `src/index.ts` into your app.

## Usage

```ts
import { FileglancerClient, AuthRequiredError } from '@fileglancer/client';

const fg = new FileglancerClient({
  baseUrl: 'https://fileglancer.int.janelia.org'
});

// Optional: pre-warm the session at app startup (no popup, no user gesture).
// If the user already has a Fileglancer session, later calls just work.
await fg.connectSilently();

// In a "Save" click handler (a user gesture, so the popup isn't blocked):
async function onSaveClick() {
  try {
    await fg.writeFile('groups_scicompsoft', 'results/out.csv', csvBlob);
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      // No session yet — open the login popup, then retry.
      await fg.connect();
      await fg.writeFile('groups_scicompsoft', 'results/out.csv', csvBlob);
    } else {
      throw err;
    }
  }
}
```

The simplest pattern is to always `connect()` first inside the click handler — it short-circuits (no visible popup) when the user is already authenticated:

```ts
async function onSaveClick() {
  await fg.connect(); // instant if already logged in; popup if not
  await fg.writeFile('groups_scicompsoft', 'results/out.csv', csvBlob);
}
```

## API

| Method | Description |
|--------|-------------|
| `getAuthStatus()` | Current auth status; safe when unauthenticated. |
| `getAllowedOrigins()` | Origins the server permits (for diagnostics). |
| `connectSilently(timeoutMs?)` | Establish/verify the session via a hidden iframe. No popup, no gesture. Returns `boolean`. |
| `connect(options?)` | Open the login popup and resolve once authenticated. Call from a user gesture. |
| `getFileSharePaths()` | List available file shares. |
| `listFiles(fsp, subpath?)` | List a directory or get info for one path. |
| `readFile(fsp, subpath)` | Read contents; returns a `Response`. |
| `readFileBlob(fsp, subpath)` | Read contents as a `Blob`. |
| `readFileText(fsp, subpath)` | Read contents as a string. |
| `writeFile(fsp, subpath, data, options?)` | Create/overwrite a file. Parent dir must exist. `options.ifMatch` / `options.ifUnmodifiedSince` add optimistic-concurrency preconditions. |
| `createDirectory(fsp, subpath)` | Create a directory. |
| `createFile(fsp, subpath)` | Create an empty file. |
| `rename(fsp, subpath, newPath)` | Rename/move within a share. |
| `remove(fsp, subpath)` | Delete a file or empty directory. |

`fsp` is a file-share-path name (from `getFileSharePaths()`); `subpath` is the path within that share.

### Errors

All failures throw `FileglancerError` (with a numeric `status`). Two subclasses help you branch:

- `AuthRequiredError` (401) — no valid session; call `connect()` from a user gesture and retry.
- `ForbiddenError` (403) — your origin isn't allowlisted, or the user lacks permission for that path.
- `ConflictError` (412) — an `ifMatch`/`ifUnmodifiedSince` precondition failed; the file changed since you read it. Re-read and retry.

Optimistic concurrency example:

```ts
const res = await fg.readFile(fsp, path);
const etag = res.headers.get('etag');
const text = await res.text();
// ...user edits...
try {
  await fg.writeFile(fsp, path, edited, { ifMatch: etag });
} catch (err) {
  if (err instanceof ConflictError) {
    // someone else saved first — re-read and merge/prompt
  } else throw err;
}
```

By default (`autoConnect: true`), a `401` triggers one silent reconnect-and-retry before surfacing as `AuthRequiredError`.

## Security notes

- The session cookie is `httponly` and never exposed to your app's JavaScript.
- The popup posts its result only to your app's exact origin, and only if that origin is on the server allowlist.
- `SameSite=Lax` is preserved (no `SameSite=None`), so this relies on same-site (shared registrable domain) deployment. Apps on an unrelated domain would need a token-based flow instead.
