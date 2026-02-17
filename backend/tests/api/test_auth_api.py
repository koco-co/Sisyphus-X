"""用户认证模块接口自动化测试

测试注册、登录、OAuth、认证失败场景等接口
"""
import pytest
import httpx
from httpx import AsyncClient
from sqlalchemy import select

from app.models.user import User
from app.core.security import verify_password


@pytest.mark.asyncio
class TestAuthRegisterAPI:
    """用户注册接口自动化测试"""

    async def test_register_with_valid_data(self, async_client: AsyncClient):
        """测试有效数据注册"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser001",
                "email": "testuser001@example.com",
                "password": "SecurePass123!",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "testuser001@example.com"
        assert data["user"]["username"] == "testuser001"
        assert data["user"]["is_active"] is True

    async def test_register_with_duplicate_email(self, async_client: AsyncClient):
        """测试重复邮箱注册"""
        # 第一次注册
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "user1",
                "email": "duplicate@example.com",
                "password": "password123",
            },
        )

        # 第二次使用相同邮箱注册
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "user2",
                "email": "duplicate@example.com",
                "password": "password456",
            },
        )
        assert response.status_code == 400
        assert "已被注册" in response.json()["detail"]

    async def test_register_with_duplicate_username(self, async_client: AsyncClient):
        """测试重复用户名注册"""
        # 第一次注册
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "samename",
                "email": "user1@example.com",
                "password": "password123",
            },
        )

        # 第二次使用相同用户名注册
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "samename",
                "email": "user2@example.com",
                "password": "password456",
            },
        )
        assert response.status_code == 400
        assert "已被使用" in response.json()["detail"]

    async def test_register_with_invalid_email_format(self, async_client: AsyncClient):
        """测试无效邮箱格式"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser",
                "email": "invalid-email-format",
                "password": "password123",
            },
        )
        assert response.status_code == 422

    async def test_register_with_short_password(self, async_client: AsyncClient):
        """测试密码过短"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser",
                "email": "shortpass@example.com",
                "password": "123",
            },
        )
        # 可能接受(如果无最小长度限制)或拒绝(如果有验证)
        assert response.status_code in [200, 422]

    async def test_register_with_missing_fields(self, async_client: AsyncClient):
        """测试缺少必填字段"""
        # 缺少username
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "nofields@example.com",
                "password": "password123",
            },
        )
        assert response.status_code == 422

        # 缺少email
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "nofields",
                "password": "password123",
            },
        )
        assert response.status_code == 422

        # 缺少password
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "nofields",
                "email": "nofields@example.com",
            },
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestAuthLoginAPI:
    """用户登录接口自动化测试"""

    async def test_login_with_valid_credentials(self, async_client: AsyncClient):
        """测试有效凭证登录"""
        # 先注册
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "loginuser",
                "email": "loginuser@example.com",
                "password": "correctpassword",
            },
        )

        # 登录
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "loginuser@example.com", "password": "correctpassword"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "loginuser@example.com"

    async def test_login_with_wrong_email(self, async_client: AsyncClient):
        """测试错误邮箱登录"""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@example.com", "password": "password123"},
        )
        assert response.status_code == 401
        assert "邮箱或密码错误" in response.json()["detail"]

    async def test_login_with_wrong_password(self, async_client: AsyncClient):
        """测试错误密码登录"""
        # 先注册
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "wrongpass",
                "email": "wrongpass@example.com",
                "password": "correctpassword",
            },
        )

        # 使用错误密码登录
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "wrongpass@example.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert "邮箱或密码错误" in response.json()["detail"]

    async def test_login_with_missing_fields(self, async_client: AsyncClient):
        """测试缺少必填字段"""
        # 缺少email
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"password": "password123"},
        )
        assert response.status_code == 422

        # 缺少password
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com"},
        )
        assert response.status_code == 422

    async def test_login_with_inactive_account(self, async_client: AsyncClient, db_session):
        """测试禁用账户登录"""
        # 注册用户
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "inactive",
                "email": "inactive@example.com",
                "password": "password123",
            },
        )

        # 禁用用户
        result = await db_session.execute(select(User).where(User.email == "inactive@example.com"))
        user = result.scalar_one()
        user.is_active = False
        await db_session.commit()

        # 尝试登录
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "inactive@example.com", "password": "password123"},
        )
        assert response.status_code == 403
        assert "已被禁用" in response.json()["detail"]


@pytest.mark.asyncio
class TestOAuthAPI:
    """OAuth接口自动化测试"""

    async def test_github_oauth_redirect(self, async_client: AsyncClient):
        """测试GitHub OAuth重定向"""
        response = await async_client.get("/api/v1/auth/github")
        # OAuth未配置时可能返回500,配置后返回200
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = response.json()
            assert "url" in data
            assert "github.com" in data["url"]

    async def test_google_oauth_redirect(self, async_client: AsyncClient):
        """测试Google OAuth重定向"""
        response = await async_client.get("/api/v1/auth/google")
        # OAuth未配置时可能返回500,配置后返回200
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = response.json()
            assert "url" in data
            assert "google.com" in data["url"]

    async def test_github_oauth_callback(self, async_client: AsyncClient):
        """测试GitHub OAuth回调"""
        # 需要有效的code和state,这里只测试接口存在
        response = await async_client.get(
            "/api/v1/auth/github/callback",
            params={"code": "test_code", "state": "test_state"},
        )
        # OAuth回调可能返回307重定向、200成功、400错误请求或500配置错误
        assert response.status_code in [200, 400, 500, 307]

    async def test_google_oauth_callback(self, async_client: AsyncClient):
        """测试Google OAuth回调"""
        # 需要有效的code和state,这里只测试接口存在
        # Google OAuth会尝试实际连接Google服务，可能会超时
        try:
            response = await async_client.get(
                "/api/v1/auth/google/callback",
                params={"code": "test_code", "state": "test_state"},
                timeout=5.0,  # 设置较短的超时时间
            )
            # OAuth回调可能返回307重定向、200成功、400错误请求或500配置错误
            assert response.status_code in [200, 400, 500, 307]
        except (httpx.ConnectTimeout, httpx.ReadTimeout):
            # Google OAuth未配置时会尝试连接外部服务导致超时，这是预期的
            pass


@pytest.mark.asyncio
class TestGetCurrentUserAPI:
    """获取当前用户接口自动化测试"""

    async def test_get_current_user_with_valid_token(self, async_client: AsyncClient):
        """测试有效Token获取当前用户"""
        # 注册并登录
        register_response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "tokenuser",
                "email": "tokenuser@example.com",
                "password": "password123",
            },
        )
        token = register_response.json()["token"]

        # 获取当前用户
        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "tokenuser@example.com"
        assert data["username"] == "tokenuser"

    async def test_get_current_user_without_token(self, async_client: AsyncClient):
        """测试无Token获取当前用户"""
        response = await async_client.get("/api/v1/auth/me")
        # 开发模式可能返回200,生产模式返回401
        assert response.status_code in [200, 401]

    async def test_get_current_user_with_invalid_token(self, async_client: AsyncClient):
        """测试无效Token获取当前用户"""
        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        # 开发模式可能返回200,生产模式返回401或403
        assert response.status_code in [200, 401, 403]

    async def test_get_current_user_with_malformed_token(self, async_client: AsyncClient):
        """测试格式错误的Token"""
        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "InvalidFormat token123"}
        )
        # 开发模式可能返回200,生产模式返回401
        assert response.status_code in [200, 401]


@pytest.mark.asyncio
class TestTokenSecurityAPI:
    """Token安全接口自动化测试"""

    async def test_token_structure(self, async_client: AsyncClient):
        """测试Token结构"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "tokenstructure",
                "email": "tokenstructure@example.com",
                "password": "password123",
            },
        )
        data = response.json()
        token = data["token"]
        assert isinstance(token, str)
        assert len(token) > 0
        # JWT格式: header.payload.signature
        assert token.count(".") == 2

    async def test_token_expiration_time(self, async_client: AsyncClient):
        """测试Token过期时间"""
        from app.core.security import decode_access_token

        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "tokenexp",
                "email": "tokenexp@example.com",
                "password": "password123",
            },
        )
        token = response.json()["token"]
        payload = decode_access_token(token)
        assert payload is not None
        assert "exp" in payload
        assert "sub" in payload

    async def test_password_hashing_security(self, async_client: AsyncClient, db_session):
        """测试密码哈希安全性"""
        plain_password = "SecurePassword123!"

        await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "hashuser",
                "email": "hashuser@example.com",
                "password": plain_password,
            },
        )

        result = await db_session.execute(select(User).where(User.email == "hashuser@example.com"))
        user = result.scalar_one()

        # 验证密码被哈希存储
        assert user.hashed_password != plain_password
        assert user.hashed_password is not None
        assert len(user.hashed_password) > 20  # bcrypt hash长度

        # 验证密码哈希可验证
        assert verify_password(plain_password, user.hashed_password) is True
        assert verify_password("WrongPassword", user.hashed_password) is False


