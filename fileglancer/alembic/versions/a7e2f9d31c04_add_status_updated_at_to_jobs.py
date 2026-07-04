"""add status_updated_at column to jobs

Revision ID: a7e2f9d31c04
Revises: f4a1d8c62e97
Create Date: 2026-07-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7e2f9d31c04'
down_revision = 'f4a1d8c62e97'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('status_updated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('jobs', 'status_updated_at')
