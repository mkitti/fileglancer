#!/usr/bin/env python3
"""Interactive walkthrough of the Fileglancer Python client.

Steps through every public method on `Fileglancer`, describing what it is about
to do and showing the exact call before running it, then pausing so you can
verify the result in the web UI (or on disk) before continuing.

All files and directories are created inside a single scratch directory under
the current working directory, and removed at the end -- including if a step
fails or you quit partway through.

Usage:

    export FILEGLANCER_URL=http://localhost:7878
    export FILEGLANCER_TOKEN=fgt_...
    pixi run python scripts/api_walkthrough.py

Create the token on the API Tokens page of the web UI. Grant it all six
scopes, or expect the correspondingly-scoped steps to fail with a 403 -- which
is itself worth seeing.
"""
import os
import shutil
import sys
import traceback

import httpx

from fileglancer import Fileglancer, FileglancerError
from fileglancer.client import NEUROGLANCER_URL

# ANSI codes, disabled when stdout is not a terminal.
if sys.stdout.isatty():
    BOLD, DIM, GREEN, RED, YELLOW, RESET = (
        "\033[1m", "\033[2m", "\033[32m", "\033[31m", "\033[33m", "\033[0m")
else:
    BOLD = DIM = GREEN = RED = YELLOW = RESET = ""

SCRATCH_NAME = "fg-api-walkthrough"


class Quit(Exception):
    """Raised when the user chooses to stop early."""


class Runner:
    """Prints each step, waits for consent, runs it, and reports the result."""

    def __init__(self):
        self.number = 0
        self.ran = 0
        self.skipped = 0
        self.failed = 0

    def step(self, description, code, call, verify=None):
        """Describe a step, wait for input, then run it.

        Args:
            description: what this step does, in plain English.
            code: the call as you would type it, shown before running.
            call: zero-arg callable performing the step.
            verify: optional hint on how to check the result yourself.
        """
        self.number += 1
        print(f"\n{BOLD}── Step {self.number}: {description}{RESET}")
        print(f"   {DIM}{code}{RESET}")
        if verify:
            print(f"   {DIM}verify: {verify}{RESET}")

        answer = input(f"   {YELLOW}[Enter] run  ·  s skip  ·  q quit{RESET} ").strip().lower()
        if answer == "q":
            raise Quit()
        if answer == "s":
            self.skipped += 1
            print(f"   {DIM}skipped{RESET}")
            return None

        try:
            result = call()
        except Exception:
            self.failed += 1
            print(f"   {RED}FAILED{RESET}")
            traceback.print_exc()
            return None

        self.ran += 1
        print(f"   {GREEN}ok{RESET} → {self._format(result)}")
        return result

    @staticmethod
    def _format(result):
        """Render a result compactly; lists get counted and sampled."""
        if result is None:
            return "(no return value)"
        if isinstance(result, list):
            if not result:
                return "[] (empty)"
            head = "\n        ".join(repr(item) for item in result[:5])
            more = f"\n        … and {len(result) - 5} more" if len(result) > 5 else ""
            return f"{len(result)} item(s)\n        {head}{more}"
        return repr(result)

    def summary(self):
        print(f"\n{BOLD}── Summary{RESET}")
        print(f"   ran {self.ran}, skipped {self.skipped}, "
              f"{RED if self.failed else ''}failed {self.failed}{RESET}")


def preflight():
    """Check configuration and resolve the working directory to a file share."""
    url = os.environ.get("FILEGLANCER_URL")
    token = os.environ.get("FILEGLANCER_TOKEN")
    missing = [n for n, v in (("FILEGLANCER_URL", url),
                              ("FILEGLANCER_TOKEN", token)) if not v]
    if missing:
        sys.exit(f"{RED}Not configured.{RESET} Set {' and '.join(missing)} first. "
                 f"See the docstring at the top of this file.")

    fg = Fileglancer()
    cwd = os.getcwd()

    try:
        fsp_name, relative = fg._resolve(cwd)
    except httpx.HTTPError as error:
        # The client wraps error *responses* in FileglancerError but lets
        # transport failures through as-is, so catch those separately rather
        # than greeting the user with an httpx traceback.
        sys.exit(f"{RED}Could not reach {url}.{RESET}\n{type(error).__name__}: "
                 f"{error}\n\nIs the server running? Try: pixi run dev-launch")
    except FileglancerError as error:
        sys.exit(f"{RED}The current directory is not inside a Fileglancer file "
                 f"share, so the client cannot address it.{RESET}\n{error}\n\n"
                 f"Re-run this from a directory under one of those mount "
                 f"points, or start the server with -f {cwd}")

    print(f"{BOLD}Fileglancer Python client walkthrough{RESET}")
    print(f"  server        {url}")
    print(f"  cwd           {cwd}")
    print(f"  resolves to   file share {fsp_name!r}, relative path "
          f"{relative or '(share root)'!r}")
    return fg, cwd


