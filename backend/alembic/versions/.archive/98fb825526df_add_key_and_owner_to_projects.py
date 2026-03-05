"""Add key and owner to projects

Revision ID: 98fb825526df
Revises: 001_initial
Create Date: 2026-02-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98fb825526df'
down_revision: Union[str, Sequence[str], None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 添加 key 字段（带默认值，因为已有数据）
    # SQLite 限制：对于非空表，添加非空列需要提供默认值
    op.add_column('projects', sa.Column('key', sa.String(length=100), nullable=False, server_default='PROJ-000'))
    op.create_index(op.f('ix_projects_key'), 'projects', ['key'], unique=True)

    # 添加 owner 字段（可为空）
    # 注意：SQLite 不支持直接添加外键约束，外键关系在应用层处理
    op.add_column('projects', sa.Column('owner', sa.String(length=36), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_projects_key'), table_name='projects')
    op.drop_column('projects', 'owner')
    op.drop_column('projects', 'key')
