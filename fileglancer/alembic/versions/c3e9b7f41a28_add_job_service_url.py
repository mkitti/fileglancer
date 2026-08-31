"""add service_url to jobs

Revision ID: c3e9b7f41a28
Revises: f2a8c1d94e60
Create Date: 2026-08-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3e9b7f41a28'
down_revision = 'f2a8c1d94e60'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('service_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('jobs', 'service_url')
