# Editable Job Names — Design

## Goal

Give every job a human-editable name. At launch the name is prefilled with `app name - entry point`; the user can change it before launching and any time afterward. The name becomes the job's identity in the UI (jobs table link, job detail title), replacing the redundant App and Entry Point columns.

## Background

Today a job has no name/title. It is identified everywhere by `app_name` + `entry_point_name` (both snapshotted at submit time). There is no update endpoint for jobs (only POST submit, GET, cancel, DELETE).

## Data model

Backend:
- Add nullable `name` column to `JobDB` (`fileglancer/database.py`).
- Alembic migration: add the column, then backfill existing rows with `app_name || ' - ' || entry_point_name`.
- Add `name` to the `Job` and `JobSubmitRequest` Pydantic models (`fileglancer/model.py`).
- `submit_job` (`fileglancer/apps/jobs.py`) persists the supplied `name`.
- New `db.update_job(job_id, name)` in `database.py`.

Frontend:
- Add `name` to the TS `Job` and `JobSubmitRequest` types (`frontend/src/shared.types.ts`).

## API

New `PATCH /api/jobs/{job_id}` accepting `{ "name": string }`, mirroring the existing catalog `PATCH` endpoint (`server.py`).
- Trims the name; rejects empty/whitespace with 400.
- Returns the updated job.

Frontend: `useUpdateJobMutation` in `frontend/src/queries/jobsQueries.ts`, invalidating `jobsQueryKeys.all` on success (same shape as the other job mutations).

## UI

### Launch page (`AppLaunch` / `AppLaunchForm`)
- New "Job name" text input placed under the URL/breadcrumbs area.
- Prefilled with `${displayName} - ${entryPointName}`. It follows the computed default until the user edits it (a dirty flag); after the first edit it keeps the typed value even if the entry point changes.
- Threaded through the existing `onSubmit` prop into the `JobSubmitRequest`.

### Jobs table (`appsJobsColumns.tsx` / `AppJobs.tsx`)
- Drop the `app_name` ("App") and `entry_point_name` ("Entry Point") columns.
- New "Name" column, placed first; its cell links to `/apps/jobs/${jobId}` with link text = `job.name` (fallback `app_name - entry_point_name` for any legacy row still missing a name).
- Update the grid template accordingly (net one fewer column).
- Add a "Rename" `MenuItem` to the actions menu that opens a rename dialog.

### Rename dialog
- Cloned from `EditListingDialog.tsx` (name field, non-empty validation, Cancel/Save), wired to `useUpdateJobMutation`.

### Job detail page (`JobDetail.tsx`)
- Title (currently `` `${job.app_name} - ${job.entry_point_name}` ``) becomes `job.name` (same fallback).
- Pencil icon next to the title, hover text "Edit job name". Clicking swaps the title for an inline text field with Cancel/Save buttons (GitHub-issue-title style), saving via `useUpdateJobMutation`. Non-empty required.

## Validation / errors

- Empty/whitespace names are rejected both client-side (disable Save) and server-side (400). Previous name is kept on rejection.

## Non-goals / skipped

- No shared "editable text" component: the inline editor (job page) and the rename dialog (actions menu) both just call `useUpdateJobMutation`; two callers with different shells do not justify an abstraction. Add one if a third caller appears.
- No autosave/debounce — explicit Save only.
- Column header naming stays plain ("Name").

## Testing

- Backend: a test for `PATCH /api/jobs/{job_id}` (happy path + empty-name 400) and that `submit_job` persists a name.
- Migration: verify existing rows get backfilled names.
- Frontend: the inline editor / rename dialog non-empty behavior via existing unit-test patterns if present; otherwise a manual check.
