"""
用户认证模块单元测试

测试用户注册、登录、OAuth、JWT 等功能
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.models.user import User
from app.core.security import create_access_token, verify_password


@pytest.mark.unit
class TestUserModel:
    """用户模型测试"""

    async def test_create_user(self, db_session: AsyncSession):
        """测试创建用户"""
        user = User(
            email="test@example.com",
            hashed_password="hashed_password",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.hashed_password == "hashed_password"
        assert user.is_active is True

    async def test_user_unique_email(self, db_session: AsyncSession):
        """测试邮箱唯一性约束"""
        from sqlalchemy import select

        # 创建第一个用户
        user1 = User(
            email="test@example.com",
            hashed_password="hashed_password1",
        )
        db_session.add(user1)
        await db_session.commit()

        # 尝试创建相同邮箱的用户
        user2 = User(
            email="test@example.com",
            hashed_password="hashed_password2",
        )
        db_session.add(user2)

        with pytest.raises(Exception):  # IntegrityError
            await db_session.commit()

    async def test_oauth_user_null_password(self, db_session: AsyncSession):
        """测试 OAuth 用户密码可以为 NULL"""
        user = User(
            email="oauth@example.com",
            oauth_provider="github",
            oauth_id="github_123",
            hashed_password=None,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        assert user.hashed_password is None
        assert user.oauth_provider == "github"
        assert user.oauth_id == "github_123"


@pytest.mark.unit
class TestSecurity:
    """安全工具测试"""

    def test_create_access_token(self):
        """测试创建 JWT Token"""
        data = {"sub": "user_123"}
        token = create_access_token(data)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_verify_password(self):
        """测试密码验证"""
        from app.core.security import get_password_hash

        password = "test_password"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True
        assert verify_password("wrong_password", hashed) is False


@pytest.mark.api
@pytest.mark.usefixtures("db_session")
class TestAuthAPI:
    """认证 API 测试"""

    async def test_register_success(self, async_client: AsyncClient):
        """测试注册成功"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "password123",
                "password_confirm": "password123",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert data["data"]["user"]["email"] == "newuser@example.com"
        assert "token" in data["data"]

    async def test_register_email_exists(self, async_client: AsyncClient, db_session: AsyncSession):
        """测试注册时邮箱已存在"""
        # 先创建用户
        user = User(
            email="exists@example.com",
            hashed_password="hashed",
        )
        db_session.add(user)
        await db_session.commit()

        # 尝试注册相同邮箱
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "exists@example.com",
                "password": "password123",
                "password_confirm": "password123",
            },
        )

        assert response.status_code == 409
        data = response.json()
        assert data["success"] is False

    async def test_register_password_mismatch(self, async_client: AsyncClient):
        """测试注册时密码不匹配"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "password_confirm": "different123",
            },
        )

        assert response.status_code == 400

    async def test_login_success(self, async_client: AsyncClient, db_session: AsyncSession):
        """测试登录成功"""
        from app.core.security import get_password_hash

        # 创建用户
        user = User(
            email="login@example.com",
            hashed_password=get_password_hash("password123"),
        )
        db_session.add(user)
        await db_session.commit()

        # 登录
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": "login@example.com",
                "password": "password123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "token" in data["data"]

    async def test_login_wrong_password(self, async_client: AsyncClient, db_session: AsyncSession):
        """测试登录密码错误"""
        from app.core.security import get_password_hash

        # 创建用户
        user = User(
            email="user@example.com",
            hashed_password=get_password_hash("correct_password"),
        )
        db_session.add(user)
        await db_session.commit()

        # 使用错误密码登录
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": "user@example.com",
                "password": "wrong_password",
            },
        )

        assert response.status_code == 401

    async def test_get_current_user(self, authenticated_async_client: AsyncClient):
        """测试获取当前用户"""
        response = await authenticated_async_client.get("/api/v1/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["email"] == "auth_test@example.com"
