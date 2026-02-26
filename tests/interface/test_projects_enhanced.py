"""项目管理模块完整接口自动化测试 (TASK-051)

覆盖所有项目管理相关接口:
1. 项目管理 CRUD (GET/POST/PUT/DELETE)
2. 环境管理 CRUD (GET/POST/PUT/DELETE/COPY)
3. 数据源管理 CRUD (GET/POST/PUT/PATCH/DELETE)
4. 环境变量管理 CRUD (GET/POST/PUT/DELETE)
5. 数据源测试连接 (TEST)

测试覆盖: 成功场景、失败场景、边界条件
"""
import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy import select

from app.models.env_variable import EnvVariable
from app.models.project import Project, ProjectDataSource, ProjectEnvironment
from app.models.user import User


@pytest.mark.asyncio
class TestProjectCRUD:
    """项目 CRUD 接口测试"""

    async def test_create_project_success(self, async_client: AsyncClient, db_session):
        """测试创建项目 - 成功场景"""
        # 创建并登录用户
        user = await self._create_user(db_session, "test1@example.com")
        headers = await self._login_and_get_headers(async_client, user.email)

        response = await async_client.post(
            "/api/v1/projects/",
            json={"name": "订单中心", "description": "订单管理系统"},
            headers=headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "订单中心"
        assert data["description"] == "订单管理系统"
        assert data["key"].startswith("PROJ-")
        assert data["created_by"] == user.id
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_project_duplicate_name(self, async_client: AsyncClient, db_session):
        """测试创建项目 - 名称重复失败"""
        user = await self._create_user(db_session, "test2@example.com")
        headers = await self._login_and_get_headers(async_client, user.email)

        # 创建第一个项目
        await async_client.post(
            "/api/v1/projects/",
            json={"name": "唯一项目", "description": "第一个"},
            headers=headers,
        )

        # 尝试创建同名项目
        response = await async_client.post(
            "/api/v1/projects/",
            json={"name": "唯一项目", "description": "第二个"},
            headers=headers,
        )

        assert response.status_code == 409
        assert "已存在" in response.json()["detail"]

    async def test_create_project_missing_name(self, async_client: AsyncClient, db_session):
        """测试创建项目 - 缺少必填字段"""
        user = await self._create_user(db_session, "test3@example.com")
        headers = await self._login_and_get_headers(async_client, user.email)

        response = await async_client.post(
            "/api/v1/projects/",
            json={"description": "缺少名称"},
            headers=headers,
        )

        assert response.status_code == 422  # Validation error

    async def test_list_projects_default(self, async_client: AsyncClient, db_session):
        """测试获取项目列表 - 默认分页"""
        user = await self._create_user(db_session, "test4@example.com")

        # 创建测试数据
        for i in range(15):
            project = Project(
                id=str(uuid.uuid4()),
                name=f"项目{i}",
                description=f"描述{i}",
                created_by=user.id,
            )
            db_session.add(project)
        await db_session.commit()

        response = await async_client.get("/api/v1/projects/")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 15
        assert data["page"] == 1
        assert data["size"] == 10
        assert data["pages"] >= 2
        assert len(data["items"]) == 10

    async def test_list_projects_with_search(self, async_client: AsyncClient, db_session):
        """测试获取项目列表 - 带搜索"""
        user = await self._create_user(db_session, "test5@example.com")

        # 创建测试数据
        for name in ["订单中心", "用户中心", "支付中心", "库存系统"]:
            project = Project(id=str(uuid.uuid4()), name=name, created_by=user.id)
            db_session.add(project)
        await db_session.commit()

        response = await async_client.get("/api/v1/projects/", params={"search": "中心"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 3
        # 验证搜索结果
        names = [item["name"] for item in data["items"]]
        assert any("订单中心" in name for name in names)
        assert any("用户中心" in name for name in names)

    async def test_list_projects_with_pagination(self, async_client: AsyncClient, db_session):
        """测试获取项目列表 - 自定义分页"""
        user = await self._create_user(db_session, "test6@example.com")

        # 创建测试数据
        for i in range(25):
            project = Project(
                id=str(uuid.uuid4()), name=f"项目{i}", created_by=user.id
            )
            db_session.add(project)
        await db_session.commit()

        # 第2页，每页5条
        response = await async_client.get("/api/v1/projects/", params={"page": 2, "size": 5})

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert data["size"] == 5
        assert len(data["items"]) == 5
        assert data["pages"] >= 5

    async def test_get_project_detail_success(self, async_client: AsyncClient, db_session):
        """测试获取项目详情 - 成功"""
        user = await self._create_user(db_session, "test7@example.com")

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            description="测试描述",
            created_by=user.id,
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        response = await async_client.get(f"/api/v1/projects/{project.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project.id
        assert data["name"] == "测试项目"
        assert data["description"] == "测试描述"

    async def test_get_project_detail_not_found(self, async_client: AsyncClient):
        """测试获取项目详情 - 项目不存在"""
        fake_id = str(uuid.uuid4())
        response = await async_client.get(f"/api/v1/projects/{fake_id}")

        assert response.status_code == 404

    async def test_update_project_success(self, async_client: AsyncClient, db_session):
        """测试更新项目 - 成功"""
        user = await self._create_user(db_session, "test8@example.com")
        headers = await self._login_and_get_headers(async_client, user.email)

        project = Project(
            id=str(uuid.uuid4()), name="旧名称", description="旧描述", created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        response = await async_client.put(
            f"/api/v1/projects/{project.id}",
            json={"name": "新名称", "description": "新描述"},
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "新名称"
        assert data["description"] == "新描述"

    async def test_update_project_duplicate_name(self, async_client: AsyncClient, db_session):
        """测试更新项目 - 名称重复"""
        user = await self._create_user(db_session, "test9@example.com")
        headers = await self._login_and_get_headers(async_client, user.email)

        # 创建两个项目
        project1 = Project(id=str(uuid.uuid4()), name="项目A", created_by=user.id)
        project2 = Project(id=str(uuid.uuid4()), name="项目B", created_by=user.id)
        db_session.add_all([project1, project2])
        await db_session.commit()
        await db_session.refresh(project2)

        # 尝试将 project2 改名为 project1 的名称
        response = await async_client.put(
            f"/api/v1/projects/{project2.id}",
            json={"name": "项目A"},
            headers=headers,
        )

        assert response.status_code == 409

    async def test_update_project_not_found(self, async_client: AsyncClient, db_session):
        """测试更新项目 - 项目不存在"""
        user = await self._create_user(db_session, "test10@example.com")
        headers = await self._login_and_get_headers(async_client, user.email)

        fake_id = str(uuid.uuid4())
        response = await async_client.put(
            f"/api/v1/projects/{fake_id}",
            json={"name": "新名称"},
            headers=headers,
        )

        assert response.status_code == 404

    async def test_delete_project_success(self, async_client: AsyncClient, db_session):
        """测试删除项目 - 成功"""
        user = await self._create_user(db_session, "test11@example.com")
        headers = await self._login_and_get_headers(async_client, user.email)

        project = Project(
            id=str(uuid.uuid4()), name="待删除", description="测试", created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        project_id = project.id

        response = await async_client.delete(f"/api/v1/projects/{project_id}", headers=headers)

        assert response.status_code == 204

        # 验证已删除
        result = await db_session.execute(select(Project).where(Project.id == project_id))
        assert result.scalar_one_or_none() is None

    async def test_delete_project_not_found(self, async_client: AsyncClient, db_session):
        """测试删除项目 - 项目不存在"""
        user = await self._create_user(db_session, "test12@example.com")
        headers = await self._login_and_get_headers(async_client, user.email)

        fake_id = str(uuid.uuid4())
        response = await async_client.delete(f"/api/v1/projects/{fake_id}", headers=headers)

        assert response.status_code == 404

    # 辅助方法
    async def _create_user(self, db_session, email: str) -> User:
        """创建测试用户"""
        from app.core.security import get_password_hash

        user = User(
            username=f"user_{email.split('@')[0]}",
            email=email,
            hashed_password=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    async def _login_and_get_headers(
        self, async_client: AsyncClient, email: str
    ) -> dict:
        """登录并获取认证头"""
        response = await async_client.post(
            "/api/v1/auth/login", json={"email": email, "password": "password123"}
        )
        assert response.status_code == 200
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
class TestEnvironmentCRUD:
    """环境管理 CRUD 接口测试"""

    async def test_create_environment_success(self, async_client: AsyncClient, db_session):
        """测试创建环境 - 成功"""
        user = await self._create_user(db_session, "env1@example.com")
        project = await self._create_project(db_session, user.id)

        response = await async_client.post(
            f"/api/v1/projects/{project.id}/environments",
            json={
                "name": "Test",
                "domain": "https://api-test.example.com",
                "variables": {"env": "test"},
                "headers": {"X-Env": "test"},
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test"
        assert data["domain"] == "https://api-test.example.com"
        assert data["variables"]["env"] == "test"
        assert data["headers"]["X-Env"] == "test"

    async def test_create_environment_project_not_found(self, async_client: AsyncClient):
        """测试创建环境 - 项目不存在"""
        fake_project_id = str(uuid.uuid4())

        response = await async_client.post(
            f"/api/v1/projects/{fake_project_id}/environments",
            json={"name": "Test", "domain": "https://api.example.com"},
        )

        assert response.status_code == 404

    async def test_list_environments_success(self, async_client: AsyncClient, db_session):
        """测试获取环境列表 - 成功"""
        user = await self._create_user(db_session, "env2@example.com")
        project = await self._create_project(db_session, user.id)

        # 创建多个环境
        for name in ["Dev", "Test", "Prod"]:
            env = ProjectEnvironment(
                id=str(uuid.uuid4()),
                project_id=project.id,
                name=name,
                domain=f"https://api-{name.lower()}.example.com",
            )
            db_session.add(env)
        await db_session.commit()

        response = await async_client.get(f"/api/v1/projects/{project.id}/environments")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3
        names = [env["name"] for env in data]
        assert "Dev" in names
        assert "Test" in names
        assert "Prod" in names

    async def test_get_environment_detail_success(self, async_client: AsyncClient, db_session):
        """测试获取环境详情 - 成功"""
        user = await self._create_user(db_session, "env3@example.com")
        project = await self._create_project(db_session, user.id)

        env = ProjectEnvironment(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="Dev",
            domain="https://api-dev.example.com",
        )
        db_session.add(env)
        await db_session.commit()
        await db_session.refresh(env)

        response = await async_client.get(
            f"/api/v1/projects/{project.id}/environments/{env.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == env.id
        assert data["name"] == "Dev"

    async def test_get_environment_detail_not_found(self, async_client: AsyncClient, db_session):
        """测试获取环境详情 - 环境不存在"""
        user = await self._create_user(db_session, "env4@example.com")
        project = await self._create_project(db_session, user.id)

        fake_env_id = str(uuid.uuid4())
        response = await async_client.get(
            f"/api/v1/projects/{project.id}/environments/{fake_env_id}"
        )

        assert response.status_code == 404

    async def test_update_environment_success(self, async_client: AsyncClient, db_session):
        """测试更新环境 - 成功"""
        user = await self._create_user(db_session, "env5@example.com")
        project = await self._create_project(db_session, user.id)

        env = ProjectEnvironment(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="Dev",
            domain="https://api-dev.example.com",
        )
        db_session.add(env)
        await db_session.commit()
        await db_session.refresh(env)

        response = await async_client.put(
            f"/api/v1/projects/{project.id}/environments/{env.id}",
            json={
                "name": "Staging",
                "domain": "https://api-staging.example.com",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Staging"
        assert data["domain"] == "https://api-staging.example.com"

    async def test_delete_environment_success(self, async_client: AsyncClient, db_session):
        """测试删除环境 - 成功"""
        user = await self._create_user(db_session, "env6@example.com")
        project = await self._create_project(db_session, user.id)

        env = ProjectEnvironment(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="ToDelete",
            domain="https://api.example.com",
        )
        db_session.add(env)
        await db_session.commit()
        await db_session.refresh(env)

        env_id = env.id

        response = await async_client.delete(
            f"/api/v1/projects/{project.id}/environments/{env_id}"
        )

        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()

        # 验证已删除
        result = await db_session.execute(
            select(ProjectEnvironment).where(ProjectEnvironment.id == env_id)
        )
        assert result.scalar_one_or_none() is None

    async def test_copy_environment_success(self, async_client: AsyncClient, db_session):
        """测试拷贝环境 - 成功"""
        user = await self._create_user(db_session, "env7@example.com")
        project = await self._create_project(db_session, user.id)

        env = ProjectEnvironment(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="Dev",
            domain="https://api-dev.example.com",
            variables={"key": "value"},
            headers={"X-Header": "header"},
        )
        db_session.add(env)
        await db_session.commit()
        await db_session.refresh(env)

        response = await async_client.post(
            f"/api/v1/projects/{project.id}/environments/{env.id}/copy"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Dev (Copy)"
        assert data["domain"] == "https://api-dev.example.com"
        assert data["variables"]["key"] == "value"
        assert data["headers"]["X-Header"] == "header"
        assert data["id"] != env.id  # 新环境ID不同

    # 辅助方法
    async def _create_user(self, db_session, email: str) -> User:
        """创建测试用户"""
        from app.core.security import get_password_hash

        user = User(
            username=f"user_{email.split('@')[0]}",
            email=email,
            hashed_password=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    async def _create_project(self, db_session, user_id: str) -> Project:
        """创建测试项目"""
        project = Project(
            id=str(uuid.uuid4()), name="测试项目", created_by=user_id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)
        return project


@pytest.mark.asyncio
class TestDataSourceCRUD:
    """数据源管理 CRUD 接口测试"""

    async def test_create_datasource_with_connection_test(
        self, async_client: AsyncClient, db_session
    ):
        """测试创建数据源 - 带连接测试"""
        user = await self._create_user(db_session, "ds1@example.com")
        project = await self._create_project(db_session, user.id)

        response = await async_client.post(
            f"/api/v1/projects/{project.id}/datasources",
            json={
                "name": "主库",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "db_name": "test_db",
                "username": "root",
                "password": "password123",
            },
        )

        # 连接可能失败(数据库不存在)，但应该返回 200
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "主库"
        assert data["db_type"] == "mysql"
        assert data["host"] == "localhost"
        assert data["port"] == 3306
        # 密码不应返回明文
        assert "password" not in data or data.get("password") != "password123"
        # 应该有状态字段
        assert "status" in data

    async def test_create_datasource_minimal(self, async_client: AsyncClient, db_session):
        """测试创建数据源 - 最小字段"""
        user = await self._create_user(db_session, "ds2@example.com")
        project = await self._create_project(db_session, user.id)

        response = await async_client.post(
            f"/api/v1/projects/{project.id}/datasources",
            json={
                "name": "简单数据源",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "db_name": "db",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "简单数据源"
        assert data["is_enabled"] is True  # 默认启用

    async def test_create_datasource_project_not_found(
        self, async_client: AsyncClient
    ):
        """测试创建数据源 - 项目不存在"""
        fake_project_id = str(uuid.uuid4())

        response = await async_client.post(
            f"/api/v1/projects/{fake_project_id}/datasources",
            json={
                "name": "测试",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "db_name": "db",
            },
        )

        assert response.status_code == 404

    async def test_list_datasources_success(self, async_client: AsyncClient, db_session):
        """测试获取数据源列表 - 成功"""
        user = await self._create_user(db_session, "ds3@example.com")
        project = await self._create_project(db_session, user.id)

        # 创建多个数据源
        for i in range(3):
            ds = ProjectDataSource(
                id=str(uuid.uuid4()),
                project_id=project.id,
                name=f"数据源{i}",
                db_type="mysql",
                host="localhost",
                port=3306 + i,
            )
            db_session.add(ds)
        await db_session.commit()

        response = await async_client.get(f"/api/v1/projects/{project.id}/datasources")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3
        names = [ds["name"] for ds in data]
        assert "数据源0" in names
        assert "数据源1" in names

    async def test_update_datasource_success(self, async_client: AsyncClient, db_session):
        """测试更新数据源 - 成功"""
        user = await self._create_user(db_session, "ds4@example.com")
        project = await self._create_project(db_session, user.id)

        ds = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="旧名称",
            db_type="mysql",
            host="localhost",
            port=3306,
        )
        db_session.add(ds)
        await db_session.commit()
        await db_session.refresh(ds)

        response = await async_client.put(
            f"/api/v1/projects/{project.id}/datasources/{ds.id}",
            json={
                "name": "新名称",
                "host": "newhost.example.com",
                "port": 3307,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "新名称"
        assert data["host"] == "newhost.example.com"
        assert data["port"] == 3307

    async def test_patch_datasource_enable_disable(
        self, async_client: AsyncClient, db_session
    ):
        """测试部分更新数据源 - 启用/禁用"""
        user = await self._create_user(db_session, "ds5@example.com")
        project = await self._create_project(db_session, user.id)

        ds = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="测试库",
            db_type="mysql",
            host="localhost",
            port=3306,
            is_enabled=True,
        )
        db_session.add(ds)
        await db_session.commit()
        await db_session.refresh(ds)

        # 禁用
        response = await async_client.patch(
            f"/api/v1/projects/{project.id}/datasources/{ds.id}",
            json={"is_enabled": False},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_enabled"] is False

        # 启用
        response = await async_client.patch(
            f"/api/v1/projects/{project.id}/datasources/{ds.id}",
            json={"is_enabled": True},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_enabled"] is True

    async def test_delete_datasource_success(self, async_client: AsyncClient, db_session):
        """测试删除数据源 - 成功"""
        user = await self._create_user(db_session, "ds6@example.com")
        project = await self._create_project(db_session, user.id)

        ds = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="待删除",
            db_type="mysql",
            host="localhost",
            port=3306,
        )
        db_session.add(ds)
        await db_session.commit()
        await db_session.refresh(ds)

        ds_id = ds.id

        response = await async_client.delete(
            f"/api/v1/projects/{project.id}/datasources/{ds_id}"
        )

        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()

        # 验证已删除
        result = await db_session.execute(
            select(ProjectDataSource).where(ProjectDataSource.id == ds_id)
        )
        assert result.scalar_one_or_none() is None

    async def test_datasource_connection_test_tcp_only(
        self, async_client: AsyncClient
    ):
        """测试数据源连接 - 仅TCP连接"""
        response = await async_client.post(
            "/api/v1/projects/datasources/test",
            json={
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                # 不提供用户名和密码
            },
        )

        # TCP连接可能失败或成功
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data

    async def test_datasource_connection_test_with_credentials(
        self, async_client: AsyncClient
    ):
        """测试数据源连接 - 带凭据"""
        response = await async_client.post(
            "/api/v1/projects/datasources/test",
            json={
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "db_name": "test_db",
                "username": "root",
                "password": "wrong_password",  # 故意使用错误密码
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data
        # 连接应该失败
        assert data["success"] is False

    async def test_datasource_connection_test_missing_required_fields(
        self, async_client: AsyncClient
    ):
        """测试数据源连接 - 缺少必填字段"""
        response = await async_client.post(
            "/api/v1/projects/datasources/test",
            json={
                "db_type": "mysql",
                # 缺少 host 和 port
            },
        )

        # Pydantic 验证失败，返回 422
        assert response.status_code == 422

    # 辅助方法
    async def _create_user(self, db_session, email: str) -> User:
        """创建测试用户"""
        from app.core.security import get_password_hash

        user = User(
            username=f"user_{email.split('@')[0]}",
            email=email,
            hashed_password=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    async def _create_project(self, db_session, user_id: str) -> Project:
        """创建测试项目"""
        project = Project(
            id=str(uuid.uuid4()), name="测试项目", created_by=user_id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)
        return project


@pytest.mark.asyncio
class TestEnvVariableCRUD:
    """环境变量管理 CRUD 接口测试"""

    async def test_create_env_variable_success(self, async_client: AsyncClient, db_session):
        """测试创建环境变量 - 成功"""
        user = await self._create_user(db_session, "var1@example.com")
        project = await self._create_project(db_session, user.id)
        env = await self._create_environment(db_session, project.id, "Dev")

        response = await async_client.post(
            f"/api/v1/projects/{project.id}/environments/{env.id}/variables",
            json={
                "name": "API_KEY",
                "value": "secret_key_123",
                "description": "API密钥",
                "is_global": False,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "API_KEY"
        assert data["value"] == "secret_key_123"
        assert data["description"] == "API密钥"
        assert data["is_global"] is False

    async def test_create_env_variable_duplicate_name(
        self, async_client: AsyncClient, db_session
    ):
        """测试创建环境变量 - 名称重复"""
        user = await self._create_user(db_session, "var2@example.com")
        project = await self._create_project(db_session, user.id)
        env = await self._create_environment(db_session, project.id, "Dev")

        # 创建第一个变量
        await async_client.post(
            f"/api/v1/projects/{project.id}/environments/{env.id}/variables",
            json={"name": "URL", "value": "http://example.com", "is_global": False},
        )

        # 尝试创建同名变量
        response = await async_client.post(
            f"/api/v1/projects/{project.id}/environments/{env.id}/variables",
            json={"name": "URL", "value": "http://test.com", "is_global": False},
        )

        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    async def test_create_env_variable_env_not_found(
        self, async_client: AsyncClient, db_session
    ):
        """测试创建环境变量 - 环境不存在"""
        user = await self._create_user(db_session, "var3@example.com")
        project = await self._create_project(db_session, user.id)

        fake_env_id = str(uuid.uuid4())
        response = await async_client.post(
            f"/api/v1/projects/{project.id}/environments/{fake_env_id}/variables",
            json={"name": "TEST", "value": "value"},
        )

        assert response.status_code == 404

    async def test_list_env_variables_success(self, async_client: AsyncClient, db_session):
        """测试获取环境变量列表 - 成功"""
        user = await self._create_user(db_session, "var4@example.com")
        project = await self._create_project(db_session, user.id)
        env = await self._create_environment(db_session, project.id, "Dev")

        # 创建多个变量
        for i in range(3):
            var = EnvVariable(
                id=str(uuid.uuid4()),
                environment_id=env.id,
                name=f"VAR{i}",
                value=f"value{i}",
                is_global=False,
            )
            db_session.add(var)
        await db_session.commit()

        response = await async_client.get(
            f"/api/v1/projects/{project.id}/environments/{env.id}/variables"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3
        names = [var["name"] for var in data]
        assert "VAR0" in names
        assert "VAR1" in names

    async def test_get_env_variable_detail_success(
        self, async_client: AsyncClient, db_session
    ):
        """测试获取环境变量详情 - 成功"""
        user = await self._create_user(db_session, "var5@example.com")
        project = await self._create_project(db_session, user.id)
        env = await self._create_environment(db_session, project.id, "Dev")

        var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=env.id,
            name="TEST_VAR",
            value="test_value",
            is_global=False,
        )
        db_session.add(var)
        await db_session.commit()
        await db_session.refresh(var)

        response = await async_client.get(
            f"/api/v1/projects/{project.id}/environments/{env.id}/variables/{var.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == var.id
        assert data["name"] == "TEST_VAR"
        assert data["value"] == "test_value"

    async def test_update_env_variable_success(self, async_client: AsyncClient, db_session):
        """测试更新环境变量 - 成功"""
        user = await self._create_user(db_session, "var6@example.com")
        project = await self._create_project(db_session, user.id)
        env = await self._create_environment(db_session, project.id, "Dev")

        var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=env.id,
            name="OLD_NAME",
            value="old_value",
            is_global=False,
        )
        db_session.add(var)
        await db_session.commit()
        await db_session.refresh(var)

        response = await async_client.put(
            f"/api/v1/projects/{project.id}/environments/{env.id}/variables/{var.id}",
            json={"name": "NEW_NAME", "value": "new_value", "is_global": True},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "NEW_NAME"
        assert data["value"] == "new_value"
        assert data["is_global"] is True

    async def test_delete_env_variable_success(self, async_client: AsyncClient, db_session):
        """测试删除环境变量 - 成功"""
        user = await self._create_user(db_session, "var7@example.com")
        project = await self._create_project(db_session, user.id)
        env = await self._create_environment(db_session, project.id, "Dev")

        var = EnvVariable(
            id=str(uuid.uuid4()),
            environment_id=env.id,
            name="TO_DELETE",
            value="value",
            is_global=False,
        )
        db_session.add(var)
        await db_session.commit()
        await db_session.refresh(var)

        var_id = var.id

        response = await async_client.delete(
            f"/api/v1/projects/{project.id}/environments/{env.id}/variables/{var_id}"
        )

        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()

        # 验证已删除
        result = await db_session.execute(
            select(EnvVariable).where(EnvVariable.id == var_id)
        )
        assert result.scalar_one_or_none() is None

    # 辅助方法
    async def _create_user(self, db_session, email: str) -> User:
        """创建测试用户"""
        from app.core.security import get_password_hash

        user = User(
            username=f"user_{email.split('@')[0]}",
            email=email,
            hashed_password=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    async def _create_project(self, db_session, user_id: str) -> Project:
        """创建测试项目"""
        project = Project(
            id=str(uuid.uuid4()), name="测试项目", created_by=user_id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)
        return project

    async def _create_environment(
        self, db_session, project_id: str, name: str
    ) -> ProjectEnvironment:
        """创建测试环境"""
        env = ProjectEnvironment(
            id=str(uuid.uuid4()),
            project_id=project_id,
            name=name,
            domain=f"https://api-{name.lower()}.example.com",
        )
        db_session.add(env)
        await db_session.commit()
        await db_session.refresh(env)
        return env