def main():
    fg, cwd = preflight()
    scratch = os.path.join(cwd, SCRATCH_NAME)
    if os.path.exists(scratch):
        sys.exit(f"{RED}{scratch} already exists.{RESET} Remove it and re-run.")

    nested = os.path.join(scratch, "nested")
    notes = os.path.join(scratch, "notes.txt")
    renamed = os.path.join(scratch, "notes-renamed.txt")
    created_links = []
    created_ng_keys = []

    print(f"\nEverything is created under {BOLD}{scratch}{RESET} and removed at "
          f"the end.\nEach step is described before it runs; nothing happens "
          f"until you press Enter.")

    r = Runner()
    try:
        # --- File shares and path resolution ---
        r.step("List the file shares this token can see",
               "fg.file_share_paths()",
               fg.file_share_paths,
               verify="should include the share your cwd lives under")

        r.step("Drop the cached share list, forcing a refetch next time",
               "fg.refresh()",
               fg.refresh)

        r.step("Turn a share name plus relative path back into an absolute path",
               f"fg.abspath({fg._resolve(cwd)[0]!r}, {fg._resolve(cwd)[1]!r})",
               lambda: fg.abspath(*fg._resolve(cwd)),
               verify=f"should equal {cwd}")

        r.step("Ask about a path in no file share (expected to raise)",
               "fg._resolve('/definitely/not/a/share')",
               lambda: _expect_error(fg._resolve, "/definitely/not/a/share"),
               verify="the error should list the available mount points")

        # --- Files ---
        r.step("Describe the current directory",
               "fg.stat(cwd)",
               lambda: fg.stat(cwd),
               verify="is_dir should be True")

        r.step("List the current directory",
               "fg.ls(cwd)",
               lambda: fg.ls(cwd),
               verify="should look like `ls` here; each entry has absolute_path")

        r.step("Create a scratch directory",
               f"fg.mkdir({SCRATCH_NAME!r})",
               lambda: fg.mkdir(scratch),
               verify=f"{scratch} should now exist on disk")

        r.step("Create a directory inside it",
               f"fg.mkdir({SCRATCH_NAME + '/nested'!r})",
               lambda: fg.mkdir(nested))

        r.step("Write a text file",
               f"fg.write({SCRATCH_NAME + '/notes.txt'!r}, b'hello from the API\\n')",
               lambda: fg.write(notes, b"hello from the API\n"),
               verify="returns the number of bytes written")

        r.step("Read it back",
               f"fg.read({SCRATCH_NAME + '/notes.txt'!r})",
               lambda: fg.read(notes),
               verify="should be b'hello from the API\\n'")

        r.step("List the scratch directory, which now has two entries",
               f"fg.ls({SCRATCH_NAME!r})",
               lambda: fg.ls(scratch),
               verify="nested/ and notes.txt")

        r.step("Call ls() on a file instead of a directory (expected to raise)",
               f"fg.ls({SCRATCH_NAME + '/notes.txt'!r})",
               lambda: _expect_error(fg.ls, notes),
               verify="should say 'Not a directory', not return an empty list")

        r.step("Rename the file",
               f"fg.rename({SCRATCH_NAME + '/notes.txt'!r}, {SCRATCH_NAME + '/notes-renamed.txt'!r})",
               lambda: fg.rename(notes, renamed),
               verify="notes.txt should be gone, notes-renamed.txt present")

        r.step("Try to move it to a different file share (expected to raise)",
               f"fg.rename({SCRATCH_NAME + '/notes-renamed.txt'!r}, '/nowhere/x.txt')",
               lambda: _expect_error(fg.rename, renamed, "/nowhere/x.txt"),
               verify="refused locally, before any HTTP request")

        r.step("Delete the nested directory",
               f"fg.delete({SCRATCH_NAME + '/nested'!r})",
               lambda: fg.delete(nested),
               verify="nested/ should be gone")

        # --- Data links ---
        def make_link():
            link = fg.create_data_link(scratch)
            created_links.append(link.sharing_key)
            return link

        link = r.step("Create a data link for the scratch directory",
                      f"fg.create_data_link({SCRATCH_NAME!r})",
                      make_link,
                      verify="check the Data Links page in the web UI; "
                             ".path should be absolute")

        r.step("List your data links",
               "fg.data_links()",
               fg.data_links,
               verify="the new link should appear")

        if link is not None:
            r.step("Fetch that one link by its sharing key",
                   f"fg.data_link({link.sharing_key!r})",
                   lambda: fg.data_link(link.sharing_key))

        # --- Neuroglancer links ---
        def make_ng_link():
            state = {"layers": [], "title": "api walkthrough"}
            if link is not None:
                state["layers"] = [
                    {"type": "image", "name": "sample",
                     "source": f"zarr://{link.url}"}
                ]
            url = fg.create_ng_link(state, title="api walkthrough")
            for entry in fg.ng_links():
                if entry.title == "api walkthrough":
                    created_ng_keys.append(entry.short_key)
            return url

        r.step("Shorten a Neuroglancer state into a link",
               "fg.create_ng_link({'layers': [...]}, title='api walkthrough')",
               make_ng_link,
               verify=f"returns a {NEUROGLANCER_URL} URL with #! in it; "
                      f"check the NG Links page")

        r.step("List your Neuroglancer links",
               "fg.ng_links()",
               fg.ng_links)

        # --- Jobs ---
        r.step("List your jobs",
               "fg.jobs()",
               fg.jobs,
               verify="matches the Jobs page; empty list is a valid result")

        r.step("List only running jobs",
               "fg.jobs(status='RUNNING')",
               lambda: fg.jobs(status="RUNNING"))

        r.step("Fetch a job that does not exist (expected to raise)",
               "fg.job(999999)",
               lambda: _expect_error(fg.job, 999999),
               verify="should be a 404")

        print(f"\n{DIM}The next step really submits a cluster job. It needs an "
              f"app registered in your library, and will fail otherwise. Skip "
              f"it unless you have one.{RESET}")
        r.step("Submit a job (needs a real app; skip if unsure)",
               "fg.submit_job(app_url=..., entry_point_id=..., parameters={})",
               lambda: _submit_job_interactive(fg),
               verify="if it succeeds, cancel it on the Jobs page")

    except Quit:
        print(f"\n{YELLOW}Stopping early at your request.{RESET}")
    finally:
        cleanup(fg, scratch, created_links, created_ng_keys)
        r.summary()


