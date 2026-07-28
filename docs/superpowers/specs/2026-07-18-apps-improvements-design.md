# Apps feature — minor improvements design (2026-07-18)

Four small, independent improvements to the Apps feature. Each ships as its own commit.

## 1. Paste a GitHub URL with an embedded branch/tag → move it to the Revision box

When adding an app, a user often pastes a URL copied from GitHub's branch/tag view, e.g. `https://github.com/org/repo/tree/my-branch`. Today that whole string goes into the URL field and the Revision field stays empty; the ref survives only because `buildAppUrl` re-parses it later. We make the split explicit and visible.

`parseGithubUrl` (`frontend/src/utils/appUrls.ts`) already extracts `{owner, repo, branch}` from a `/tree/<ref>` URL. Add a one-line pure helper `splitGithubRef(url)` that returns `{ repoUrl, ref }` — the bare `https://github.com/owner/repo` plus the embedded ref (empty string when the URL carried no ref or the ref is `main`).

In `AddAppDialog.tsx`, the repo-URL field's `onChange` calls `splitGithubRef` on the new value; when it yields a non-empty ref, set the URL field to the bare repo URL and the Revision field to the ref. Only rewrites when the URL actually carried a `/tree/` ref, so typing a bare URL is undisturbed. A pasted URL's ref is authoritative, so it overwrites whatever is in the Revision box.

Test: unit test for `splitGithubRef` covering a bare URL, a `/tree/<branch>`, a `/tree/main`, a `.git` suffix, and a non-GitHub string.

## 2. Breadcrumbs on the app launch page

Replace the back-arrow + title portion of `AppPageHeader` on the launch page (`AppLaunch.tsx`) with a breadcrumb trail styled like the file-browser `Crumbs`: a leading apps-home icon, then `›` (HiChevronRight) delimited segments.

Trail: `[⊞ apps home → top page]  ›  App Name → app-level page  ›  [entry-point icon] Entry Point Name`. Before an entry point is selected it is just `[⊞] › App Name`. The description, GitHub URL line, and the launch-button actions slot are preserved below the breadcrumb.

Origin is inferred from install status (no URL/router plumbing):

- Installed: home → `/apps` (My Apps); App Name → the app detail page (`buildAppDetailPath`).
- Not installed: home → `/apps/catalog` (App Catalog); App Name → the matching catalog listing (`/apps/catalog/:id`), resolved from the already-cached `useCatalogQuery` by canonical url + manifest path. If no match is found, the App Name segment renders as plain text.

New component `frontend/src/components/ui/AppsPage/AppBreadcrumbs.tsx`. It is a thin flex row of `FgLink`/text + `FgIcon` separators — not a reuse of `BreadcrumbSegment`, whose separator is `/`, because the file-browser trail uses `›` between segments here.

## 3. Install count in the catalog

An "install" is a row in `user_apps`; there is no counter column and no association table. Count current installs live rather than denormalizing, so there is no migration and no counter to keep in sync. Semantics: how many users currently have the app installed.

Backend: add `install_count: int` to the `AppListing` Pydantic model (`fileglancer/model.py`). In `list_catalog` (`fileglancer/server.py`), run one grouped query over `user_apps` — `COUNT` grouped by `(url, manifest_path)` — and join it in memory to the listings, matching by canonical GitHub URL + manifest path (the same identity used elsewhere). A DB helper `count_installs_by_app(session)` returns the grouped counts. This is an O(listings) in-memory join, fine at catalog scale.

Frontend: add a sortable "Installs" column to `createCatalogColumns` (table view) and show the count on the catalog listing detail page via `ListingInfoTable`. `AppListing` in `shared.types.ts` gains `install_count`.

Interpretation note: "app detail page" is taken to mean the catalog listing detail page (`ListingDetail`), where the `AppListing` — and therefore the count — is available. The installed-app detail page (`AppDetail`) renders a `UserApp` with no count, so it is out of scope unless requested.

Test: backend pytest — seed a listing plus N `user_apps` rows for its url/manifest path across distinct users and assert `list_catalog` reports `install_count == N`.

## 4. Short commit display + rename to "Commit"

The Job page (`JobDetail.tsx`) shows a "Version" row: `commit_sha.slice(0, 7)` in `text-xs font-mono`, linked to the GitHub commit. The app page (`AppInfoTable.tsx`) shows the full untruncated SHA under an "App commit" label.

- App page: change `CommitValue` to render `sha.slice(0, 7)` in `text-xs font-mono` (matching the Job page) and rename the "App commit" label to "Commit". The "Code commit" row keeps its label but also renders short via the shared `CommitValue`.
- Job page: rename the "Version" label to "Commit".

No shared helper is extracted — `.slice(0, 7)` appears in two files and inlining is smaller than a util.
