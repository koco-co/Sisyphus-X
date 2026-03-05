"""Merge migration branches

Revision ID: 43d7bf1d9c9f
Revises: add_global_params, b9849f1b4fe4
Create Date: 2026-02-18 14:30:51.316969

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '43d7bf1d9c9f'
down_revision: Union[str, Sequence[str], None] = ('add_global_params', 'b9849f1b4fe4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
