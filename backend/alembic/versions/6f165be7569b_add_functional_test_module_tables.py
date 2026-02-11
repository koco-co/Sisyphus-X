"""Add functional test module tables

Revision ID: 6f165be7569b
Revises: ad3c4345ee46
Create Date: 2026-01-30 23:13:37.116098

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '6f165be7569b'
down_revision: Union[str, Sequence[str], None] = 'ad3c4345ee46'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 创建AI厂商配置表
    op.create_table('ai_provider_configs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('provider_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('provider_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('api_key_encrypted', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('api_endpoint', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('model_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('temperature', sa.Float(), nullable=False),
    sa.Column('max_tokens', sa.Integer(), nullable=False),
    sa.Column('is_enabled', sa.Boolean(), nullable=False),
    sa.Column('is_default', sa.Boolean(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'provider_type', name='unique_user_provider')
    )
    with op.batch_alter_table('ai_provider_configs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_ai_provider_configs_user_id'), ['user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_ai_provider_configs_is_enabled'), ['is_enabled', 'is_default'], unique=False)

    # 创建需求表
    op.create_table('requirements',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('requirement_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('module_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('module_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('iteration', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('priority', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('attachments', sa.JSON(), nullable=True),
    sa.Column('ai_conversation_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('clarification_status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('risk_points', sa.JSON(), nullable=True),
    sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('test_case_suite_id', sa.Integer(), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('requirement_id')
    )
    with op.batch_alter_table('requirements', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_requirements_requirement_id'), ['requirement_id'], unique=True)
        batch_op.create_index(batch_op.f('ix_requirements_module_id'), ['module_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_requirements_status'), ['status'], unique=False)
        batch_op.create_index(batch_op.f('ix_requirements_created_by'), ['created_by'], unique=False)

    # 创建AI对话历史表
    op.create_table('ai_conversations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('conversation_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('requirement_id', sa.Integer(), nullable=True),
    sa.Column('session_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('ai_model_used', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('messages', sa.JSON(), nullable=False),
    sa.Column('created_by', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('conversation_id')
    )
    with op.batch_alter_table('ai_conversations', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_ai_conversations_conversation_id'), ['conversation_id'], unique=True)
        batch_op.create_index(batch_op.f('ix_ai_conversations_requirement_id'), ['requirement_id'], unique=False)

    # 创建测试点表
    op.create_table('test_points',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('requirement_id', sa.Integer(), nullable=False),
    sa.Column('category', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('sub_category', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('priority', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('risk_level', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('is_ai_generated', sa.Boolean(), nullable=False),
    sa.Column('confidence_score', sa.Float(), nullable=True),
    sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('test_points', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_test_points_requirement_id'), ['requirement_id'], unique=False)

    # 创建测试用例表
    op.create_table('test_cases',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('case_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('requirement_id', sa.Integer(), nullable=False),
    sa.Column('test_suite_id', sa.Integer(), nullable=True),
    sa.Column('test_point_id', sa.Integer(), nullable=True),
    sa.Column('module_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('page_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('priority', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('case_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('preconditions', sa.JSON(), nullable=True),
    sa.Column('steps', sa.JSON(), nullable=True),
    sa.Column('tags', sa.JSON(), nullable=True),
    sa.Column('is_automated', sa.Boolean(), nullable=False),
    sa.Column('complexity', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('estimated_time', sa.Integer(), nullable=False),
    sa.Column('is_ai_generated', sa.Boolean(), nullable=False),
    sa.Column('ai_model', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_by', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('case_id')
    )
    with op.batch_alter_table('test_cases', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_test_cases_case_id'), ['case_id'], unique=True)
        batch_op.create_index(batch_op.f('ix_test_cases_requirement_id'), ['requirement_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_test_cases_priority'), ['priority'], unique=False)

    # 创建测试用例知识库表
    op.create_table('test_case_knowledge',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('test_case_id', sa.Integer(), nullable=False),
    sa.Column('embedding', sa.JSON(), nullable=True),  # JSON type for SQLite compatibility
    sa.Column('embedding_model', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('module_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('priority', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('case_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('tags', sa.JSON(), nullable=True),
    sa.Column('quality_score', sa.Float(), nullable=False),
    sa.Column('usage_count', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('test_case_id', 'embedding_model', name='unique_case_embedding')
    )
    with op.batch_alter_table('test_case_knowledge', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_test_case_knowledge_test_case_id'), ['test_case_id'], unique=True)

    # 创建测试用例模板表
    op.create_table('test_case_templates',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('category', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('template_structure', sa.JSON(), nullable=True),
    sa.Column('usage_count', sa.Integer(), nullable=False),
    sa.Column('is_system', sa.Boolean(), nullable=False),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )

    # 创建文件存储记录表
    op.create_table('file_attachments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('file_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('filename', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('file_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('file_size', sa.Integer(), nullable=False),
    sa.Column('file_path', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('entity_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('entity_id', sa.Integer(), nullable=False),
    sa.Column('uploaded_by', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('file_id')
    )
    with op.batch_alter_table('file_attachments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_file_attachments_file_id'), ['file_id'], unique=True)

    # 删除旧表（如果存在）
    op.drop_table('aigenerationtask', if_exists=True)
    op.drop_table('document', if_exists=True)
    op.drop_table('role', if_exists=True)
    op.drop_table('test_executions', if_exists=True)
    op.drop_table('globalconfig', if_exists=True)
    op.drop_table('functionaltestcase', if_exists=True)
    op.drop_table('notificationchannel', if_exists=True)
    op.drop_table('userrole', if_exists=True)
    op.drop_table('requirement', if_exists=True)
    op.drop_table('documentversion', if_exists=True)


def downgrade() -> None:
    """Downgrade schema."""
    # 删除新表
    op.drop_table('file_attachments')
    op.drop_table('test_case_templates')
    op.drop_table('test_case_knowledge')
    op.drop_table('test_cases')
    op.drop_table('test_points')
    op.drop_table('ai_conversations')
    op.drop_table('requirements')
    op.drop_table('ai_provider_configs')

    # 恢复旧表
    op.create_table('requirement',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('project_id', sa.INTEGER(), nullable=False),
    sa.Column('requirement_id', sa.VARCHAR(), nullable=False),
    sa.Column('name', sa.VARCHAR(), nullable=False),
    sa.Column('description', sa.VARCHAR(), nullable=True),
    sa.Column('source', sa.VARCHAR(), nullable=True),
    sa.Column('document_url', sa.VARCHAR(), nullable=True),
    sa.Column('status', sa.VARCHAR(), nullable=False),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('updated_at', sa.DATETIME(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('functionaltestcase',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('requirement_id', sa.INTEGER(), nullable=False),
    sa.Column('title', sa.VARCHAR(), nullable=False),
    sa.Column('priority', sa.VARCHAR(), nullable=False),
    sa.Column('precondition', sa.VARCHAR(), nullable=True),
    sa.Column('steps', sa.JSON(), nullable=True),
    sa.Column('expected_result', sa.VARCHAR(), nullable=True),
    sa.Column('status', sa.VARCHAR(), nullable=False),
    sa.Column('created_by', sa.VARCHAR(), nullable=True),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('updated_at', sa.DATETIME(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('aigenerationtask',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('requirement_id', sa.INTEGER(), nullable=False),
    sa.Column('model', sa.VARCHAR(), nullable=False),
    sa.Column('prompt', sa.VARCHAR(), nullable=True),
    sa.Column('status', sa.VARCHAR(), nullable=False),
    sa.Column('result', sa.JSON(), nullable=True),
    sa.Column('error_message', sa.VARCHAR(), nullable=True),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('completed_at', sa.DATETIME(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
