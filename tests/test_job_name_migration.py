"""Test the e7b2a9c4f130 migration backfills job names."""

import importlib.util
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from alembic.migration import MigrationContext
from alembic.operations import Operations

_MIGRATION = (
    Path(__file__).resolve().parent.parent
    / "fileglancer" / "alembic" / "versions"
    / "e7b2a9c4f130_add_name_to_jobs.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("_name_mig", _MIGRATION)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


mig = _load_migration()


@pytest.fixture
def engine():
    eng = create_engine("sqlite://")
    yield eng
    eng.dispose()


def test_migration_backfills_name_from_app_and_entry_point(engine):
    with engine.begin() as conn:
        # Pre-migration jobs schema: no name column.
        conn.execute(text(
            "CREATE TABLE jobs (id INTEGER PRIMARY KEY, "
            "app_name TEXT, entry_point_name TEXT)"
        ))
        conn.execute(text(
            "INSERT INTO jobs (app_name, entry_point_name) VALUES "
            "('My App', 'Run Thing'), ('Other', 'Convert')"
        ))

    with engine.begin() as conn:
        ctx = MigrationContext.configure(conn)
        with Operations.context(ctx):
            mig.upgrade()

    with engine.begin() as conn:
        rows = conn.execute(text(
            "SELECT name FROM jobs ORDER BY id"
        )).fetchall()

    assert [r.name for r in rows] == ["My App - Run Thing", "Other - Convert"]
