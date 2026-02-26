"""项目模型单元测试

测试 Project, InterfaceFolder, Interface, ProjectEnvironment, ProjectDataSource 模型
"""
import pytest
import uuid
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.project import (
    Project,
    InterfaceFolder,
    Interface,
    ProjectEnvironment,
    ProjectDataSource,
)
from app.models.user import User


@pytest.mark.asyncio
class TestProjectModel:
    """项目模型测试类"""

    async def test_create_project(self, db_session):
        """测试创建项目"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        # 创建项目
        project = Project(
            id=str(uuid.uuid4()),
            name="订单中心",
            created_by=user.id,
            description="订单管理系统",
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        assert project.id is not None
        assert len(project.id) == 36  # UUID 格式
        assert project.name == "订单中心"
        assert project.created_by == user.id
        assert project.description == "订单管理系统"
        assert project.created_at is not None
        assert project.updated_at is not None

    async def test_project_name_nullable(self, db_session):
        """测试项目名称不能为空"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name=None,  # type: ignore
            created_by=user.id,
        )
        db_session.add(project)

        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_project_key_unique(self, db_session):
        """测试同一用户下项目名称唯一性"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        # 注意:当前 Project 模型有 UNIQUE(created_by, name) 约束
        # 这里测试创建两个相同名称的项目
        project1 = Project(
            id=str(uuid.uuid4()),
            name="重复项目名",
            created_by=user.id
        )
        db_session.add(project1)
        await db_session.commit()

        project2 = Project(
            id=str(uuid.uuid4()),
            name="重复项目名",
            created_by=user.id
        )
        db_session.add(project2)

        # 应该抛出 IntegrityError
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_update_project(self, db_session):
        """测试更新项目"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="旧名称",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        project.name = "新名称"
        project.description = "新描述"
        await db_session.commit()
        await db_session.refresh(project)

        assert project.name == "新名称"
        assert project.description == "新描述"

    async def test_delete_project(self, db_session):
        """测试删除项目"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="待删除",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        project_id = project.id

        await db_session.delete(project)
        await db_session.commit()

        result = await db_session.execute(
            select(Project).where(Project.id == project_id)
        )
        assert result.scalar_one_or_none() is None

    async def test_query_projects_by_owner(self, db_session):
        """测试按创建人查询项目"""
        # 创建用户
        user1 = User(
            id=str(uuid.uuid4()),
            username="user1",
            email="user1@example.com",
            hashed_password="hash123"
        )
        user2 = User(
            id=str(uuid.uuid4()),
            username="user2",
            email="user2@example.com",
            hashed_password="hash456"
        )
        db_session.add_all([user1, user2])
        await db_session.commit()

        project1 = Project(
            id=str(uuid.uuid4()),
            name="项目1",
            created_by=user1.id
        )
        project2 = Project(
            id=str(uuid.uuid4()),
            name="项目2",
            created_by=user1.id
        )
        project3 = Project(
            id=str(uuid.uuid4()),
            name="项目3",
            created_by=user2.id
        )
        db_session.add_all([project1, project2, project3])
        await db_session.commit()

        result = await db_session.execute(
            select(Project).where(Project.created_by == user1.id)
        )
        projects = result.scalars().all()

        assert len(projects) == 2
        assert all(p.created_by == user1.id for p in projects)


@pytest.mark.asyncio
class TestInterfaceFolderModel:
    """接口文件夹模型测试类"""

    async def test_create_folder(self, db_session):
        """测试创建文件夹"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        folder = InterfaceFolder(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="用户接口",
            parent_id=None,
            order=1,
        )
        db_session.add(folder)
        await db_session.commit()
        await db_session.refresh(folder)

        assert folder.id is not None
        assert folder.name == "用户接口"
        assert folder.project_id == project.id
        assert folder.parent_id is None
        assert folder.order == 1

    async def test_create_nested_folders(self, db_session):
        """测试创建嵌套文件夹"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        # 父文件夹
        parent_folder = InterfaceFolder(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="API接口",
            order=1,
        )
        db_session.add(parent_folder)
        await db_session.commit()
        await db_session.refresh(parent_folder)

        # 子文件夹
        child_folder = InterfaceFolder(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="用户接口",
            parent_id=parent_folder.id,
            order=1,
        )
        db_session.add(child_folder)
        await db_session.commit()
        await db_session.refresh(child_folder)

        assert child_folder.parent_id == parent_folder.id

    async def test_folder_order(self, db_session):
        """测试文件夹排序"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        folder1 = InterfaceFolder(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="文件夹1",
            order=2
        )
        folder2 = InterfaceFolder(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="文件夹2",
            order=1
        )
        db_session.add_all([folder1, folder2])
        await db_session.commit()

        result = await db_session.execute(
            select(InterfaceFolder)
            .where(InterfaceFolder.project_id == project.id)
            .order_by(InterfaceFolder.order)
        )
        folders = result.scalars().all()

        assert folders[0].name == "文件夹2"
        assert folders[1].name == "文件夹1"


