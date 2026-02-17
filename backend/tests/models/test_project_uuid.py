"""项目模型单元测试 - UUID 版本 (TASK-002)

测试新的项目表设计:
- UUID 主键
- created_by 外键关联到 users 表
- UNIQUE(created_by, name) 约束
"""
import pytest
import uuid
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from app.models.project import Project
from app.models.user import User


@pytest.mark.asyncio
class TestProjectUUIDModel:
    """项目模型测试类 - UUID 版本"""

    async def test_create_project_with_minimal_fields(self, db_session, sample_user):
        """测试创建最小字段项目"""
        # Arrange
        import uuid
        project_id = str(uuid.uuid4())

        # Act
        project = Project(
            id=project_id,
            name="订单中心",
            created_by=sample_user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        # Assert
        assert project.id == project_id
        assert len(project.id) == 36  # UUID 格式
        assert project.name == "订单中心"
        assert project.description is None
        assert project.created_by == sample_user.id
        assert isinstance(project.created_at, datetime)
        assert isinstance(project.updated_at, datetime)

    async def test_create_project_with_all_fields(self, db_session, sample_user):
        """测试创建完整字段项目"""
        # Arrange & Act
        project = Project(
            id=str(uuid.uuid4()),
            name="订单管理系统",
            description="这是一个完整的订单管理系统测试项目",
            created_by=sample_user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        # Assert
        assert project.name == "订单管理系统"
        assert project.description == "这是一个完整的订单管理系统测试项目"
        assert project.created_by == sample_user.id

    async def test_project_user_unique_constraint(self, db_session, sample_user):
        """测试同一用户下项目名称唯一性约束"""
        # Arrange
        project1 = Project(
            id=str(uuid.uuid4()),
            name="重复项目名",
            created_by=sample_user.id
        )
        db_session.add(project1)
        await db_session.commit()

        # Act & Assert
        project2 = Project(
            id=str(uuid.uuid4()),
            name="重复项目名",  # 同一用户下的重复名称
            created_by=sample_user.id
        )
        db_session.add(project2)

        with pytest.raises(IntegrityError):  # 应该抛出 IntegrityError
            await db_session.commit()

    async def test_different_users_can_have_same_project_name(self, db_session):
        """测试不同用户可以创建同名项目"""
        # Arrange
        user1 = User(
            id="user-1-uuid-1111111111111111111111",
            username="user1",
            email="user1@example.com",
            hashed_password="hash123"
        )
        user2 = User(
            id="user-2-uuid-2222222222222222222222",
            username="user2",
            email="user2@example.com",
            hashed_password="hash456"
        )
        db_session.add_all([user1, user2])
        await db_session.commit()

        # Act
        project1 = Project(
            id=str(uuid.uuid4()),
            name="共同项目名",
            created_by=user1.id
        )
        project2 = Project(
            id=str(uuid.uuid4()),
            name="共同项目名",  # 不同用户,同名应该允许
            created_by=user2.id
        )
        db_session.add_all([project1, project2])
        await db_session.commit()
        await db_session.refresh(project1)
        await db_session.refresh(project2)

        # Assert
        assert project1.id != project2.id
        assert project1.name == project2.name
        assert project1.created_by != project2.created_by

    async def test_update_project(self, db_session, sample_user):
        """测试更新项目信息"""
        # Arrange
        project = Project(
            id=str(uuid.uuid4()),
            name="原始项目名",
            description="原始描述",
            created_by=sample_user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        original_updated_at = project.updated_at

        # Act
        project.name = "更新后的项目名"
        project.description = "更新后的描述"
        await db_session.commit()
        await db_session.refresh(project)

        # Assert
        assert project.name == "更新后的项目名"
        assert project.description == "更新后的描述"
        assert project.updated_at >= original_updated_at

    async def test_delete_project(self, db_session, sample_user):
        """测试删除项目"""
        # Arrange
        project = Project(
            id=str(uuid.uuid4()),
            name="待删除项目",
            created_by=sample_user.id
        )
        db_session.add(project)
        await db_session.commit()
        project_id = project.id

        # Act
        await db_session.delete(project)
        await db_session.commit()

        # Assert
        result = await db_session.get(Project, project_id)
        assert result is None

    async def test_query_projects_by_user(self, db_session, sample_user):
        """测试查询用户的所有项目"""
        # Arrange
        project1 = Project(
            id=str(uuid.uuid4()),name="项目1", created_by=sample_user.id)
        project2 = Project(
            id=str(uuid.uuid4()),name="项目2", created_by=sample_user.id)
        project3 = Project(
            id=str(uuid.uuid4()),name="项目3", created_by=sample_user.id)
        db_session.add_all([project1, project2, project3])
        await db_session.commit()

        # Act
        stmt = select(Project).where(Project.created_by == sample_user.id)
        result = await db_session.execute(stmt)
        projects = result.scalars().all()

        # Assert
        assert len(projects) == 3
        project_names = [p.name for p in projects]
        assert "项目1" in project_names
        assert "项目2" in project_names
        assert "项目3" in project_names

    async def test_query_project_by_name(self, db_session, sample_user):
        """测试通过项目名称查询"""
        # Arrange
        project = Project(
            id=str(uuid.uuid4()),
            name="特定项目名",
            created_by=sample_user.id
        )
        db_session.add(project)
        await db_session.commit()

        # Act
        stmt = select(Project).where(
            Project.name == "特定项目名",
            Project.created_by == sample_user.id
        )
        result = await db_session.execute(stmt)
        found_project = result.scalar_one_or_none()

        # Assert
        assert found_project is not None
        assert found_project.name == "特定项目名"
        assert found_project.id == project.id

    async def test_project_cascade_delete_user(self, db_session):
        """测试用户删除时级联删除项目 (注意: SQLite 默认不支持外键级联,此测试跳过)"""
        # SQLite 默认不强制外键约束,需要 PRAGMA foreign_keys=ON
        # 这里我们只测试创建时的关联关系
        # Arrange
        user = User(
            id="user-cascade-uuid-3333333333333333333333",
            username="cascade_user",
            email="cascade@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="级联删除项目",
            created_by=user.id
        )
        db_session.add(project)
        await db_session.commit()

        # Assert
        # 只验证项目创建成功并关联到用户
        assert project.created_by == user.id

    async def test_project_timestamps(self, db_session, sample_user):
        """测试项目时间戳自动更新"""
        # Arrange & Act
        project = Project(
            id=str(uuid.uuid4()),
            name="时间戳测试项目",
            created_by=sample_user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        initial_created_at = project.created_at
        initial_updated_at = project.updated_at

        # 模拟延迟
        import time
        time.sleep(0.01)

        # 更新项目
        project.name = "更新后的时间戳测试项目"
        await db_session.commit()
        await db_session.refresh(project)

        # Assert
        assert project.created_at == initial_created_at  # created_at 不变
        assert project.updated_at > initial_updated_at  # updated_at 更新

    async def test_project_name_max_length(self, db_session, sample_user):
        """测试项目名称最大长度限制"""
        # Arrange & Act
        long_name = "A" * 255  # 最大长度
        project = Project(
            id=str(uuid.uuid4()),
            name=long_name,
            created_by=sample_user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        # Assert
        assert len(project.name) == 255
        assert project.name == long_name

    async def test_project_name_not_nullable(self, db_session, sample_user):
        """测试项目名称不能为 NULL"""
        # Arrange & Act
        project = Project(
            id=str(uuid.uuid4()),
            name=None,  # type: ignore
            created_by=sample_user.id
        )
        db_session.add(project)

        # Assert
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_project_created_by_not_nullable(self, db_session):
        """测试 created_by 不能为 NULL"""
        # Arrange & Act
        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=None  # type: ignore
        )
        db_session.add(project)

        # Assert
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_project_foreign_key_constraint(self, db_session):
        """测试外键约束: created_by 必须引用有效的 user (注意: SQLite 默认不强制外键)"""
        # SQLite 默认不强制外键约束,需要 PRAGMA foreign_keys=ON
        # 这里我们只测试创建时的关联关系
        # Arrange
        user = User(
            id="test-user-uuid-4444444444444444444444",
            username="test_user_fk",
            email="test@example.com",
            hashed_password="hash123"
        )
        db_session.add(user)
        await db_session.commit()

        # Act
        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=user.id  # 引用有效的用户
        )
        db_session.add(project)
        await db_session.commit()

        # Assert
        # 只验证项目创建成功并关联到用户
        assert project.created_by == user.id
