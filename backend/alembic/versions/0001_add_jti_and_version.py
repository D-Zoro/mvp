"""Add jti field to User tokens and version field to Books.

Revision ID: 0001_add_jti_version
Revises: 20260320_1308_656108e78ec1
Create Date: 2026-05-01 13:00:00.000000

This migration:
1. Adds `jti` (JWT ID) field to User table for token revocation
2. Adds `version` field to Books table for optimistic locking
3. Backfills existing tokens with UUID-based JTI
4. Makes jti NOT NULL after backfill
"""
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '0001_add_jti_version'
down_revision = '20260320_1308_656108e78ec1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply migration: add jti and version fields."""
    # Step 1: Add jti column as nullable (allows existing rows)
    op.add_column(
        'users',
        sa.Column(
            'jti',
            postgresql.UUID(as_uuid=True),
            nullable=True,
            doc='JWT ID for token revocation tracking'
        )
    )

    # Step 2: Add version column to books (default 0)
    op.add_column(
        'books',
        sa.Column(
            'version',
            sa.Integer(),
            nullable=False,
            server_default='0',
            doc='Version field for optimistic locking'
        )
    )

    # Step 3: Backfill existing users with UUID-based JTI
    connection = op.get_bind()
    # For PostgreSQL, generate UUIDs for all existing users
    connection.execute(
        sa.text(
            "UPDATE users SET jti = gen_random_uuid() WHERE jti IS NULL"
        )
    )

    # Step 4: Make jti NOT NULL after backfill
    op.alter_column(
        'users',
        'jti',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
        existing_nullable=True
    )

    # Step 5: Add unique index on jti
    op.create_index(
        'ix_users_jti',
        'users',
        ['jti'],
        unique=True
    )


def downgrade() -> None:
    """Revert migration: remove jti and version fields."""
    # Step 1: Drop unique index on jti
    op.drop_index('ix_users_jti', table_name='users')

    # Step 2: Drop jti column
    op.drop_column('users', 'jti')

    # Step 3: Drop version column
    op.drop_column('books', 'version')
