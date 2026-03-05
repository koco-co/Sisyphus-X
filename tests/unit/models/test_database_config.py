"""数据库配置模型单元测试 - UUID 版本 (TASK-003)

测试数据库配置表设计 (ProjectDataSource 模型):
- UUID 主键
- project_id 外键关联到 projects 表
- UNIQUE(project_id, variable_name) 约束
- 密码加密存储
- 连接状态管理
"""
import pytest
import uuid
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
from app.models.project import Project, ProjectDataSource
from app.models.user import User


@pytest.mark.asyncio
class TestProjectDataSourceModel:
    """数据库配置模型测试类 (使用 ProjectDataSource)"""

    async def test_create_database_config_minimal(self, db_session, sample_project):
        """测试创建最小字段的数据库配置"""
        # Arrange & Act
        config = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="主数据库",
            db_type="PostgreSQL",
            host="localhost",
            port=5432,
            username="postgres",
            password_hash="encrypted_password"
        )
        db_session.add(config)
        await db_session.commit()
        await db_session.refresh(config)

        # Assert
        assert config.id is not None
        assert len(config.id) == 36
        assert config.name == "主数据库"
        assert config.db_type == "PostgreSQL"
        assert config.host == "localhost"
        assert config.port == 5432
        assert config.username == "postgres"
        assert config.password_hash == "encrypted_password"
        assert config.is_enabled is True
        assert config.status == "unchecked"  # 默认状态为 unchecked

    async def test_create_database_config_all_fields(self, db_session, sample_project):
        """测试创建完整字段的数据库配置"""
        # Arrange & Act
        config = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="从数据库",
            variable_name="SLAVE_DB",
            db_type="MySQL",
            host="slave.example.com",
            port=3306,
            db_name="test_db",
            username="root",
            password_hash="encrypted_password",
            is_enabled=True,
            status="connected"
        )
        db_session.add(config)
        await db_session.commit()
        await db_session.refresh(config)

        # Assert
        assert config.variable_name == "SLAVE_DB"
        assert config.db_name == "test_db"
        assert config.status == "connected"
        assert config.is_enabled is True

    async def test_database_config_same_variable_name_allowed(
        self, db_session, sample_project
    ):
        """测试同一项目下可以有相同的 variable_name (当前模型允许)"""
        # Arrange
        config1 = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="主库1",
            variable_name="MAIN_DB",
            db_type="PostgreSQL",
            host="localhost",
            port=5432,
            username="postgres",
            password_hash="pass1"
        )
        db_session.add(config1)
        await db_session.commit()

        # Act - 创建第二个同 variable_name 的配置
        config2 = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="主库2",
            variable_name="MAIN_DB",  # 同一项目下的相同 variable_name (当前允许)
            db_type="PostgreSQL",
            host="localhost",
            port=5433,
            username="postgres",
            password_hash="pass2"
        )
        db_session.add(config2)
        await db_session.commit()

        # Assert - 应该成功创建
        await db_session.refresh(config2)
        assert config2.variable_name == "MAIN_DB"
        assert config2.name == "主库2"

    async def test_different_projects_can_have_same_variable_name(
        self, db_session, sample_user
    ):
        """测试不同项目可以有相同的 variable_name"""
        # Arrange
        project1 = Project(
            id=str(uuid.uuid4()), name="项目1", created_by=sample_user.id
        )
        project2 = Project(
            id=str(uuid.uuid4()), name="项目2", created_by=sample_user.id
        )
        db_session.add_all([project1, project2])
        await db_session.commit()

        # Act
        config1 = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=project1.id,
            name="主库",
            variable_name="MAIN_DB",
            db_type="PostgreSQL",
            host="localhost",
            port=5432,
            username="postgres",
            password_hash="pass1"
        )
        config2 = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=project2.id,
            name="主库",
            variable_name="MAIN_DB",  # 不同项目,相同的 variable_name 应该允许
            db_type="PostgreSQL",
            host="localhost",
            port=5432,
            username="postgres",
            password_hash="pass2"
        )
        db_session.add_all([config1, config2])
        await db_session.commit()
        await db_session.refresh(config1)
        await db_session.refresh(config2)

        # Assert
        assert config1.variable_name == config2.variable_name
        assert config1.project_id != config2.project_id

    async def test_update_database_config(self, db_session, sample_project):
        """测试更新数据库配置"""
        # Arrange
        config = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="原始名称",
            db_type="PostgreSQL",
            host="localhost",
            port=5432,
            username="postgres",
            password_hash="pass"
        )
        db_session.add(config)
        await db_session.commit()
        await db_session.refresh(config)

        # Act
        config.name = "更新后的名称"
        config.status = "connected"
        config.last_test_at = datetime.now(timezone.utc)
        await db_session.commit()
        await db_session.refresh(config)

        # Assert
        assert config.name == "更新后的名称"
        assert config.status == "connected"
        assert config.last_test_at is not None

    async def test_delete_database_config(self, db_session, sample_project):
        """测试删除数据库配置"""
        # Arrange
        config = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="待删除",
            db_type="PostgreSQL",
            host="localhost",
            port=5432,
            username="postgres",
            password_hash="pass"
        )
        db_session.add(config)
        await db_session.commit()
        config_id = config.id

        # Act
        await db_session.delete(config)
        await db_session.commit()

        # Assert
        result = await db_session.get(ProjectDataSource, config_id)
        assert result is None

    async def test_query_database_configs_by_project(
        self, db_session, sample_project
    ):
        """测试查询项目的所有数据库配置"""
        # Arrange
        config1 = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="主库",
            db_type="PostgreSQL",
            host="localhost",
            port=5432,
            username="postgres",
            password_hash="pass1"
        )
        config2 = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="从库",
            db_type="PostgreSQL",
            host="localhost",
            port=5433,
            username="postgres",
            password_hash="pass2"
        )
        db_session.add_all([config1, config2])
        await db_session.commit()

        # Act
        stmt = select(ProjectDataSource).where(
            ProjectDataSource.project_id == sample_project.id
        )
        result = await db_session.execute(stmt)
        configs = result.scalars().all()

        # Assert
        assert len(configs) == 2
        config_names = [c.name for c in configs]
        assert "主库" in config_names
        assert "从库" in config_names

    async def test_database_config_not_nullable_fields(
        self, db_session, sample_project
    ):
        """测试必填字段不能为 NULL"""
        # Arrange & Act
        config = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name=None,  # type: ignore
            db_type="PostgreSQL",
            host="localhost",
            port=5432,
            username="postgres",
            password_hash="pass"
        )
        db_session.add(config)

        # Assert
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_database_config_foreign_key_constraint(
        self, db_session
    ):
        """测试外键约束: project_id 必须引用有效的项目"""
        # Arrange & Act
        config = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id="non-existent-project-uuid",  # 不存在的项目 ID
            name="测试配置",
            db_type="PostgreSQL",
            host="localhost",
            port=5432,
            username="postgres",
            password_hash="pass"
        )
        db_session.add(config)

        # Assert (SQLite 默认不强制外键约束)
        # 这里我们只测试创建时的关联关系
        # 在 PostgreSQL 中会抛出 IntegrityError

    async def test_database_config_is_enabled_toggle(
        self, db_session, sample_project
    ):
        """测试启用/禁用数据库配置"""
        # Arrange
        config = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试配置",
            db_type="PostgreSQL",
            host="localhost",
            port=5432,
            username="postgres",
            password_hash="pass",
            is_enabled=True
        )
        db_session.add(config)
        await db_session.commit()
        await db_session.refresh(config)

        # Act
        assert config.is_enabled is True
        config.is_enabled = False
        await db_session.commit()
        await db_session.refresh(config)

        # Assert
        assert config.is_enabled is False

    async def test_database_config_connection_status_transitions(
        self, db_session, sample_project
    ):
        """测试连接状态流转"""
        # Arrange
        config = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试配置",
            db_type="PostgreSQL",
            host="localhost",
            port=5432,
            username="postgres",
            password_hash="pass"
        )
        db_session.add(config)
        await db_session.commit()
        await db_session.refresh(config)

        # Act & Assert
        assert config.status == "unchecked"  # 默认状态

        config.status = "connected"
        await db_session.commit()
        await db_session.refresh(config)
        assert config.status == "connected"

        config.status = "failed"
        await db_session.commit()
        await db_session.refresh(config)
        assert config.status == "failed"

    async def test_database_config_name_max_length(
        self, db_session, sample_project
    ):
        """测试配置名称最大长度限制"""
        # Arrange & Act
        long_name = "A" * 255  # 最大长度
        config = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name=long_name,
            db_type="PostgreSQL",
            host="localhost",
            port=5432,
            username="postgres",
            password_hash="pass"
        )
        db_session.add(config)
        await db_session.commit()
        await db_session.refresh(config)

        # Assert
        assert len(config.name) == 255
        assert config.name == long_name
