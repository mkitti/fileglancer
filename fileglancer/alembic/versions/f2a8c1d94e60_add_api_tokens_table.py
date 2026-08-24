"""add api_tokens table

Revision ID: f2a8c1d94e60
Revises: e7b2a9c4f130
Create Date: 2026-08-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f2a8c1d94e60'
down_revision = 'e7b2a9c4f130'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'api_tokens',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('token_id', sa.String(), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('scopes', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_api_tokens_token_id', 'api_tokens', ['token_id'], unique=True)
    op.create_index('ix_api_tokens_username', 'api_tokens', ['username'])


def downgrade() -> None:
    op.drop_index('ix_api_tokens_username', table_name='api_tokens')
    op.drop_index('ix_api_tokens_token_id', table_name='api_tokens')
    op.drop_table('api_tokens')