@pytest.mark.asyncio
class TestInterfaceModel:
    """接口模型测试类"""

    async def test_create_interface(self, db_session):
        """测试创建接口"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        interface = Interface(
            id=str(uuid.uuid4()),
            project_id=project.id,
            folder_id=None,
            name="登录接口",
            url="/api/auth/login",
            method="POST",
            status="stable",
            description="用户登录",
            headers={"Content-Type": "application/json"},
            params={},
            body={"username": "test", "password": "123456"},
            body_type="json",
        )
        db_session.add(interface)
        await db_session.commit()
        await db_session.refresh(interface)

        assert interface.id is not None
        assert interface.name == "登录接口"
        assert interface.url == "/api/auth/login"
        assert interface.method == "POST"
        assert interface.status == "stable"

    async def test_interface_in_folder(self, db_session):
        """测试接口属于文件夹"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        folder = InterfaceFolder(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="用户接口"
        )
        db_session.add(folder)
        await db_session.commit()
        await db_session.refresh(folder)

        interface = Interface(
            id=str(uuid.uuid4()),
            project_id=project.id,
            folder_id=folder.id,
            name="登录接口",
            url="/api/auth/login",
            method="POST",
        )
        db_session.add(interface)
        await db_session.commit()
        await db_session.refresh(interface)

        assert interface.folder_id == folder.id

    async def test_interface_status_validation(self, db_session):
        """测试接口状态值"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        for status in ["draft", "stable", "deprecated"]:
            interface = Interface(
                id=str(uuid.uuid4()),
                project_id=project.id,
                name=f"接口_{status}",
                url="/api/test",
                method="GET",
                status=status,
            )
            db_session.add(interface)
            await db_session.commit()

            assert interface.status == status


@pytest.mark.asyncio
class TestProjectEnvironmentModel:
    """项目环境模型测试类"""

    async def test_create_environment(self, db_session):
        """测试创建环境"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        env = ProjectEnvironment(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="Dev",
            domain="https://api-dev.example.com",
            variables={"BASE_URL": "https://api-dev.example.com"},
            headers={"Authorization": "Bearer token"},
            is_preupload=False,
        )
        db_session.add(env)
        await db_session.commit()
        await db_session.refresh(env)

        assert env.id is not None
        assert env.name == "Dev"
        assert env.domain == "https://api-dev.example.com"
        assert env.variables == {"BASE_URL": "https://api-dev.example.com"}
        assert env.is_preupload is False

    async def test_multiple_environments_per_project(self, db_session):
        """测试项目可以有多个环境"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        dev_env = ProjectEnvironment(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="Dev"
        )
        test_env = ProjectEnvironment(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="Test"
        )
        prod_env = ProjectEnvironment(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="Prod"
        )
        db_session.add_all([dev_env, test_env, prod_env])
        await db_session.commit()

        result = await db_session.execute(
            select(ProjectEnvironment).where(
                ProjectEnvironment.project_id == project.id
            )
        )
        envs = result.scalars().all()

        assert len(envs) == 3


@pytest.mark.asyncio
class TestProjectDataSourceModel:
    """项目数据源模型测试类"""

    async def test_create_datasource(self, db_session):
        """测试创建数据源"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        datasource = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="主库",
            db_type="mysql",
            host="localhost",
            port=3306,
            db_name="test_db",
            username="root",
            password_hash="hashed_password",
            variable_name="MAIN_DB",
            is_enabled=True,
            status="unchecked",
        )
        db_session.add(datasource)
        await db_session.commit()
        await db_session.refresh(datasource)

        assert datasource.id is not None
        assert datasource.name == "主库"
        assert datasource.db_type == "mysql"
        assert datasource.host == "localhost"
        assert datasource.port == 3306
        assert datasource.is_enabled is True
        assert datasource.status == "unchecked"

    async def test_datasource_status_transitions(self, db_session):
        """测试数据源状态流转"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        datasource = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="主库",
            db_type="mysql",
            host="localhost",
            port=3306,
        )
        db_session.add(datasource)
        await db_session.commit()
        await db_session.refresh(datasource)

        # unchecked -> connected
        datasource.status = "connected"
        await db_session.commit()
        await db_session.refresh(datasource)
        assert datasource.status == "connected"

        # connected -> error
        datasource.status = "error"
        datasource.error_msg = "Connection timeout"
        await db_session.commit()
        await db_session.refresh(datasource)
        assert datasource.status == "error"
        assert datasource.error_msg == "Connection timeout"

    async def test_datasource_enable_disable(self, db_session):
        """测试启用/禁用数据源"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        datasource = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="主库",
            db_type="mysql",
            host="localhost",
            port=3306,
            is_enabled=True,
        )
        db_session.add(datasource)
        await db_session.commit()
        await db_session.refresh(datasource)

        assert datasource.is_enabled is True

        datasource.is_enabled = False
        await db_session.commit()
        await db_session.refresh(datasource)

        assert datasource.is_enabled is False

    async def test_multiple_datasources_per_project(self, db_session):
        """测试项目可以有多个数据源"""
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        main_db = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="主库",
            db_type="mysql",
            host="db1.example.com",
            port=3306
        )
        slave_db = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="从库",
            db_type="mysql",
            host="db2.example.com",
            port=3306
        )
        redis_db = ProjectDataSource(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="Redis",
            db_type="redis",
            host="redis.example.com",
            port=6379
        )
        db_session.add_all([main_db, slave_db, redis_db])
        await db_session.commit()

        result = await db_session.execute(
            select(ProjectDataSource).where(ProjectDataSource.project_id == project.id)
        )
        datasources = result.scalars().all()

        assert len(datasources) == 3
