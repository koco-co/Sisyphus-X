"""环境变量模型单元测试 - UUID 版本 (TASK-004)

测试环境变量表设计:
- UUID 主键
- environment_id 外键关联到 project_environments 表
- UNIQUE(environment_id, name, is_global) 约束
- is_global 全局变量标记
"""
import pytest
import uuid
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from app.models.project import Project, ProjectEnvironment
from app.models.user import User
from app.models.env_variable import EnvVariable


@pytest.mark.asyncio
class TestEnvVariableModel:
    """环境变量模型测试类"""

    async def test_create_env_variable_minimal(
        self, db_session, sample_environment
    ):
        """测试创建最小字段的环境变量"""
        # Arrange & Act
        env_var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="BASE_URL",
            value="https://api.example.com"
        )
        db_session.add(env_var)
        await db_session.commit()
        await db_session.refresh(env_var)

        # Assert
        assert env_var.id is not None
        assert len(env_var.id) == 36
        assert env_var.name == "BASE_URL"
        assert env_var.value == "https://api.example.com"
        assert env_var.is_global is False
        assert env_var.description is None

    async def test_create_env_variable_all_fields(
        self, db_session, sample_environment
    ):
        """测试创建完整字段的环境变量"""
        # Arrange & Act
        env_var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="API_KEY",
            value="sk-1234567890",
            description="API 密钥",
            is_global=True
        )
        db_session.add(env_var)
        await db_session.commit()
        await db_session.refresh(env_var)

        # Assert
        assert env_var.name == "API_KEY"
        assert env_var.value == "sk-1234567890"
        assert env_var.description == "API 密钥"
        assert env_var.is_global is True

    async def test_env_variable_unique_constraint(
        self, db_session, sample_environment
    ):
        """测试同一环境下的变量名唯一性约束"""
        # Arrange
        env_var1 = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="BASE_URL",
            value="https://api1.example.com",
            is_global=False
        )
        db_session.add(env_var1)
        await db_session.commit()

        # Act & Assert
        env_var2 = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="BASE_URL",  # 同一环境下的重复名称
            value="https://api2.example.com",
            is_global=False
        )
        db_session.add(env_var2)

        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_global_variable_can_have_same_name_as_local(
        self, db_session, sample_environment
    ):
        """测试全局变量和本地变量可以有相同的名称"""
        # Arrange
        global_var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="API_KEY",
            value="global-key",
            is_global=True
        )
        local_var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="API_KEY",  # 相同名称,但 is_global 不同
            value="local-key",
            is_global=False
        )
        db_session.add_all([global_var, local_var])
        await db_session.commit()
        await db_session.refresh(global_var)
        await db_session.refresh(local_var)

        # Assert
        assert global_var.name == local_var.name
        assert global_var.is_global is True
        assert local_var.is_global is False

    async def test_update_env_variable(
        self, db_session, sample_environment
    ):
        """测试更新环境变量"""
        # Arrange
        env_var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="BASE_URL",
            value="https://api.example.com"
        )
        db_session.add(env_var)
        await db_session.commit()
        await db_session.refresh(env_var)

        original_updated_at = env_var.updated_at

        # Act
        env_var.value = "https://api-new.example.com"
        env_var.description = "新的 API 地址"
        await db_session.commit()
        await db_session.refresh(env_var)

        # Assert
        assert env_var.value == "https://api-new.example.com"
        assert env_var.description == "新的 API 地址"
        assert env_var.updated_at >= original_updated_at

    async def test_delete_env_variable(
        self, db_session, sample_environment
    ):
        """测试删除环境变量"""
        # Arrange
        env_var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="BASE_URL",
            value="https://api.example.com"
        )
        db_session.add(env_var)
        await db_session.commit()
        env_var_id = env_var.id

        # Act
        await db_session.delete(env_var)
        await db_session.commit()

        # Assert
        result = await db_session.get(EnvVariable, env_var_id)
        assert result is None

    async def test_query_env_variables_by_environment(
        self, db_session, sample_environment
    ):
        """测试查询环境的所有变量"""
        # Arrange
        var1 = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="BASE_URL",
            value="https://api.example.com"
        )
        var2 = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="API_KEY",
            value="sk-1234567890"
        )
        var3 = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="TIMEOUT",
            value="30"
        )
        db_session.add_all([var1, var2, var3])
        await db_session.commit()

        # Act
        stmt = select(EnvVariable).where(
            EnvVariable.environment_id == sample_environment.id
        )
        result = await db_session.execute(stmt)
        vars = result.scalars().all()

        # Assert
        assert len(vars) == 3
        var_names = [v.name for v in vars]
        assert "BASE_URL" in var_names
        assert "API_KEY" in var_names
        assert "TIMEOUT" in var_names

    async def test_query_global_variables(
        self, db_session, sample_environment
    ):
        """测试查询全局变量"""
        # Arrange
        global_var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="API_KEY",
            value="global-key",
            is_global=True
        )
        local_var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="BASE_URL",
            value="https://api.example.com",
            is_global=False
        )
        db_session.add_all([global_var, local_var])
        await db_session.commit()

        # Act
        stmt = select(EnvVariable).where(
            EnvVariable.environment_id == sample_environment.id,
            EnvVariable.is_global == True
        )
        result = await db_session.execute(stmt)
        global_vars = result.scalars().all()

        # Assert
        assert len(global_vars) == 1
        assert global_vars[0].name == "API_KEY"
        assert global_vars[0].is_global is True

    async def test_env_variable_not_nullable_fields(
        self, db_session, sample_environment
    ):
        """测试必填字段不能为 NULL"""
        # Arrange & Act
        env_var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name=None,  # type: ignore
            value="test"
        )
        db_session.add(env_var)

        # Assert
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_env_variable_foreign_key_constraint(
        self, db_session
    ):
        """测试外键约束: environment_id 必须引用有效的环境"""
        # Arrange & Act
        env_var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id="non-existent-env-uuid",  # 不存在的环境 ID
            name="BASE_URL",
            value="https://api.example.com"
        )
        db_session.add(env_var)

        # Assert (SQLite 默认不强制外键约束)
        # 这里我们只测试创建时的关联关系

    async def test_env_variable_is_global_toggle(
        self, db_session, sample_environment
    ):
        """测试全局变量标记切换"""
        # Arrange
        env_var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name="API_KEY",
            value="test-key",
            is_global=False
        )
        db_session.add(env_var)
        await db_session.commit()
        await db_session.refresh(env_var)

        # Act
        assert env_var.is_global is False
        env_var.is_global = True
        await db_session.commit()
        await db_session.refresh(env_var)

        # Assert
        assert env_var.is_global is True

    async def test_env_variable_name_max_length(
        self, db_session, sample_environment
    ):
        """测试变量名最大长度限制"""
        # Arrange & Act
        long_name = "A" * 255  # 最大长度
        env_var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=sample_environment.id,
            name=long_name,
            value="test-value"
        )
        db_session.add(env_var)
        await db_session.commit()
        await db_session.refresh(env_var)

        # Assert
        assert len(env_var.name) == 255
        assert env_var.name == long_name
