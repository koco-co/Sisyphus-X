"""Initial schema - complete database structure

Revision ID: 001_initial
Revises:
Create Date: 2026-02-16
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite, postgresql

revision = '001_initial'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def get_json_type():
    context = op.get_context()
    if context.dialect.name == 'postgresql':
        from sqlalchemy.dialects import postgresql
        return postgresql.JSON()
    else:
        return sa.JSON()

def upgrade() -> None:
    JSON = get_json_type()
    
    # Users table with UUID primary key
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('email', sa.String(100), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=True),
        sa.Column('avatar', sa.String(500), nullable=True),
        sa.Column('full_name', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('oauth_provider', sa.String(50), nullable=True),
        sa.Column('oauth_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_users_email', 'users', ['email'], unique=True)
    op.create_index('idx_users_username', 'users', ['username'], unique=True)
    
    # Projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_projects_created_by_name', 'projects', ['created_by', 'name'], unique=True)
    
    # Keywords table
    op.create_table(
        'keywords',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('project_id', sa.String(36), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('class_name', sa.String(100), nullable=False),
        sa.Column('method_name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('code', sa.Text(), nullable=False),
        sa.Column('parameters', sa.Text(), nullable=True),
        sa.Column('return_type', sa.String(100), nullable=True),
        sa.Column('is_built_in', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_keywords_class_method', 'keywords', ['class_name', 'method_name'], unique=True)
    op.create_index('ix_keywords_is_built_in', 'keywords', ['is_built_in'], unique=False)
    op.create_index('ix_keywords_is_enabled', 'keywords', ['is_enabled'], unique=False)

    # TestScenarios table
    op.create_table(
        'test_scenarios',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('project_id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('pre_sql', sa.Text(), nullable=True),
        sa.Column('post_sql', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_test_scenarios_project_id', 'test_scenarios', ['project_id'], unique=False)

    # TestPlans table with scheduling fields
    op.create_table(
        'test_plans',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('project_id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cron_expression', sa.String(255), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('next_run', sa.DateTime(), nullable=True),
        sa.Column('last_run', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_test_plans_project_id', 'test_plans', ['project_id'], unique=False)
    op.create_index('ix_test_plans_status', 'test_plans', ['status'], unique=False)

    # PlanScenarios table (many-to-many relationship)
    op.create_table(
        'plan_scenarios',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('test_plan_id', sa.String(36), nullable=False),
        sa.Column('scenario_id', sa.String(36), nullable=False),
        sa.Column('execution_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['test_plan_id'], ['test_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['scenario_id'], ['test_scenarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_plan_scenarios_test_plan_id', 'plan_scenarios', ['test_plan_id'], unique=False)
    op.create_index('ix_plan_scenarios_scenario_id', 'plan_scenarios', ['scenario_id'], unique=False)
    op.create_index('idx_plan_scenarios_plan_order', 'plan_scenarios', ['test_plan_id', 'execution_order'], unique=True)

    # TestPlanExecutions table
    op.create_table(
        'test_plan_executions',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('test_plan_id', sa.String(36), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('total_scenarios', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('passed_scenarios', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_scenarios', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('skipped_scenarios', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['test_plan_id'], ['test_plans.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_test_plan_executions_test_plan_id', 'test_plan_executions', ['test_plan_id'], unique=False)
    op.create_index('ix_test_plan_executions_status', 'test_plan_executions', ['status'], unique=False)

    # PlanExecutionSteps table
    op.create_table(
        'plan_execution_steps',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('test_plan_execution_id', sa.String(36), nullable=False),
        sa.Column('scenario_id', sa.String(36), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['test_plan_execution_id'], ['test_plan_executions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_plan_execution_steps_test_plan_execution_id', 'plan_execution_steps', ['test_plan_execution_id'], unique=False)
    op.create_index('ix_plan_execution_steps_status', 'plan_execution_steps', ['status'], unique=False)

    print("✅ Initial schema created successfully")

def downgrade() -> None:
    # Drop in reverse order of creation
    op.drop_table('plan_execution_steps')
    op.drop_table('test_plan_executions')
    op.drop_table('plan_scenarios')
    op.drop_table('test_plans')
    op.drop_table('test_scenarios')
    op.drop_table('keywords')
    op.drop_table('projects')
    op.drop_table('users')
