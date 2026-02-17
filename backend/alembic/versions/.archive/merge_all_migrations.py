"""Merge all migrations

Revision ID: merge_all
Revises: add_interface_fields, 5bd43f96a6c1
Create Date: 2026-02-15 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'merge_all'
down_revision: Union[str, Sequence[str], None] = ('add_interface_fields', '5bd43f96a6c1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge migration heads."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
