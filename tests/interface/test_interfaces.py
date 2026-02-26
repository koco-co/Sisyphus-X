"""接口定义 API 单元测试

测试接口目录、接口 CRUD、环境管理等功能
"""
import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy import select

from app.models.project import Project, InterfaceFolder, Interface, ProjectEnvironment
from app.models.user import User
from app.core.security import get_password_hash


@pytest.fixture
async def test_user(db_session):
    """创建测试用户"""
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=get_password_hash("password123"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
class TestInterfaceFolderAPI:
    """接口目录 API 测试类"""

    async def test_create_folder(self, async_client: AsyncClient, db_session, test_user):
        """测试创建文件夹"""
        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=test_user.id,
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        response = await async_client.post(
            f"/api/v1/projects/{project.id}/interface-folders",
            json={
                "name": "用户接口",
                "parent_id": None,
                "order": 1,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "用户接口"
        assert data["project_id"] == project.id

    async def test_create_nested_folder(self, async_client: AsyncClient, db_session, test_user):
        """测试创建嵌套文件夹"""
        # 先创建父文件夹
        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=test_user.id,
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        parent = InterfaceFolder(
            id=str(uuid.uuid4()),
            name="父目录",
            project_id=project.id,
            parent_id=None,
            order=1,
        )
        db_session.add(parent)
        await db_session.commit()
        await db_session.refresh(parent)

        # 创建子文件夹
        response = await async_client.post(
            f"/api/v1/projects/{project.id}/interface-folders",
            json={
                "name": "子目录",
                "parent_id": parent.id,
                "order": 1,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "子目录"
        assert data["parent_id"] == parent.id

    async def test_list_folders(self, async_client: AsyncClient, db_session, test_user):
        """测试获取文件夹列表"""
        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=test_user.id,
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        folder1 = InterfaceFolder(
            id=str(uuid.uuid4()),
            name="接口组1",
            project_id=project.id,
            parent_id=None,
            order=1,
        )
        folder2 = InterfaceFolder(
            id=str(uuid.uuid4()),
            name="接口组2",
            project_id=project.id,
            parent_id=None,
            order=2,
        )
        db_session.add_all([folder1, folder2])
        await db_session.commit()

        response = await async_client.get(f"/api/v1/projects/{project.id}/interface-folders")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    async def test_update_folder(self, async_client: AsyncClient, db_session, test_user):
        """测试更新文件夹"""
        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=test_user.id,
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        folder = InterfaceFolder(
            id=str(uuid.uuid4()),
            name="旧名称",
            project_id=project.id,
            parent_id=None,
            order=1,
        )
        db_session.add(folder)
        await db_session.commit()
        await db_session.refresh(folder)

        response = await async_client.put(
            f"/api/v1/projects/{project.id}/interface-folders/{folder.id}",
            json={"name": "新名称"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "新名称"

    async def test_delete_folder(self, async_client: AsyncClient, db_session, test_user):
        """测试删除文件夹"""
        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=test_user.id,
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        folder = InterfaceFolder(
            id=str(uuid.uuid4()),
            name="待删除",
            project_id=project.id,
            parent_id=None,
            order=1,
        )
        db_session.add(folder)
        await db_session.commit()
        await db_session.refresh(folder)

        response = await async_client.delete(f"/api/v1/projects/{project.id}/interface-folders/{folder.id}")
        # 删除成功应该返回204 No Content
        assert response.status_code == 204

        # 验证删除
        result = await db_session.get(InterfaceFolder, folder.id)
        assert result is None
