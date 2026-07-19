# Editable Job Names Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every job a human-editable name, prefilled at launch with `app name - entry point`, shown as the job's identity in the jobs table and detail page, and editable afterward.

**Architecture:** Add a nullable `name` column to the `jobs` table (backfilled for existing rows), thread it through the submit request, and add a `PATCH /api/jobs/{job_id}` endpoint. The frontend prefills the name on the launch form, links the jobs-table row by name (dropping the redundant App/Entry Point columns), and edits it via a rename dialog (actions menu) and an inline GitHub-style editor (job detail page). Both editors call one `useUpdateJobMutation`.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic (backend), React/TypeScript + TanStack Query + Material Tailwind (frontend).

## Global Constraints

- Always run commands through pixi (never system `npm`/`pytest`/`npx`).
- Backend tests: `pixi run -e test test-backend`. Type check FE: `pixi run node-check`. Lint fix: `pixi run node-eslint-write`.
- Import formatting: separate `import` and `import type` lines from the same package.
- Never manually build URLs in the frontend; use `sendFetchRequest` / `buildUrl`.
- Job name is never empty: prefilled at launch, backfilled for old rows, non-empty enforced on every edit (client + server).
- Current Alembic head is `b6c4e8a25f19` (the new migration's `down_revision`).

---

### Task 1: Add `name` column, defaulting, update helper, and migration (DB layer)

**Files:**
- Modify: `fileglancer/database.py` (JobDB class ~line 145-199; `create_job` ~line 981-1026; add `update_job` after `get_job` ~line 1039)
- Create: `fileglancer/alembic/versions/e7b2a9c4f130_add_name_to_jobs.py`
- Test: `tests/test_database.py`

**Interfaces:**
- Produces:
  - `JobDB.name` — `Column(String, nullable=True)`
  - `create_job(..., name: Optional[str] = None, ...)` — when `name` is falsy/blank, stores `f"{app_name} - {entry_point_name}"`
  - `update_job(session, job_id, username, name) -> Optional[JobDB]`

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_database.py` (it already imports `create_job`; add `update_job` and `get_job` to the existing `from fileglancer.database import (...)` block):

```python
def test_create_job_defaults_name_from_app_and_entry_point(db_session):
    job = create_job(
        db_session, "testuser", "https://github.com/owner/repo",
        "My App", "run", "Run Thing", {},
    )
    assert job.name == "My App - Run Thing"


def test_create_job_keeps_explicit_name(db_session):
    job = create_job(
        db_session, "testuser", "https://github.com/owner/repo",
        "My App", "run", "Run Thing", {}, name="Custom Name",
    )
    assert job.name == "Custom Name"


def test_create_job_blank_name_falls_back_to_default(db_session):
    job = create_job(
        db_session, "testuser", "https://github.com/owner/repo",
        "My App", "run", "Run Thing", {}, name="   ",
    )
    assert job.name == "My App - Run Thing"


def test_update_job_sets_name(db_session):
    job = create_job(
        db_session, "testuser", "https://github.com/owner/repo",
        "My App", "run", "Run Thing", {},
    )
    updated = update_job(db_session, job.id, "testuser", "Renamed")
    assert updated is not None
    assert updated.name == "Renamed"
    assert get_job(db_session, job.id, "testuser").name == "Renamed"


def test_update_job_wrong_user_returns_none(db_session):
    job = create_job(
        db_session, "testuser", "https://github.com/owner/repo",
        "My App", "run", "Run Thing", {},
    )
    assert update_job(db_session, job.id, "someone_else", "Renamed") is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pixi run -e test test-backend -- tests/test_database.py -k "name or update_job" -v`
Expected: FAIL — `update_job` not defined / `JobDB` has no `name`.

- [ ] **Step 3: Add the column**

In `fileglancer/database.py`, in `class JobDB`, add after `entry_point_name` (line 152):

```python
    # Human-editable label for the job. Defaults to "app_name - entry_point_name"
    # at create time; NULL only for rows created before this column (backfilled
    # by migration).
    name = Column(String, nullable=True)
```

- [ ] **Step 4: Default the name in `create_job`**

Add the parameter to `create_job`'s signature (after `entry_point_type: str = "job",`):

```python
               name: Optional[str] = None,
```

At the top of `create_job`'s body, right after `now = datetime.now(UTC)`:

```python
    if not (name and name.strip()):
        name = f"{app_name} - {entry_point_name}"
```

And add `name=name,` to the `JobDB(...)` constructor (next to `app_name=app_name,`).

- [ ] **Step 5: Add `update_job`**

In `fileglancer/database.py`, right after `get_job` (line 1039):

```python
def update_job(session: Session, job_id: int, username: str,
               name: str) -> Optional[JobDB]:
    """Rename a job. Returns the job, or None if it doesn't exist or isn't
    owned by username."""
    job = session.query(JobDB).filter_by(id=job_id, username=username).first()
    if job is None:
        return None
    job.name = name
    session.commit()
    return job
```

- [ ] **Step 6: Write the migration**

Create `fileglancer/alembic/versions/e7b2a9c4f130_add_name_to_jobs.py`:

```python
"""add name column to jobs

Revision ID: e7b2a9c4f130
Revises: b6c4e8a25f19
Create Date: 2026-07-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e7b2a9c4f130'
down_revision = 'b6c4e8a25f19'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('name', sa.String(), nullable=True))
    # Backfill existing rows so every job has a name. '||' is string
    # concatenation on both SQLite and PostgreSQL.
    op.execute(
        "UPDATE jobs SET name = app_name || ' - ' || entry_point_name "
        "WHERE name IS NULL"
    )


def downgrade() -> None:
    op.drop_column('jobs', 'name')
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pixi run -e test test-backend -- tests/test_database.py -k "name or update_job" -v`
Expected: PASS (all 5).

- [ ] **Step 8: Commit**

```bash
git add fileglancer/database.py fileglancer/alembic/versions/e7b2a9c4f130_add_name_to_jobs.py tests/test_database.py
git commit -m "Add name column to jobs with default and update helper"
```

---

### Task 2: Models, submit wiring, and PATCH endpoint (backend API)

**Files:**
- Modify: `fileglancer/model.py` (`Job` ~line 903; `JobSubmitRequest` ~line 948; add `UpdateJobRequest` near it)
- Modify: `fileglancer/apps/jobs.py` (`submit_job` signature ~line 627-642; `create_job` call ~line 831)
- Modify: `fileglancer/server.py` (`submit_job` endpoint ~line 2300; add PATCH after `get_job` ~line 2379; `_convert_job` ~line 2453)
- Create: `tests/test_job_endpoints.py`

**Interfaces:**
- Consumes: `db.create_job(name=...)`, `db.update_job(...)` (Task 1).
- Produces:
  - `Job.name: str`, `JobSubmitRequest.name: Optional[str]`, `UpdateJobRequest.name: str`
  - `apps_module.submit_job(..., name: Optional[str] = None)`
  - `PATCH /api/jobs/{job_id}` returning the updated `Job`; 400 on blank name, 404 if not owned.

- [ ] **Step 1: Write the failing endpoint tests**

Create `tests/test_job_endpoints.py` (mirrors the `test_catalog_endpoints.py` fixtures):

```python
"""Tests for /api/jobs rename (PATCH) endpoint."""

import os
import shutil
import tempfile

import pytest
from fastapi.testclient import TestClient

from fileglancer.settings import Settings
from fileglancer.server import create_app, get_current_user
from fileglancer.database import (
    Base,
    create_engine,
    dispose_engine,
    get_db_session,
    create_job,
)

OWNER = "alice"
OTHER = "bob"


@pytest.fixture
def temp_dir():
    d = tempfile.mkdtemp()
    yield d
    shutil.rmtree(d)


@pytest.fixture
def test_app(temp_dir):
    db_path = os.path.join(temp_dir, "test.db")
    db_url = f"sqlite:///{db_path}"
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)

    settings = Settings(db_url=db_url, file_share_mounts=[], cli_mode=True)

    import fileglancer.settings
    import fileglancer.database
    original_get_settings = fileglancer.settings.get_settings
    fileglancer.settings.get_settings = lambda: settings
    fileglancer.database.get_settings = lambda: settings
    fileglancer.database._migrations_run = True

    app = create_app(settings)
    yield app, db_url

    engine.dispose()
    dispose_engine(db_url)
    fileglancer.settings.get_settings = original_get_settings
    fileglancer.database.get_settings = original_get_settings
    fileglancer.database._migrations_run = False


@pytest.fixture
def client_factory(test_app):
    app, _ = test_app

    def _build(username):
        app.dependency_overrides[get_current_user] = lambda: username
        return TestClient(app)

    yield _build
    app.dependency_overrides.clear()


@pytest.fixture
def db_session(test_app):
    _, db_url = test_app
    session = get_db_session(db_url)
    yield session
    session.close()


def _seed_job(db_session, username=OWNER):
    return create_job(
        db_session, username, "https://github.com/owner/repo",
        "My App", "run", "Run Thing", {},
    )


def test_rename_job(client_factory, db_session):
    job = _seed_job(db_session)
    client = client_factory(OWNER)
    resp = client.patch(f"/api/jobs/{job.id}", json={"name": "  New Name  "})
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


def test_rename_job_blank_rejected(client_factory, db_session):
    job = _seed_job(db_session)
    client = client_factory(OWNER)
    resp = client.patch(f"/api/jobs/{job.id}", json={"name": "   "})
    assert resp.status_code == 400


def test_rename_job_not_owner(client_factory, db_session):
    job = _seed_job(db_session)
    client = client_factory(OTHER)
    resp = client.patch(f"/api/jobs/{job.id}", json={"name": "Nope"})
    assert resp.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pixi run -e test test-backend -- tests/test_job_endpoints.py -v`
Expected: FAIL — PATCH route returns 405/404.

- [ ] **Step 3: Add model fields**

In `fileglancer/model.py`, add to `class Job` (after `entry_point_name` field, line 910):

```python
    name: str = Field(description="Human-editable job name")
```

Add to `class JobSubmitRequest` (after `manifest_path` field, line 951):

```python
    name: Optional[str] = Field(
        description="Job name; defaults to 'app name - entry point' when omitted",
        default=None,
    )
```

Add a new model right after `JobSubmitRequest` (after line 1007, before `PathValidationRequest`):

```python
class UpdateJobRequest(BaseModel):
    """Request to rename a job"""
    name: str = Field(description="New job name")
```

- [ ] **Step 4: Thread name through `submit_job` (apps/jobs.py)**

Add the parameter to `submit_job`'s signature (after `manifest_path: str = "",`, line 635):

```python
    name: Optional[str] = None,
```

Add `name=name,` to the `db.create_job(...)` call (next to `app_name=app_name,`, line 835). `create_job` falls back to the default when `name` is None/blank.

- [ ] **Step 5: Pass name from the submit endpoint and convert it**

In `fileglancer/server.py`, in the `submit_job` endpoint, add to the `apps_module.submit_job(...)` call (after `manifest_path=body.manifest_path,`, line 2317):

```python
                name=body.name,
```

In `_convert_job` (line 2453), add to the `Job(...)` constructor (after `app_name=db_job.app_name,`):

```python
            name=db_job.name,
```

- [ ] **Step 6: Add the PATCH endpoint**

In `fileglancer/server.py`, add after the `get_job` endpoint (line 2379), and make sure `UpdateJobRequest` is imported in the model-import block at the top of the file:

```python
    @app.patch("/api/jobs/{job_id}", response_model=Job,
               description="Rename a job")
    async def rename_job(job_id: int,
                         body: UpdateJobRequest,
                         username: str = Depends(get_current_user)):
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Job name must not be empty")
        with db.get_db_session(settings.db_url) as session:
            db_job = db.update_job(session, job_id, username, name)
            if db_job is None:
                raise HTTPException(status_code=404, detail="Job not found")
            return _convert_job(db_job)
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pixi run -e test test-backend -- tests/test_job_endpoints.py -v`
Expected: PASS (3).

- [ ] **Step 8: Commit**

```bash
git add fileglancer/model.py fileglancer/apps/jobs.py fileglancer/server.py tests/test_job_endpoints.py
git commit -m "Add job name to models and PATCH /api/jobs rename endpoint"
```

---

### Task 3: Frontend types and rename mutation

**Files:**
- Modify: `frontend/src/shared.types.ts` (`Job` ~line 217; `JobSubmitRequest` ~line 251)
- Modify: `frontend/src/queries/jobsQueries.ts` (add mutation after `useDeleteJobMutation`, line 268)

**Interfaces:**
- Produces:
  - `Job.name: string`, `JobSubmitRequest.name?: string`
  - `useUpdateJobMutation()` → `UseMutationResult<Job, Error, { jobId: number; name: string }>`

- [ ] **Step 1: Add TS fields**

In `frontend/src/shared.types.ts`, add to the `Job` type (after `entry_point_name: string;`, line 223):

```typescript
  name: string;
```

Add to the `JobSubmitRequest` type (after `manifest_path?: string;`, line 253):

```typescript
  name?: string;
```

- [ ] **Step 2: Add the mutation**

In `frontend/src/queries/jobsQueries.ts`, append after `useDeleteJobMutation` (line 268):

```typescript
export function useUpdateJobMutation(): UseMutationResult<
  Job,
  Error,
  { jobId: number; name: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, name }) => {
      const response = await sendFetchRequest(`/api/jobs/${jobId}`, 'PATCH', {
        name
      });
      const data = await getResponseJsonOrError(response);
      if (!response.ok) {
        throwResponseNotOkError(response, data);
      }
      return data as Job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsQueryKeys.all });
    }
  });
}
```

- [ ] **Step 3: Verify types compile**

Run: `pixi run node-check`
Expected: no new errors from these files (the 5 pre-existing errors listed in project notes may remain).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared.types.ts frontend/src/queries/jobsQueries.ts
git commit -m "Add job name type and useUpdateJobMutation"
```

---

### Task 4: Job name field on the launch form

**Files:**
- Modify: `frontend/src/components/ui/AppsPage/AppLaunchForm.tsx` (props ~line 42-71; state ~line 780+; `onSubmit(...)` call ~line 1212; render top ~line 1448)
- Modify: `frontend/src/components/AppLaunch.tsx` (`handleSubmit` ~line 169-208; `<AppLaunchForm .../>` ~line 302-318)

**Interfaces:**
- Consumes: `JobSubmitRequest.name` (Task 3).
- Produces: `AppLaunchForm` gains a `defaultJobName: string` prop and passes the entered name as the **11th** positional argument to `onSubmit`.

- [ ] **Step 1: Extend the `onSubmit` type and add the prop**

In `AppLaunchForm.tsx`, in `AppLaunchFormProps`: add to the `onSubmit` signature a final parameter (after `containerArgs?: string`, line 55):

```typescript
    jobName?: string
```

And add a new prop (after `readonly entryPoint: AppEntryPoint;`, line 43):

```typescript
  readonly defaultJobName: string;
```

- [ ] **Step 2: Seed the name state from the default**

`AppLaunchForm`'s destructured params start at line 780 (`headerActionsTarget, onSubmit, ...`). Add `defaultJobName,` there. Then, alongside the other `useState` declarations in the component body, add:

```typescript
  const [jobName, setJobName] = useState(defaultJobName);
```

The form only mounts once its entry point is already selected and offers no entry-point switcher, so `defaultJobName` is fixed for the form's lifetime — the `useState` initializer captures the right default; no re-sync effect is needed. (`useState` is already imported in this file.)

- [ ] **Step 3: Pass the name to `onSubmit`**

In `handleSubmit`, extend the `onSubmit(...)` call (line 1212-1223) with a final argument:

```typescript
    onSubmit(
      params,
      envParams,
      hasResourceOverrides ? resources : undefined,
      extraArgs.trim() || undefined,
      hasEnv ? envRecord : undefined,
      cleanEnv || undefined,
      preRun.trim() || undefined,
      postRun.trim() || undefined,
      containerImage.trim() || undefined,
      containerArgs.trim() || undefined,
      jobName.trim() || undefined
    );
```

- [ ] **Step 4: Render the field under the URL (top of the form)**

In the render, immediately after the error banners and before `{/* Tabs */}` (line 1451), insert (`FgFormField` and `FgInput` are already imported in this file — confirm and add if not):

```tsx
      {/* Job name — prefilled with "app name - entry point", editable */}
      <div className="max-w-2xl mb-4">
        <FgFormField htmlFor="job-name" label="Job name">
          <FgInput
            id="job-name"
            onChange={e => setJobName(e.target.value)}
            type="text"
            value={jobName}
          />
        </FgFormField>
      </div>
```

- [ ] **Step 5: Supply `defaultJobName` and forward the name in AppLaunch**

In `AppLaunch.tsx`, extend `handleSubmit`'s signature with a final param (after `containerArgs?: string`, line 179):

```typescript
    jobName?: string,
```

Add `name: jobName,` to the `submitJobMutation.mutate({...})` object (after `manifest_path: manifestPath,`, line 188).

Pass the prop to `<AppLaunchForm>` (line 302). Insert:

```tsx
          defaultJobName={`${displayName ?? ''} - ${selectedEntryPoint.name}`}
```

- [ ] **Step 6: Verify types + lint**

Run: `pixi run node-check && pixi run node-eslint-write`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui/AppsPage/AppLaunchForm.tsx frontend/src/components/AppLaunch.tsx
git commit -m "Prefill editable job name on the launch form"
```

---

### Task 5: Jobs table — Name column + rename dialog

**Files:**
- Modify: `frontend/src/components/ui/Table/appsJobsColumns.tsx` (remove `app_name`/`entry_point_name` columns lines 28-72; add Name column; add Rename menu item)
- Create: `frontend/src/components/ui/Dialogs/RenameJob.tsx`
- Modify: `frontend/src/components/AppJobs.tsx` (add rename state/handler; wire callback; render dialog; grid template line 110)

**Interfaces:**
- Consumes: `Job.name`, `useUpdateJobMutation` (Task 3).
- Produces: `JobActionCallbacks` gains `onRename: (job: Job) => void`.

- [ ] **Step 1: Rewrite the columns**

In `appsJobsColumns.tsx`, add `onRename` to `JobActionCallbacks`:

```typescript
type JobActionCallbacks = {
  onViewDetail: (jobId: number) => void;
  onRelaunch: (job: Job) => void;
  onRename: (job: Job) => void;
  onCancel: (job: Job) => void;
  onDelete: (jobId: number) => void;
};
```

Replace the first two column objects (the `app_name` column, lines 28-49, and the `entry_point_name` column, lines 50-72) with a single Name column:

```tsx
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row, table }) => {
        const job = row.original;
        const label =
          job.name || `${job.app_name} - ${job.entry_point_name}`;
        const onContextMenu = table.options.meta?.onCellContextMenu;
        return (
          <div
            className="flex items-center truncate w-full h-full"
            onContextMenu={e => {
              e.preventDefault();
              onContextMenu?.(e, { value: label });
            }}
          >
            <FgLink
              className="truncate text-left"
              to={`/apps/jobs/${job.id}`}
            >
              {label}
            </FgLink>
          </div>
        );
      },
      enableSorting: true
    },
```

Add a Rename item to `menuItems` (after the `Relaunch` item, line 138):

```tsx
          {
            name: 'Rename',
            action: props => props.onRename(props.job)
          },
```

- [ ] **Step 2: Create the rename dialog**

Create `frontend/src/components/ui/Dialogs/RenameJob.tsx` (pattern cloned from `EditListingDialog`, reduced to a single name field):

```tsx
import { useEffect, useState } from 'react';
import { Typography } from '@material-tailwind/react';
import { HiOutlinePencilSquare } from 'react-icons/hi2';

import FgDialog from '@/components/ui/Dialogs/FgDialog';
import FgButton from '@/components/designSystem/atoms/FgButton';
import FgFormField from '@/components/designSystem/molecules/FgFormField';
import FgInput from '@/components/designSystem/atoms/formElements/FgInput';

interface RenameJobDialogProps {
  readonly open: boolean;
  readonly initialName: string;
  readonly onClose: () => void;
  readonly onSave: (name: string) => Promise<void>;
  readonly saving: boolean;
}

export default function RenameJobDialog({
  open,
  initialName,
  onClose,
  onSave,
  saving
}: RenameJobDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    try {
      await onSave(name.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rename job');
    }
  };

  return (
    <FgDialog className="max-w-lg" onClose={onClose} open={open}>
      <Typography className="text-foreground font-bold mb-4 pr-8" type="h6">
        Rename Job
      </Typography>
      <FgFormField htmlFor="rename-job-name" label="Name">
        <FgInput
          id="rename-job-name"
          onChange={e => {
            setName(e.target.value);
            setError('');
          }}
          type="text"
          value={name}
        />
      </FgFormField>
      {error ? (
        <Typography className="text-error mb-3" type="small">
          {error}
        </Typography>
      ) : null}
      <div className="flex gap-3">
        <FgButton
          disabled={!name.trim() || saving}
          icon={HiOutlinePencilSquare}
          loading={saving}
          loadingText="Saving..."
          onClick={handleSave}
        >
          Save
        </FgButton>
        <FgButton onClick={onClose} variant="ghost">
          Cancel
        </FgButton>
      </div>
    </FgDialog>
  );
}
```

- [ ] **Step 3: Wire the dialog into AppJobs**

In `AppJobs.tsx`:

Add imports:

```tsx
import RenameJobDialog from '@/components/ui/Dialogs/RenameJob';
import { useUpdateJobMutation } from '@/queries/jobsQueries';
```

Add state + mutation (next to the other `useState`/mutation lines, ~line 27):

```tsx
  const updateJobMutation = useUpdateJobMutation();
  const [jobToRename, setJobToRename] = useState<Job | null>(null);
```

Add the handler (near the other handlers):

```tsx
  const handleConfirmRename = async (name: string) => {
    if (!jobToRename) {
      return;
    }
    await updateJobMutation.mutateAsync({ jobId: jobToRename.id, name });
    toast.success('Job renamed');
  };
```

Add `onRename: setJobToRename` to the `createAppsJobsColumns({...})` call (line 88-93).

Update the grid template (line 110) from 6 to 5 columns:

```tsx
        gridColsClass="grid-cols-[3fr_1fr_2fr_1fr_1fr]"
```

Render the dialog (next to the other dialogs, before the closing `</div>`):

```tsx
      <RenameJobDialog
        initialName={
          jobToRename
            ? jobToRename.name ||
              `${jobToRename.app_name} - ${jobToRename.entry_point_name}`
            : ''
        }
        onClose={() => setJobToRename(null)}
        onSave={handleConfirmRename}
        open={jobToRename !== null}
        saving={updateJobMutation.isPending}
      />
```

- [ ] **Step 4: Verify types + lint**

Run: `pixi run node-check && pixi run node-eslint-write`
Expected: no new errors. Confirm the actions-menu still compiles (all `JobActionCallbacks` consumers now supply `onRename`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Table/appsJobsColumns.tsx frontend/src/components/ui/Dialogs/RenameJob.tsx frontend/src/components/AppJobs.tsx
git commit -m "Show job name as jobs-table link and add rename action"
```

---

### Task 6: Inline job-name editor on the job detail page

**Files:**
- Modify: `frontend/src/components/ui/AppsPage/AppPageHeader.tsx` (title prop line 13; render line 58-60)
- Create: `frontend/src/components/ui/AppsPage/JobTitleEditor.tsx`
- Modify: `frontend/src/components/JobDetail.tsx` (title prop line 718)

**Interfaces:**
- Consumes: `Job`, `useUpdateJobMutation` (Task 3), `AppPageHeader` title-as-node.
- Produces: `AppPageHeader.title` accepts `ReactNode`; `JobTitleEditor` renders the GitHub-style inline editor.

- [ ] **Step 1: Let AppPageHeader accept a node title**

In `AppPageHeader.tsx`, change the prop type (line 13):

```typescript
  readonly title?: ReactNode;
```

Replace the title render (lines 58-60) so string titles look identical and node titles render directly:

```tsx
          {typeof title === 'string' ? (
            <Typography
              className="text-foreground font-bold truncate"
              type="h6"
            >
              {title}
            </Typography>
          ) : (
            title
          )}
```

- [ ] **Step 2: Create the inline editor**

Create `frontend/src/components/ui/AppsPage/JobTitleEditor.tsx`:

```tsx
import { useState } from 'react';
import { IconButton, Typography } from '@material-tailwind/react';
import { HiOutlinePencilSquare } from 'react-icons/hi2';
import { HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';

import FgIcon from '@/components/designSystem/atoms/FgIcon';
import FgInput from '@/components/designSystem/atoms/formElements/FgInput';
import FgTooltip from '@/components/ui/widgets/FgTooltip';
import { showErrorToast } from '@/utils/errorToast';
import { useUpdateJobMutation } from '@/queries/jobsQueries';
import type { Job } from '@/shared.types';

export default function JobTitleEditor({ job }: { readonly job: Job }) {
  const displayName =
    job.name || `${job.app_name} - ${job.entry_point_name}`;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName);
  const updateJobMutation = useUpdateJobMutation();

  const startEdit = () => {
    setValue(displayName);
    setEditing(true);
  };

  const save = async () => {
    const name = value.trim();
    if (!name) {
      return;
    }
    try {
      await updateJobMutation.mutateAsync({ jobId: job.id, name });
      toast.success('Job renamed');
      setEditing(false);
    } catch (error) {
      showErrorToast(error, 'Failed to rename job');
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <Typography className="text-foreground font-bold truncate" type="h6">
          {displayName}
        </Typography>
        <FgTooltip label="Edit job name">
          <IconButton
            aria-label="Edit job name"
            className="text-foreground hover:text-primary flex-shrink-0"
            onClick={startEdit}
            size="sm"
            variant="ghost"
          >
            <FgIcon icon={HiOutlinePencilSquare} />
          </IconButton>
        </FgTooltip>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <FgInput
        autoFocus
        className="min-w-64"
        disabled={updateJobMutation.isPending}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            void save();
          } else if (e.key === 'Escape') {
            setEditing(false);
          }
        }}
        type="text"
        value={value}
      />
      <FgTooltip label="Save">
        <IconButton
          aria-label="Save job name"
          className="text-foreground hover:text-primary flex-shrink-0"
          disabled={!value.trim() || updateJobMutation.isPending}
          onClick={() => void save()}
          size="sm"
          variant="ghost"
        >
          <FgIcon icon={HiOutlineCheck} />
        </IconButton>
      </FgTooltip>
      <FgTooltip label="Cancel">
        <IconButton
          aria-label="Cancel rename"
          className="text-foreground hover:text-primary flex-shrink-0"
          onClick={() => setEditing(false)}
          size="sm"
          variant="ghost"
        >
          <FgIcon icon={HiOutlineX} />
        </IconButton>
      </FgTooltip>
    </div>
  );
}
```

- [ ] **Step 3: Use the editor as the header title**

In `JobDetail.tsx`, add the import:

```tsx
import JobTitleEditor from '@/components/ui/AppsPage/JobTitleEditor';
```

Replace the `title` prop (line 718):

```tsx
            title={<JobTitleEditor job={job} />}
```

- [ ] **Step 4: Verify types + lint**

Run: `pixi run node-check && pixi run node-eslint-write`
Expected: no new errors. Confirm other `AppPageHeader` callers (app detail, launch) still pass string titles and render unchanged.

- [ ] **Step 5: Manual verification**

Run: `pixi run dev-launch` (and `pixi run dev-watch`), then in the browser:
- Launch an app → the Job name field is prefilled with `app - entry point` under the URL; edit it; submit.
- Jobs table shows the name as the link; App/Entry Point columns are gone; the row's Rename action opens the dialog and renames.
- Open the job → pencil next to the title; click → inline field with check/x; Save renames, Escape/x cancels; empty is not savable.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/AppsPage/AppPageHeader.tsx frontend/src/components/ui/AppsPage/JobTitleEditor.tsx frontend/src/components/JobDetail.tsx
git commit -m "Add inline job-name editor to the job detail page"
```

---

## Self-Review

**Spec coverage:**
- Prefilled name at launch, under the URL, editable → Task 4. ✓
- Name shown in jobs table as link → Task 5. ✓
- App/Entry Point columns dropped → Task 5. ✓
- Edit from actions menu (rename dialog) → Task 5. ✓
- Pencil + inline edit with Cancel/Save on job page → Task 6. ✓
- Backfill existing jobs with default names → Task 1 (migration). ✓
- Non-empty enforced (client + server) → Tasks 2, 5, 6. ✓
- New `name` column, submit field, PATCH endpoint, mutation → Tasks 1-3. ✓

**Type consistency:** `Job.name: string`, `JobSubmitRequest.name?: string`, mutation arg `{ jobId, name }`, `onRename: (job) => void`, `defaultJobName: string`, `AppPageHeader.title?: ReactNode`, `onSubmit`'s 11th arg `jobName?: string` — used consistently across tasks.

**Notes / deliberate simplifications:**
- The display fallback `job.name || "app - entry point"` is belt-and-suspenders: the migration backfills and `create_job` always sets a name, so it only guards a hypothetical NULL. Kept because it is one `||` expression.
- No shared "editable text" abstraction — the inline editor and the rename dialog both just call `useUpdateJobMutation` (two callers, two shells).
- Frontend has no unit-test harness for these dialogs; FE tasks are verified by `node-check` + a manual run. Backend logic (defaulting, backfill, validation) carries the pytest coverage.