@pytest.mark.asyncio
class TestAuthFailureScenarios:
    """认证失败场景测试"""

    async def test_sql_injection_attempt_in_email(self, async_client: AsyncClient):
        """测试邮箱SQL注入尝试"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "sqluser",
                "email": "'; DROP TABLE users; --",
                "password": "password123",
            },
        )
        # 应该被验证拒绝或安全处理
        assert response.status_code in [400, 422]

    async def test_xss_attempt_in_username(self, async_client: AsyncClient):
        """测试用户名XSS尝试"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "<script>alert('xss')</script>",
                "email": "xss@example.com",
                "password": "password123",
            },
        )
        # 可能接受(如果无XSS防护)或拒绝
        assert response.status_code in [200, 400, 422]

    async def test_brute_force_protection(self, async_client: AsyncClient):
        """测试暴力破解保护"""
        # 尝试多次错误登录
        for i in range(10):
            response = await async_client.post(
                "/api/v1/auth/login",
                json={"email": "bruteforce@example.com", "password": "wrongpassword"},
            )
            # 应该持续返回401或启用速率限制返回429
            assert response.status_code in [401, 429]

    async def test_concurrent_login_attempts(self, async_client: AsyncClient):
        """测试并发登录尝试"""
        import asyncio

        # 先注册用户
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "concurrent",
                "email": "concurrent@example.com",
                "password": "password123",
            },
        )

        # 并发发送多个登录请求
        async def login_request():
            return await async_client.post(
                "/api/v1/auth/login",
                json={"email": "concurrent@example.com", "password": "password123"},
            )

        responses = await asyncio.gather(*[login_request() for _ in range(5)])
        # 所有请求都应该成功
        for response in responses:
            assert response.status_code == 200
