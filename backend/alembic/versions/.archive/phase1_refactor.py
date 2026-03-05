"""Phase 1 refactor - UUID migration and new models

Revision ID: phase1_refactor
Revises: 43d7bf1d9c9f
Create Date: 2026-03-04

This migration:
1. Drops ALL foreign key constraints
2. Drops legacy tables that are no longer needed
3. Converts existing tables from VARCHAR(36) to native UUID type
4. Creates new tables for the refactored models
5. Recreates foreign key constraints for remaining tables
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = 'phase1_refactor'
down_revision: Union[str, Sequence[str], None] = '43d7bf1d9c9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Get database connection
    conn = op.get_bind()

    # ============================================
    # Step 1: Drop ALL foreign key constraints
    # ============================================

    # Get all foreign key constraints
    result = conn.execute(text("""
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints AS tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    """))

    for row in result:
        table_name = row[0]
        constraint_name = row[1]
        op.execute(text(f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {constraint_name}"))

    # ============================================
    # Step 2: Drop legacy tables that are no longer needed
    # ============================================

    legacy_tables = [
        'test_case_knowledge',
        'audit_logs',
        'roles',
        'role_permissions',
        'project_data_sources',
        'plan_execution_steps',
        'document',
        'project_environments',
        'documentversion',
        'file_attachments',
        'test_points',
        'env_variables',
        'notificationchannel',
        'ai_conversations',
        'api_test_executions',
        'globalconfig',
        'datasets',
        'api_test_cases',
        'api_test_step_results',
        'testcase',
        'testreportdetail',
        'userrole',
        'test_case_templates',
        'permissions',
        'test_cases',
        'requirements',
        'test_executions',
        'test_plan_executions',
        'interfacetestcase',
        'ai_provider_configs',
        'api_test_steps',
        'testreport',
    ]

    for table in legacy_tables:
        op.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))

    # ============================================
    # Step 3: Convert core tables to use UUID type
    # ============================================

    # Convert users.id from VARCHAR(36) to UUID
    op.execute(text("""
        ALTER TABLE users
        ALTER COLUMN id TYPE UUID USING id::UUID
    """))

    # Convert projects.id, projects.created_by, projects.owner from VARCHAR(36) to UUID
    op.execute(text("""
        ALTER TABLE projects
        ALTER COLUMN id TYPE UUID USING id::UUID,
        ALTER COLUMN created_by TYPE UUID USING created_by::UUID,
        ALTER COLUMN owner TYPE UUID USING owner::UUID
    """))

    # Convert keywords - first delete non-UUID records (built-in keywords will be re-seeded)
    op.execute(text("""
        DELETE FROM keywords WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    """))
    op.execute(text("""
        ALTER TABLE keywords
        ALTER COLUMN id TYPE UUID USING id::UUID,
        ALTER COLUMN project_id TYPE UUID USING project_id::UUID
    """))

    # Convert scenarios
    op.execute(text("""
        ALTER TABLE scenarios
        ALTER COLUMN id TYPE UUID USING id::UUID,
        ALTER COLUMN project_id TYPE UUID USING project_id::UUID,
        ALTER COLUMN created_by TYPE UUID USING created_by::UUID
    """))

    # Convert scenario_steps
    op.execute(text("""
        ALTER TABLE scenario_steps
        ALTER COLUMN id TYPE UUID USING id::UUID,
        ALTER COLUMN scenario_id TYPE UUID USING scenario_id::UUID
    """))

    # Convert test_plans
    op.execute(text("""
        ALTER TABLE test_plans
        ALTER COLUMN id TYPE UUID USING id::UUID,
        ALTER COLUMN project_id TYPE UUID USING project_id::UUID
    """))

    # Convert plan_scenarios
    op.execute(text("""
        ALTER TABLE plan_scenarios
        ALTER COLUMN id TYPE UUID USING id::UUID,
        ALTER COLUMN test_plan_id TYPE UUID USING test_plan_id::UUID,
        ALTER COLUMN scenario_id TYPE UUID USING scenario_id::UUID
    """))

    # Convert database_configs
    op.execute(text("""
        ALTER TABLE database_configs
        ALTER COLUMN id TYPE UUID USING id::UUID,
        ALTER COLUMN project_id TYPE UUID USING project_id::UUID
    """))

    # Convert interface_folders
    op.execute(text("""
        ALTER TABLE interface_folders
        ALTER COLUMN id TYPE UUID USING id::UUID,
        ALTER COLUMN project_id TYPE UUID USING project_id::UUID,
        ALTER COLUMN parent_id TYPE UUID USING parent_id::UUID
    """))

    # Convert interfaces
    op.execute(text("""
        ALTER TABLE interfaces
        ALTER COLUMN id TYPE UUID USING id::UUID,
        ALTER COLUMN project_id TYPE UUID USING project_id::UUID,
        ALTER COLUMN folder_id TYPE UUID USING folder_id::UUID
    """))

    # Convert global_params
    op.execute(text("""
        ALTER TABLE global_params
        ALTER COLUMN id TYPE UUID USING id::UUID,
        ALTER COLUMN created_by TYPE UUID USING created_by::UUID
    """))

    # ============================================
    # Step 4: Create new tables
    # ============================================

    # Create environments table
    op.create_table(
        'environments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('base_url', sa.String(500), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_environments_project_id', 'environments', ['project_id'])

    # Create global_variables table
    op.create_table(
        'global_variables',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('key', sa.String(255), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_global_variables_project_id', 'global_variables', ['project_id'])

    # Create environment_variables table
    op.create_table(
        'environment_variables',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('environment_id', sa.UUID(), nullable=False),
        sa.Column('key', sa.String(255), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['environment_id'], ['environments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_environment_variables_environment_id', 'environment_variables', ['environment_id'])

    # Create executions table
    op.create_table(
        'executions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('plan_id', sa.UUID(), nullable=True),
        sa.Column('scenario_id', sa.UUID(), nullable=True),
        sa.Column('environment_id', sa.UUID(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('total_steps', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('passed_steps', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('failed_steps', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('skipped_steps', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('config', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['plan_id'], ['test_plans.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['scenario_id'], ['scenarios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['environment_id'], ['environments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_executions_plan_id', 'executions', ['plan_id'])
    op.create_index('ix_executions_scenario_id', 'executions', ['scenario_id'])
    op.create_index('ix_executions_environment_id', 'executions', ['environment_id'])
    op.create_index('ix_executions_created_by', 'executions', ['created_by'])

    # Create execution_steps table
    op.create_table(
        'execution_steps',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('execution_id', sa.UUID(), nullable=False),
        sa.Column('scenario_id', sa.UUID(), nullable=True),
        sa.Column('step_name', sa.String(255), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('request_data', postgresql.JSONB(), nullable=True),
        sa.Column('response_data', postgresql.JSONB(), nullable=True),
        sa.Column('assertion_results', postgresql.JSONB(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['execution_id'], ['executions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['scenario_id'], ['scenarios.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_execution_steps_execution_id', 'execution_steps', ['execution_id'])
    op.create_index('ix_execution_steps_scenario_id', 'execution_steps', ['scenario_id'])

    # Create reports table
    op.create_table(
        'reports',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('execution_id', sa.UUID(), nullable=False),
        sa.Column('report_type', sa.String(50), nullable=False, server_default='html'),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['execution_id'], ['executions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_reports_execution_id', 'reports', ['execution_id'])

    # Create test_datasets table
    op.create_table(
        'test_datasets',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('scenario_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['scenario_id'], ['scenarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_test_datasets_scenario_id', 'test_datasets', ['scenario_id'])

    # Create dataset_rows table
    op.create_table(
        'dataset_rows',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('dataset_id', sa.UUID(), nullable=False),
        sa.Column('row_data', postgresql.JSONB(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True, server_default='0'),
        sa.ForeignKeyConstraint(['dataset_id'], ['test_datasets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_dataset_rows_dataset_id', 'dataset_rows', ['dataset_id'])

    # ============================================
    # Step 5: Recreate foreign key constraints for remaining tables
    # ============================================

    op.execute(text("""
        ALTER TABLE projects
        ADD CONSTRAINT projects_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    """))

    op.execute(text("""
        ALTER TABLE projects
        ADD CONSTRAINT projects_owner_fkey
        FOREIGN KEY (owner) REFERENCES users(id) ON DELETE SET NULL
    """))

    op.execute(text("""
        ALTER TABLE keywords
        ADD CONSTRAINT keywords_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    """))

    op.execute(text("""
        ALTER TABLE scenarios
        ADD CONSTRAINT scenarios_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    """))

    op.execute(text("""
        ALTER TABLE scenarios
        ADD CONSTRAINT scenarios_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    """))

    op.execute(text("""
        ALTER TABLE scenario_steps
        ADD CONSTRAINT scenario_steps_scenario_id_fkey
        FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
    """))

    op.execute(text("""
        ALTER TABLE test_plans
        ADD CONSTRAINT test_plans_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    """))

    op.execute(text("""
        ALTER TABLE plan_scenarios
        ADD CONSTRAINT plan_scenarios_test_plan_id_fkey
        FOREIGN KEY (test_plan_id) REFERENCES test_plans(id) ON DELETE CASCADE
    """))

    op.execute(text("""
        ALTER TABLE plan_scenarios
        ADD CONSTRAINT plan_scenarios_scenario_id_fkey
        FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
    """))

    op.execute(text("""
        ALTER TABLE database_configs
        ADD CONSTRAINT database_configs_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    """))

    op.execute(text("""
        ALTER TABLE interface_folders
        ADD CONSTRAINT interface_folders_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    """))

    op.execute(text("""
        ALTER TABLE interface_folders
        ADD CONSTRAINT interface_folders_parent_id_fkey
        FOREIGN KEY (parent_id) REFERENCES interface_folders(id) ON DELETE SET NULL
    """))

    op.execute(text("""
        ALTER TABLE interfaces
        ADD CONSTRAINT interfaces_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    """))

    op.execute(text("""
        ALTER TABLE interfaces
        ADD CONSTRAINT interfaces_folder_id_fkey
        FOREIGN KEY (folder_id) REFERENCES interface_folders(id) ON DELETE SET NULL
    """))

    # ============================================
    # Step 6: Modify existing tables for new schema
    # ============================================

    # Add new columns to database_configs
    op.add_column('database_configs', sa.Column('database', sa.Text(), nullable=True))
    op.add_column('database_configs', sa.Column('reference_var', sa.String(255), nullable=True))
    op.add_column('database_configs', sa.Column('last_check_at', sa.DateTime(), nullable=True))

    # Drop old columns from database_configs
    op.drop_column('database_configs', 'initial_database', if_exists=True)
    op.drop_column('database_configs', 'variable_name', if_exists=True)
    op.drop_column('database_configs', 'updated_at', if_exists=True)
    op.drop_column('database_configs', 'last_tested_at', if_exists=True)

    # Add new columns to global_params
    op.add_column('global_params', sa.Column('input_params', postgresql.JSONB(), nullable=True))
    op.add_column('global_params', sa.Column('output_params', postgresql.JSONB(), nullable=True))

    # Drop old columns from global_params
    op.drop_column('global_params', 'created_by', if_exists=True)
    op.drop_column('global_params', 'parameters', if_exists=True)
    op.drop_column('global_params', 'updated_at', if_exists=True)
    op.drop_column('global_params', 'return_value', if_exists=True)

    # Add new columns to interface_folders
    op.add_column('interface_folders', sa.Column('sort_order', sa.Integer(), nullable=True, server_default='0'))

    # Drop old columns from interface_folders
    op.drop_column('interface_folders', 'order', if_exists=True)

    # Add new columns to interfaces
    op.add_column('interfaces', sa.Column('path', sa.String(500), nullable=True))
    op.add_column('interfaces', sa.Column('sort_order', sa.Integer(), nullable=True, server_default='0'))

    # Drop old columns from interfaces
    op.drop_column('interfaces', 'cookies', if_exists=True)
    op.drop_column('interfaces', 'schema_snapshot', if_exists=True)
    op.drop_column('interfaces', 'status', if_exists=True)
    op.drop_column('interfaces', 'body_type', if_exists=True)
    op.drop_column('interfaces', 'order', if_exists=True)
    op.drop_column('interfaces', 'url', if_exists=True)
    op.drop_column('interfaces', 'auth_config', if_exists=True)

    # Add new columns to keywords
    op.add_column('keywords', sa.Column('keyword_type', sa.String(50), nullable=True, server_default='custom'))
    op.add_column('keywords', sa.Column('params_schema', postgresql.JSONB(), nullable=True))
    op.add_column('keywords', sa.Column('is_builtin', sa.Boolean(), nullable=True, server_default='false'))

    # Drop old columns from keywords
    op.drop_column('keywords', 'class_name', if_exists=True)
    op.drop_column('keywords', 'parameters', if_exists=True)
    op.drop_column('keywords', 'description', if_exists=True)
    op.drop_column('keywords', 'return_type', if_exists=True)
    op.drop_column('keywords', 'updated_at', if_exists=True)
    op.drop_column('keywords', 'is_built_in', if_exists=True)

    # Add new columns to plan_scenarios
    op.add_column('plan_scenarios', sa.Column('plan_id', sa.UUID(), nullable=True))
    op.add_column('plan_scenarios', sa.Column('dataset_id', sa.UUID(), nullable=True))
    op.add_column('plan_scenarios', sa.Column('variables_override', postgresql.JSONB(), nullable=True))
    op.add_column('plan_scenarios', sa.Column('sort_order', sa.Integer(), nullable=True, server_default='0'))

    # Drop old columns from plan_scenarios
    op.drop_column('plan_scenarios', 'test_plan_id', if_exists=True)
    op.drop_column('plan_scenarios', 'execution_order', if_exists=True)

    # Add new columns to scenario_steps
    op.add_column('scenario_steps', sa.Column('name', sa.String(255), nullable=True))
    op.add_column('scenario_steps', sa.Column('keyword_method', sa.String(255), nullable=True))
    op.add_column('scenario_steps', sa.Column('config', postgresql.JSONB(), nullable=True))

    # Drop old columns from scenario_steps
    op.drop_column('scenario_steps', 'parameters', if_exists=True)
    op.drop_column('scenario_steps', 'description', if_exists=True)
    op.drop_column('scenario_steps', 'keyword_name', if_exists=True)
    op.drop_column('scenario_steps', 'updated_at', if_exists=True)

    # Add new columns to users
    op.add_column('users', sa.Column('password_hash', sa.String(255), nullable=True))

    # Drop old columns from users
    op.drop_column('users', 'oauth_id', if_exists=True)
    op.drop_column('users', 'hashed_password', if_exists=True)
    op.drop_column('users', 'oauth_provider', if_exists=True)
    op.drop_column('users', 'full_name', if_exists=True)
    op.drop_column('users', 'avatar', if_exists=True)

    # Drop old columns from test_plans
    op.drop_column('test_plans', 'status', if_exists=True)
    op.drop_column('test_plans', 'next_run', if_exists=True)
    op.drop_column('test_plans', 'cron_expression', if_exists=True)
    op.drop_column('test_plans', 'last_run', if_exists=True)

    # Drop old columns from projects
    op.drop_column('projects', 'key', if_exists=True)
    op.drop_column('projects', 'owner', if_exists=True)

    # Drop old columns from scenarios
    op.drop_column('scenarios', 'created_by', if_exists=True)

    print("Phase 1 refactor migration completed successfully")


def downgrade() -> None:
    """Downgrade schema - not recommended for production."""
    # This is a complex migration, downgrade is not fully supported
    # In production, restore from backup instead
    print("WARNING: Downgrade not fully implemented for this migration")
