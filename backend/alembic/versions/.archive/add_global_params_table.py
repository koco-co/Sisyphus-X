"""add global_params table

Revision ID: add_global_params
Revises: 98fb825526df
Create Date: 2026-02-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_global_params'
down_revision = '98fb825526df'
branch_labels = None
depends_on = None


def upgrade():
    """创建全局参数表"""
    op.create_table(
        'global_params',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('class_name', sa.String(255), nullable=False),
        sa.Column('method_name', sa.String(255), nullable=False),
        sa.Column('code', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('parameters', sa.Text(), nullable=True),
        sa.Column('return_value', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('class_name', 'method_name', name='uq_global_params_class_method'),
    )

    # 创建索引
    op.create_index('idx_global_params_class_name', 'global_params', ['class_name'])
    op.create_index('idx_global_params_created_by', 'global_params', ['created_by'])


def downgrade():
    """删除全局参数表"""
    op.drop_index('idx_global_params_created_by', table_name='global_params')
    op.drop_index('idx_global_params_class_name', table_name='global_params')
    op.drop_table('global_params')
