"""Add interface history and test case tables

Revision ID: 5bd43f96a6c1
Revises: 6f165be7569b
Create Date: 2026-02-11 21:43:23.880652

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite, postgresql

# revision identifiers, used by Alembic.
revision: str = '5bd43f96a6c1'
down_revision: Union[str, Sequence[str], None] = '6f165be7569b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Use JSON type compatible with both SQLite and PostgreSQL
JSON = sa.JSON()
if op.get_context().dialect.name == 'postgresql':
    JSON = postgresql.JSON()
else:
    JSON = sa.JSON()


def upgrade() -> None:
    """Upgrade schema."""

    # Add order column to interfacefolder
    op.add_column('interfacefolder', sa.Column('order', sa.Integer(), nullable=False, server_default='0'))

    # Add order and auth_config columns to interface
    op.add_column('interface', sa.Column('order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('interface', sa.Column('auth_config', JSON, nullable=True, server_default='{}'))

    # Add is_preupload column to projectenvironment
    op.add_column('projectenvironment', sa.Column('is_preupload', sa.Boolean(), nullable=False, server_default='0'))

    # Create interfacehistory table
    op.create_table(
        'interfacehistory',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('interface_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('method', sa.String(length=10), nullable=False),
        sa.Column('headers', JSON, nullable=True, server_default='{}'),
        sa.Column('params', JSON, nullable=True, server_default='{}'),
        sa.Column('body', JSON, nullable=True, server_default='{}'),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('response_headers', JSON, nullable=True, server_default='{}'),
        sa.Column('response_body', JSON, nullable=True, server_default='{}'),
        sa.Column('elapsed', sa.Float(), nullable=True),
        sa.Column('timeline', JSON, nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['interface_id'], ['interface.id']),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for interfacehistory
    op.create_index('idx_interface_history_interface_id', 'interfacehistory', ['interface_id'])
    op.create_index('idx_interface_history_user_id', 'interfacehistory', ['user_id'])
    op.create_index('idx_interface_history_created_at', 'interfacehistory', ['created_at'])

    # Create interfacetestcase table
    op.create_table(
        'interfacetestcase',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('interface_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('keyword_name', sa.String(length=100), nullable=False),
        sa.Column('yaml_path', sa.String(length=255), nullable=False),
        sa.Column('scenario_id', sa.Integer(), nullable=True),
        sa.Column('assertions', JSON, nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['interface_id'], ['interface.id']),
        sa.ForeignKeyConstraint(['project_id'], ['project.id']),
        sa.ForeignKeyConstraint(['scenario_id'], ['scenario.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('yaml_path', name='uq_interface_test_case_yaml_path')
    )

    # Create indexes for interfacetestcase
    op.create_index('idx_interface_test_case_interface_id', 'interfacetestcase', ['interface_id'])
    op.create_index('idx_interface_test_case_project_id', 'interfacetestcase', ['project_id'])
    op.create_index('idx_interface_test_case_yaml_path', 'interfacetestcase', ['yaml_path'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""

    # Drop interfacetestcase table
    op.drop_index('idx_interface_test_case_yaml_path', table_name='interfacetestcase')
    op.drop_index('idx_interface_test_case_project_id', table_name='interfacetestcase')
    op.drop_index('idx_interface_test_case_interface_id', table_name='interfacetestcase')
    op.drop_table('interfacetestcase')

    # Drop interfacehistory table
    op.drop_index('idx_interface_history_created_at', table_name='interfacehistory')
    op.drop_index('idx_interface_history_user_id', table_name='interfacehistory')
    op.drop_index('idx_interface_history_interface_id', table_name='interfacehistory')
    op.drop_table('interfacehistory')

    # Remove is_preupload from projectenvironment
    op.drop_column('projectenvironment', 'is_preupload')

    # Remove order and auth_config from interface
    op.drop_column('interface', 'auth_config')
    op.drop_column('interface', 'order')

    # Remove order from interfacefolder
    op.drop_column('interfacefolder', 'order')
