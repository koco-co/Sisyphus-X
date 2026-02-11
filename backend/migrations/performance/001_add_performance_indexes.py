"""
性能优化索引迁移脚本

添加缺失的数据库索引以提升查询性能。

运行方式:
    cd backend
    uv run alembic revision -m "Add performance indexes"
    # 然后手动将此文件内容复制到生成的迁移文件中
    uv run alembic upgrade head
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001_add_performance_indexes'
down_revision = None  # 替换为实际的上一版本
branch_labels = None
depends_on = None


def upgrade() -> None:
    """添加性能优化索引"""

    # ==================== projects 表索引 ====================

    # 项目名称索引（用于搜索）
    op.create_index(
        'idx_projects_name',
        'projects',
        ['name'],
        unique=False
    )

    # 项目所有者索引
    op.create_index(
        'idx_projects_owner',
        'projects',
        ['owner'],
        unique=False
    )

    # 创建时间索引（用于排序）
    op.create_index(
        'idx_projects_created_at',
        'projects',
        ['created_at'],
        unique=False
    )

    # 更新时间索引（用于排序）
    op.create_index(
        'idx_projects_updated_at',
        'projects',
        ['updated_at'],
        unique=False
    )

    # ==================== test_cases 表索引 ====================

    # 项目 ID 索引
    op.create_index(
        'idx_test_cases_project_id',
        'test_cases',
        ['project_id'],
        unique=False
    )

    # 接口 ID 索引
    op.create_index(
        'idx_test_cases_interface_id',
        'test_cases',
        ['interface_id'],
        unique=False
    )

    # 优先级索引
    op.create_index(
        'idx_test_cases_priority',
        'test_cases',
        ['priority'],
        unique=False
    )

    # 标签索引（PostgreSQL GIN 索引，用于 JSON/数组搜索）
    try:
        # PostgreSQL
        op.execute('CREATE INDEX idx_test_cases_tags ON test_cases USING GIN (tags)')
    except Exception:
        # SQLite/其他数据库，使用普通索引
        op.create_index(
            'idx_test_cases_tags',
            'test_cases',
            ['tags'],
            unique=False
        )

    # ==================== api_test_executions 表索引 ====================

    # 测试用例 ID 索引
    op.create_index(
        'idx_executions_test_case_id',
        'api_test_executions',
        ['test_case_id'],
        unique=False
    )

    # 状态索引
    op.create_index(
        'idx_executions_status',
        'api_test_executions',
        ['status'],
        unique=False
    )

    # 创建时间索引
    op.create_index(
        'idx_executions_created_at',
        'api_test_executions',
        ['created_at'],
        unique=False
    )

    # 复合索引：test_case_id + created_at（支持常见的"查询某测试用例的执行历史"场景）
    op.create_index(
        'idx_executions_test_case_created',
        'api_test_executions',
        ['test_case_id', 'created_at'],
        unique=False
    )

    # ==================== interfaces 表索引 ====================

    # 项目 ID 索引
    op.create_index(
        'idx_interfaces_project_id',
        'interfaces',
        ['project_id'],
        unique=False
    )

    # 文件夹 ID 索引
    op.create_index(
        'idx_interfaces_folder_id',
        'interfaces',
        ['folder_id'],
        unique=False
    )

    # 方法索引
    op.create_index(
        'idx_interfaces_method',
        'interfaces',
        ['method'],
        unique=False
    )

    # ==================== keywords 表索引 ====================

    # 项目 ID 索引
    op.create_index(
        'idx_keywords_project_id',
        'keywords',
        ['project_id'],
        unique=False
    )

    # 分类索引
    op.create_index(
        'idx_keywords_category',
        'keywords',
        ['category'],
        unique=False
    )

    # 启用状态索引
    op.create_index(
        'idx_keywords_is_active',
        'keywords',
        ['is_active'],
        unique=False
    )

    # ==================== requirements 表索引 ====================

    # 项目 ID 索引
    op.create_index(
        'idx_requirements_project_id',
        'requirements',
        ['project_id'],
        unique=False
    )

    # 状态索引
    op.create_index(
        'idx_requirements_status',
        'requirements',
        ['status'],
        unique=False
    )

    # 优先级索引
    op.create_index(
        'idx_requirements_priority',
        'requirements',
        ['priority'],
        unique=False
    )


def downgrade() -> None:
    """移除性能优化索引"""

    # projects 表
    op.drop_index('idx_projects_updated_at', table_name='projects')
    op.drop_index('idx_projects_created_at', table_name='projects')
    op.drop_index('idx_projects_owner', table_name='projects')
    op.drop_index('idx_projects_name', table_name='projects')

    # test_cases 表
    try:
        op.execute('DROP INDEX idx_test_cases_tags')
    except Exception:
        op.drop_index('idx_test_cases_tags', table_name='test_cases')
    op.drop_index('idx_test_cases_priority', table_name='test_cases')
    op.drop_index('idx_test_cases_interface_id', table_name='test_cases')
    op.drop_index('idx_test_cases_project_id', table_name='test_cases')

    # api_test_executions 表
    op.drop_index('idx_executions_test_case_created', table_name='api_test_executions')
    op.drop_index('idx_executions_created_at', table_name='api_test_executions')
    op.drop_index('idx_executions_status', table_name='api_test_executions')
    op.drop_index('idx_executions_test_case_id', table_name='api_test_executions')

    # interfaces 表
    op.drop_index('idx_interfaces_method', table_name='interfaces')
    op.drop_index('idx_interfaces_folder_id', table_name='interfaces')
    op.drop_index('idx_interfaces_project_id', table_name='interfaces')

    # keywords 表
    op.drop_index('idx_keywords_is_active', table_name='keywords')
    op.drop_index('idx_keywords_category', table_name='keywords')
    op.drop_index('idx_keywords_project_id', table_name='keywords')

    # requirements 表
    op.drop_index('idx_requirements_priority', table_name='requirements')
    op.drop_index('idx_requirements_status', table_name='requirements')
    op.drop_index('idx_requirements_project_id', table_name='requirements')
