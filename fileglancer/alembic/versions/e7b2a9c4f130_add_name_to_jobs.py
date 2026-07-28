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
