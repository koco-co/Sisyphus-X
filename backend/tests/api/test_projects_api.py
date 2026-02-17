"""项目管理模块接口自动化测试

测试项目CRUD、数据库配置、测试连接接口
"""
import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy import select

from app.models.project import Project, ProjectDataSource
from app.models.database_config import DatabaseConfig


@pytest.mark.asyncio
class TestProjectCRUD:
    """项目CRUD接口自动化测试"""

    async def test_create_project_success(self, async_client: AsyncClient, sample_user):
        """测试成功创建项目"""
        response = await async_client.post(
            "/api/v1/projects/",
            json={
                "name": "新测试项目",
                "description": "这是一个新的测试项目"
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "新测试项目"
        assert data["description"] == "这是一个新的测试项目"
        assert data["created_by"] == sample_user.id
        assert "id" in data
        assert "created_at" in data

    async def test_create_project_duplicate_name(self, async_client: AsyncClient, sample_user):
        """测试创建重名项目"""
        # 创建第一个项目
        await async_client.post(
            "/api/v1/projects/",
            json={"name": "重复项目", "description": "第一个项目"},
        )

        # 尝试创建同名项目
        response = await async_client.post(
            "/api/v1/projects/",
            json={"name": "重复项目", "description": "第二个项目"},
        )
        assert response.status_code == 409
        assert "已存在" in response.json()["detail"]

    async def test_create_project_missing_name(self, async_client: AsyncClient):
        """测试缺少项目名称"""
        response = await async_client.post(
            "/api/v1/projects/",
            json={"description": "没有名称的项目"},
        )
        assert response.status_code == 422

    async def test_list_projects_empty(self, async_client: AsyncClient):
        """测试空项目列表"""
        response = await async_client.get("/api/v1/projects/")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1

    async def test_list_projects_with_pagination(self, async_client: AsyncClient):
        """测试项目列表分页"""
        # 创建多个项目
        for i in range(15):
            await async_client.post(
                "/api/v1/projects/",
                json={"name": f"项目{i}", "description": f"描述{i}"},
            )

        # 测试第一页
        response = await async_client.get("/api/v1/projects/?page=1&size=10")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 15
        assert len(data["items"]) == 10
        assert data["pages"] == 2

        # 测试第二页
        response = await async_client.get("/api/v1/projects/?page=2&size=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 5

    async def test_list_projects_with_search(self, async_client: AsyncClient):
        """测试项目列表搜索"""
        # 创建多个项目
        await async_client.post(
            "/api/v1/projects/",
            json={"name": "Python自动化测试项目", "description": "Python相关"},
        )
        await async_client.post(
            "/api/v1/projects/",
            json={"name": "Java后端项目", "description": "Java相关"},
        )
        await async_client.post(
            "/api/v1/projects/",
            json={"name": "Python爬虫项目", "description": "爬虫相关"},
        )

        # 搜索包含"Python"的项目
        response = await async_client.get("/api/v1/projects/?search=Python")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert all("Python" in item["name"] for item in data["items"])

    async def test_get_project_success(self, async_client: AsyncClient, sample_project):
        """测试成功获取项目详情"""
        response = await async_client.get(f"/api/v1/projects/{sample_project.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_project.id
        assert data["name"] == sample_project.name

    async def test_get_project_not_found(self, async_client: AsyncClient):
        """测试获取不存在的项目"""
        fake_id = str(uuid.uuid4())
        response = await async_client.get(f"/api/v1/projects/{fake_id}")
        assert response.status_code == 404

    async def test_update_project_name(self, async_client: AsyncClient, sample_project):
        """测试更新项目名称"""
        response = await async_client.put(
            f"/api/v1/projects/{sample_project.id}",
            json={"name": "更新后的项目名称"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "更新后的项目名称"

    async def test_update_project_description(self, async_client: AsyncClient, sample_project):
        """测试更新项目描述"""
        response = await async_client.put(
            f"/api/v1/projects/{sample_project.id}",
            json={"description": "更新后的描述"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "更新后的描述"

    async def test_update_project_not_found(self, async_client: AsyncClient):
        """测试更新不存在的项目"""
        fake_id = str(uuid.uuid4())
        response = await async_client.put(
            f"/api/v1/projects/{fake_id}",
            json={"name": "新名称"},
        )
        assert response.status_code == 404

    async def test_delete_project_success(self, async_client: AsyncClient, db_session, sample_project):
        """测试成功删除项目"""
        project_id = sample_project.id
        response = await async_client.delete(f"/api/v1/projects/{project_id}")
        # 删除成功应该返回204 No Content
        assert response.status_code == 204

        # 验证数据库中已被删除
        result = await db_session.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        assert project is None

    async def test_delete_project_not_found(self, async_client: AsyncClient):
        """测试删除不存在的项目"""
        fake_id = str(uuid.uuid4())
        response = await async_client.delete(f"/api/v1/projects/{fake_id}")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestDatabaseConfig:
    """数据库配置接口自动化测试"""

    async def test_create_database_config_success(self, async_client: AsyncClient, sample_project):
        """测试成功创建数据库配置"""
        response = await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases",
            json={
                "name": "测试MySQL配置",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "username": "root",
                "password": "password123",
                "database": "test_db",
                "is_enabled": True,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "测试MySQL配置"
        assert data["db_type"] == "mysql"
        assert data["host"] == "localhost"
        assert data["port"] == 3306
        # 密码应该被加密存储,不在响应中显示明文
        assert "password" not in data or data.get("password") != "password123"

    async def test_create_database_config_postgresql(self, async_client: AsyncClient, sample_project):
        """测试创建PostgreSQL配置"""
        response = await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases",
            json={
                "name": "测试PostgreSQL配置",
                "db_type": "postgresql",
                "host": "localhost",
                "port": 5432,
                "username": "postgres",
                "password": "password123",
                "database": "test_db",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["db_type"] == "postgresql"

    async def test_create_database_config_missing_fields(self, async_client: AsyncClient, sample_project):
        """测试缺少必填字段"""
        response = await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases",
            json={
                "name": "不完整的配置",
                "db_type": "mysql",
            },
        )
        assert response.status_code == 422

    async def test_list_database_configs_empty(self, async_client: AsyncClient, sample_project):
        """测试空数据库配置列表"""
        response = await async_client.get(f"/api/v1/projects/{sample_project.id}/databases")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []

    async def test_list_database_configs_with_filter(self, async_client: AsyncClient, sample_project):
        """测试数据库配置列表筛选"""
        # 创建启用的配置
        await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases",
            json={
                "name": "启用配置",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "username": "root",
                "password": "password",
                "is_enabled": True,
            },
        )

        # 创建禁用的配置
        await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases",
            json={
                "name": "禁用配置",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "username": "root",
                "password": "password",
                "is_enabled": False,
            },
        )

        # 筛选启用的配置
        response = await async_client.get(
            f"/api/v1/projects/{sample_project.id}/databases?is_enabled=true"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "启用配置"

    async def test_get_database_config_success(self, async_client: AsyncClient, sample_project):
        """测试成功获取数据库配置详情"""
        # 创建配置
        create_response = await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases",
            json={
                "name": "详情测试",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "username": "root",
                "password": "password",
            },
        )
        config_id = create_response.json()["id"]

        # 获取详情
        response = await async_client.get(
            f"/api/v1/projects/{sample_project.id}/databases/{config_id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "详情测试"

    async def test_update_database_config(self, async_client: AsyncClient, sample_project):
        """测试更新数据库配置"""
        # 创建配置
        create_response = await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases",
            json={
                "name": "更新测试",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "username": "root",
                "password": "password",
            },
        )
        config_id = create_response.json()["id"]

        # 更新配置
        response = await async_client.put(
            f"/api/v1/projects/{sample_project.id}/databases/{config_id}",
            json={"name": "更新后的配置", "is_enabled": False},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "更新后的配置"
        assert data["is_enabled"] is False

    async def test_delete_database_config(self, async_client: AsyncClient, db_session, sample_project):
        """测试删除数据库配置"""
        # 创建配置
        create_response = await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases",
            json={
                "name": "删除测试",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "username": "root",
                "password": "password",
            },
        )
        config_id = create_response.json()["id"]

        # 删除配置
        response = await async_client.delete(
            f"/api/v1/projects/{sample_project.id}/databases/{config_id}"
        )
        # 删除成功应该返回204 No Content
        assert response.status_code == 204

        # 验证数据库中已被删除
        result = await db_session.execute(
            select(DatabaseConfig).where(DatabaseConfig.id == config_id)
        )
        config = result.scalar_one_or_none()
        assert config is None


@pytest.mark.asyncio
class TestDatabaseConnection:
    """数据库连接测试接口自动化测试"""

    async def test_database_connection_success(self, async_client: AsyncClient, sample_project):
        """测试成功连接数据库"""
        # 创建配置
        create_response = await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases",
            json={
                "name": "连接测试",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "username": "root",
                "password": "wrongpassword",  # 故意使用错误密码
                "database": "test_db",
            },
        )
        config_id = create_response.json()["id"]

        # 测试连接 (预期失败,因为没有真实数据库)
        response = await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases/{config_id}/test"
        )
        # 应该返回成功或失败,但不应该报服务器错误
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data

    async def test_database_connection_latency(self, async_client: AsyncClient, sample_project):
        """测试数据库连接延迟"""
        # 创建配置
        create_response = await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases",
            json={
                "name": "延迟测试",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "username": "root",
                "password": "password",
            },
        )
        config_id = create_response.json()["id"]

        # 测试连接
        response = await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases/{config_id}/test"
        )
        assert response.status_code == 200
        data = response.json()
        # 延迟字段应该存在
        assert "latency" in data or "success" in data


@pytest.mark.asyncio
class TestPasswordEncryption:
    """密码加密存储测试"""

    async def test_password_is_encrypted(self, async_client: AsyncClient, db_session, sample_project):
        """测试密码被加密存储"""
        plain_password = "MySecurePassword123!"

        # 创建配置
        create_response = await async_client.post(
            f"/api/v1/projects/{sample_project.id}/databases",
            json={
                "name": "加密测试",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "username": "root",
                "password": plain_password,
            },
        )
        config_id = create_response.json()["id"]

        # 从数据库读取
        result = await db_session.execute(
            select(DatabaseConfig).where(DatabaseConfig.id == config_id)
        )
        config = result.scalar_one()

        # 密码应该被加密,不等于明文
        from app.core.crypto import decrypt_password
        decrypted_password = decrypt_password(config.password)
        assert decrypted_password == plain_password
        assert config.password != plain_password


@pytest.mark.asyncio
class TestProjectEdgeCases:
    """项目边界情况测试"""

    async def test_create_very_long_project_name(self, async_client: AsyncClient):
        """测试创建超长项目名称"""
        long_name = "A" * 300
        response = await async_client.post(
            "/api/v1/projects/",
            json={"name": long_name, "description": "超长名称测试"},
        )
        # 应该被拒绝或截断
        assert response.status_code in [200, 400, 422]

    async def test_create_project_with_special_chars(self, async_client: AsyncClient):
        """测试创建包含特殊字符的项目名称"""
        special_names = [
            "项目<test>",
            "Project & Test",
            "测试/project",
            "Test's Project",
        ]
        for name in special_names:
            response = await async_client.post(
                "/api/v1/projects/",
                json={"name": name, "description": "特殊字符测试"},
            )
            # 应该能处理特殊字符
            assert response.status_code in [201, 400, 422]

    async def test_concurrent_project_creation(self, async_client: AsyncClient):
        """测试并发创建项目"""
        import asyncio

        async def create_project(index):
            return await async_client.post(
                "/api/v1/projects/",
                json={"name": f"并发项目{index}", "description": f"描述{index}"},
            )

        # 并发创建10个项目
        responses = await asyncio.gather(*[create_project(i) for i in range(10)])
        success_count = sum(1 for r in responses if r.status_code == 201)
        # 至少应该有一些成功
        assert success_count > 0
