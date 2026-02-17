"""
项目管理模块单元测试

测试项目 CRUD、数据库配置等功能
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.models.project import Project
from app.models.database_config import DatabaseConfig
from app.models.env_variable import Environment
from app.models.user import User


@pytest.mark.unit
class TestProjectModel:
    """项目模型测试"""

    async def test_create_project(self, db_session: AsyncSession):
        """测试创建项目"""
        # 创建用户
        user = User(
            email="test@example.com",
            hashed_password="hashed",
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        # 创建项目
        project = Project(
            name="Test Project",
            description="Test description",
            created_by=user.id,
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        assert project.id is not None
        assert project.name == "Test Project"
        assert project.created_by == user.id

    async def test_project_unique_name_per_user(self, db_session: AsyncSession):
        """测试同一用户下项目名称唯一"""
        # 创建用户
        user = User(
            email="test@example.com",
            hashed_password="hashed",
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        # 创建第一个项目
        project1 = Project(
            name="Same Name",
            created_by=user.id,
        )
        db_session.add(project1)
        await db_session.commit()

        # 尝试创建相同名称的项目
        project2 = Project(
            name="Same Name",
            created_by=user.id,
        )
        db_session.add(project2)

        with pytest.raises(Exception):  # IntegrityError
            await db_session.commit()

    async def test_delete_project_cascade(self, db_session: AsyncSession):
        """测试删除项目级联删除关联数据"""
        # 创建用户和项目
        user = User(
            email="test@example.com",
            hashed_password="hashed",
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        project = Project(
            name="Test Project",
            created_by=user.id,
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        # 创建环境
        env = Environment(
            project_id=project.id,
            name="Test Env",
        )
        db_session.add(env)
        await db_session.commit()
        env_id = env.id

        # 删除项目
        await db_session.delete(project)
        await db_session.commit()

        # 验证环境也被删除
        deleted_env = await db_session.get(Environment, env_id)
        assert deleted_env is None


@pytest.mark.api
@pytest.mark.usefixtures("db_session")
class TestProjectAPI:
    """项目 API 测试"""

    async def test_create_project(self, authenticated_async_client: AsyncClient):
        """测试创建项目"""
        response = await authenticated_async_client.post(
            "/api/v1/projects",
            json={
                "name": "New Project",
                "description": "New project description",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "New Project"

    async def test_list_projects(self, authenticated_async_client: AsyncClient, db_session: AsyncSession):
        """测试获取项目列表"""
        # 创建测试用户
        from app.core.security import get_password_hash
        user = User(
            email="test@example.com",
            hashed_password=get_password_hash("password"),
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        # 创建项目
        project = Project(
            name="Test Project",
            created_by=user.id,
        )
        db_session.add(project)
        await db_session.commit()

        # 获取项目列表
        response = await authenticated_async_client.get("/api/v1/projects")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["projects"]) >= 1

    async def test_get_project_detail(self, authenticated_async_client: AsyncClient, db_session: AsyncSession):
        """测试获取项目详情"""
        from app.core.security import get_password_hash

        # 创建用户和项目
        user = User(
            email="test@example.com",
            hashed_password=get_password_hash("password"),
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        project = Project(
            name="Test Project",
            created_by=user.id,
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        # 获取项目详情
        response = await authenticated_async_client.get(f"/api/v1/projects/{project.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == str(project.id)

    async def test_update_project(self, authenticated_async_client: AsyncClient, db_session: AsyncSession):
        """测试更新项目"""
        from app.core.security import get_password_hash

        # 创建用户和项目
        user = User(
            email="test@example.com",
            hashed_password=get_password_hash("password"),
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        project = Project(
            name="Old Name",
            created_by=user.id,
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        # 更新项目
        response = await authenticated_async_client.put(
            f"/api/v1/projects/{project.id}",
            json={"name": "New Name"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "New Name"

    async def test_delete_project(self, authenticated_async_client: AsyncClient, db_session: AsyncSession):
        """测试删除项目"""
        from app.core.security import get_password_hash

        # 创建用户和项目
        user = User(
            email="test@example.com",
            hashed_password=get_password_hash("password"),
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        project = Project(
            name="Test Project",
            created_by=user.id,
        )
        db_session.add(project)
        await db_session.commit()
        project_id = project.id

        # 删除项目
        response = await authenticated_async_client.delete(f"/api/v1/projects/{project_id}")

        assert response.status_code == 204

        # 验证删除
        deleted_project = await db_session.get(Project, project_id)
        assert deleted_project is None
