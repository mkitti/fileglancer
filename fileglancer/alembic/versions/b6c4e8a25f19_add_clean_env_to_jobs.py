"""add clean_env to jobs

Revision ID: b6c4e8a25f19
Revises: a7e2f9d31c04
Create Date: 2026-07-08 00:00:00.000000

jobs.clean_env records whether the job ran in a clean shell (minimal
constructed environment) instead of the user's login environment. Nullable:
legacy rows predate the option, and NULL reads the same as False.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b6c4e8a25f19'
down_revision = 'a7e2f9d31c04'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('clean_env', sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column('jobs', 'clean_env')
