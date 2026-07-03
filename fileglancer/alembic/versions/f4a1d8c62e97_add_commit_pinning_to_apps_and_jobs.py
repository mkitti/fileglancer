"""add commit pinning to user_apps and jobs

Revision ID: f4a1d8c62e97
Revises: c1f9a4e7b2d8
Create Date: 2026-07-02 00:00:00.000000

user_apps.commit_sha pins each app to the exact commit it was added or last
updated at; jobs run from an immutable per-SHA snapshot of that commit rather
than the mutable branch clone. code_commit_sha is the equivalent pin for a
manifest's separate code repo (repo_url), when one is declared.
jobs.commit_sha records the commit whose code the job actually executed, and
jobs.code_repo_url the repo that commit belongs to when it isn't the app repo.

All columns are nullable: legacy rows have no pin and are backfilled the next
time the app is launched or updated.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4a1d8c62e97'
down_revision = 'c1f9a4e7b2d8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user_apps', sa.Column('commit_sha', sa.String(), nullable=True))
    op.add_column('user_apps', sa.Column('code_commit_sha', sa.String(), nullable=True))
    op.add_column('jobs', sa.Column('commit_sha', sa.String(), nullable=True))
    op.add_column('jobs', sa.Column('code_repo_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('jobs', 'code_repo_url')
    op.drop_column('jobs', 'commit_sha')
    op.drop_column('user_apps', 'code_commit_sha')
    op.drop_column('user_apps', 'commit_sha')
