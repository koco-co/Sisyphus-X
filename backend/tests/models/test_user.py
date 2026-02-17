"""用户模型单元测试

测试 User 模型的 CRUD 操作和字段验证
"""
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.db import async_session_maker
from app.models.user import User


@pytest.mark.asyncio
class TestUserModel:
    """用户模型测试类"""

    async def test_create_user_with_password(self, db_session):
        """测试创建带密码的用户"""
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password="hashed_password_123",
            is_active=True,
        )

        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.hashed_password == "hashed_password_123"
        assert user.is_active is True
        assert user.oauth_provider is None
        assert user.oauth_id is None

    async def test_create_oauth_user(self, db_session):
        """测试创建 OAuth 用户(GitHub)"""
        user = User(
            username="github_user",
            email="github_user@example.com",
            oauth_provider="github",
            oauth_id="github_123456",
            is_active=True,
        )

        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        assert user.id is not None
        assert user.email == "github_user@example.com"
        assert user.hashed_password is None  # OAuth 用户无密码
        assert user.oauth_provider == "github"
        assert user.oauth_id == "github_123456"

    async def test_create_google_oauth_user(self, db_session):
        """测试创建 Google OAuth 用户"""
        user = User(
            username="google_user",
            email="google_user@example.com",
            oauth_provider="google",
            oauth_id="google_789",
            is_active=True,
        )

        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        assert user.oauth_provider == "google"
        assert user.oauth_id == "google_789"
        assert user.hashed_password is None

    async def test_email_unique_constraint(self, db_session):
        """测试邮箱唯一性约束"""
        # 创建第一个用户
        user1 = User(
            username="user1",
            email="duplicate@example.com",
            hashed_password="password1",
        )
        db_session.add(user1)
        await db_session.commit()

        # 尝试创建相同邮箱的用户
        user2 = User(
            username="user2",
            email="duplicate@example.com",
            hashed_password="password2",
        )
        db_session.add(user2)

        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_oauth_unique_constraint(self, db_session):
        """测试 OAuth (provider, id) 唯一性约束"""
        # 创建第一个 GitHub 用户
        user1 = User(
            username="github_user1",
            email="user1@example.com",
            oauth_provider="github",
            oauth_id="github_123",
        )
        db_session.add(user1)
        await db_session.commit()

        # 尝试创建相同 GitHub ID 的用户
        user2 = User(
            username="github_user2",
            email="user2@example.com",
            oauth_provider="github",
            oauth_id="github_123",
        )
        db_session.add(user2)

        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_default_is_active_true(self, db_session):
        """测试默认 is_active 为 True"""
        user = User(
            username="active_user",
            email="active@example.com",
            hashed_password="password",
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        assert user.is_active is True

    async def test_update_user(self, db_session):
        """测试更新用户信息"""
        user = User(
            username="update_user",
            email="update@example.com",
            hashed_password="old_password",
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        # 更新密码
        user.hashed_password = "new_password"
        user.is_active = False
        await db_session.commit()
        await db_session.refresh(user)

        assert user.hashed_password == "new_password"
        assert user.is_active is False

    async def test_delete_user(self, db_session):
        """测试删除用户"""
        user = User(
            username="delete_user",
            email="delete@example.com",
            hashed_password="password",
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        user_id = user.id

        await db_session.delete(user)
        await db_session.commit()

        # 验证用户已删除
        result = await db_session.execute(select(User).where(User.id == user_id))
        assert result.scalar_one_or_none() is None

    async def test_query_users_by_email(self, db_session):
        """测试通过邮箱查询用户"""
        user1 = User(
            username="email_user1",
            email="user1@example.com",
            hashed_password="pass1"
        )
        user2 = User(
            username="email_user2",
            email="user2@example.com",
            hashed_password="pass2"
        )
        db_session.add_all([user1, user2])
        await db_session.commit()

        result = await db_session.execute(
            select(User).where(User.email == "user1@example.com")
        )
        found_user = result.scalar_one()

        assert found_user.email == "user1@example.com"

    async def test_multiple_oauth_users_different_providers(self, db_session):
        """测试不同 OAuth 提供商可以使用相同的 oauth_id"""
        # GitHub 用户
        github_user = User(
            username="github_oauth",
            email="github@example.com",
            oauth_provider="github",
            oauth_id="oauth_123",
        )
        db_session.add(github_user)
        await db_session.commit()

        # Google 用户可以使用相同的 oauth_id
        google_user = User(
            username="google_oauth",
            email="google@example.com",
            oauth_provider="google",
            oauth_id="oauth_123",
        )
        db_session.add(google_user)
        await db_session.commit()  # 不应该抛出异常

        assert github_user.oauth_id == google_user.oauth_id
        assert github_user.oauth_provider != google_user.oauth_provider

    async def test_user_timestamps(self, db_session):
        """测试用户创建和更新时间戳"""
        user = User(
            username="timestamp_user",
            email="timestamp@example.com",
            hashed_password="password",
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        assert user.created_at is not None
        assert user.updated_at is not None

        # 等待一小段时间确保时间戳不同
        import asyncio

        await asyncio.sleep(0.01)

        # 更新用户
        user.is_active = False
        await db_session.commit()
        await db_session.refresh(user)

        assert user.updated_at > user.created_at