def _expect_error(func, *args):
    """Call something expected to raise, and return the error as the result."""
    try:
        func(*args)
    except FileglancerError as error:
        status = f" (HTTP {error.status_code})" if error.status_code else ""
        return f"raised FileglancerError{status}: {error}"
    return "NO ERROR RAISED — that is itself a finding"


def _submit_job_interactive(fg):
    app_url = input("      app_url (blank to skip): ").strip()
    if not app_url:
        return "skipped, no app_url given"
    entry_point = input("      entry_point_id: ").strip()
    return fg.submit_job(app_url=app_url, entry_point_id=entry_point)


def cleanup(fg, scratch, sharing_keys, ng_keys):
    """Remove everything this script created, reporting each removal."""
    print(f"\n{BOLD}── Cleanup{RESET}")

    for key in sharing_keys:
        try:
            fg.delete_data_link(key)
            print(f"   removed data link {key}")
        except FileglancerError as error:
            print(f"   {YELLOW}could not remove data link {key}: {error}{RESET}")

    for key in ng_keys:
        try:
            fg.delete_ng_link(key)
            print(f"   removed Neuroglancer link {key}")
        except FileglancerError as error:
            print(f"   {YELLOW}could not remove NG link {key}: {error}{RESET}")

    # Local rmtree rather than fg.delete(): the API deletes only empty
    # directories, and this is cleanup, not part of what we are demonstrating.
    if os.path.exists(scratch):
        try:
            shutil.rmtree(scratch)
            print(f"   removed {scratch}")
        except OSError as error:
            print(f"   {YELLOW}could not remove {scratch}: {error}{RESET}")
    else:
        print(f"   nothing to remove at {scratch}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        # Cleanup already ran in main's finally block if we got that far.
        print("\ninterrupted")
        sys.exit(130)
