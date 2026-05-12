"""change_shipping_address_to_json

Revision ID: 656108e78ec1
Revises: 239688c9b228
Create Date: 2026-03-20 13:08:02.422420+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "656108e78ec1"
down_revision: Union[str, None] = "239688c9b228"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade database schema."""
    # Change shipping_address from Text to JSON
    op.execute("""
        ALTER TABLE orders 
        ALTER COLUMN shipping_address TYPE JSON 
        USING shipping_address::json
    """)


def downgrade() -> None:
    """Downgrade database schema."""
    # Change shipping_address from JSON back to Text
    op.execute("""
        ALTER TABLE orders 
        ALTER COLUMN shipping_address TYPE TEXT 
        USING shipping_address::text
    """)
