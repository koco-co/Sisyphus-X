"""
白盒测试框架配置文件

Pytest 配置和全局 fixture
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "backend"))

import pytest
import asyncio
from typing import AsyncGenerator, Generator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

# 导入应用和模型
from app.main import app
from app.core.base import Base
from app.core.config import settings


# ============================================================================
# 测试数据库配置
# ============================================================================

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# 创建测试引擎
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# 创建测试 Session
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ============================================================================
# 数据库 Fixture
# ============================================================================

@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    创建测试数据库会话

    每个测试函数都会获得一个全新的数据库
    测试结束后自动回滚所有更改
    """
    # 创建所有表
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 创建会话
    async with TestSessionLocal() as session:
        yield session

    # 清理：删除所有表
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def db_session_with_data(db_session: AsyncSession) -> AsyncSession:
    """
    创建包含测试数据的数据库会话

    自动插入常用的测试数据：
    - 测试用户
    - 测试项目
    - 测试环境
    """
    from app.models.user import User
    from app.models.project import Project
    from app.models.env_variable import Environment
    from sqlalchemy import select

    # 创建测试用户
    test_user = User(
        email="test@example.com",
        hashed_password="hashed_password",
        is_active=True,
    )
    db_session.add(test_user)
    await db_session.commit()
    await db_session.refresh(test_user)

    # 创建测试项目
    test_project = Project(
        name="Test Project",
        description="Test project description",
        created_by=test_user.id,
    )
    db_session.add(test_project)
    await db_session.commit()
    await db_session.refresh(test_project)

    # 创建测试环境
    test_environment = Environment(
        project_id=test_project.id,
        name="Test Environment",
        base_url="http://localhost:8000",
    )
    db_session.add(test_environment)
    await db_session.commit()
    await db_session.refresh(test_environment)

    return db_session


# ============================================================================
# HTTP Client Fixture
# ============================================================================

@pytest.fixture(scope="function")
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """
    创建异步 HTTP 客户端

    用于测试 FastAPI 端点
    """
    # 开发模式：禁用认证
    original_auth_disabled = settings.AUTH_DISABLED
    settings.AUTH_DISABLED = True

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    # 恢复原始设置
    settings.AUTH_DISABLED = original_auth_disabled


@pytest.fixture(scope="function")
async def authenticated_async_client(
    async_client: AsyncClient, db_session: AsyncSession
) -> AsyncGenerator[AsyncClient, None]:
    """
    创建已认证的异步 HTTP 客户端

    自动设置 JWT Token
    """
    from app.core.security import create_access_token
    from app.models.user import User
    from sqlalchemy import select

    # 创建测试用户
    test_user = User(
        email="auth_test@example.com",
        hashed_password="hashed_password",
        is_active=True,
    )
    db_session.add(test_user)
    await db_session.commit()
    await db_session.refresh(test_user)

    # 创建 JWT Token
    token = create_access_token(data={"sub": str(test_user.id)})

    # 设置 Authorization 头
    async_client.headers.update({"Authorization": f"Bearer {token}"})

    yield async_client

    # 清理
    del async_client.headers["Authorization"]


# ============================================================================
# 测试数据 Fixture
# ============================================================================

@pytest.fixture
def sample_user_data() -> dict:
    """示例用户数据"""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "password_confirm": "testpassword123",
    }


@pytest.fixture
def sample_project_data() -> dict:
    """示例项目数据"""
    return {
        "name": "Test Project",
        "description": "Test project description",
    }


@pytest.fixture
def sample_environment_data() -> dict:
    """示例环境数据"""
    return {
        "name": "Test Environment",
        "base_url": "http://localhost:8000",
    }


# ============================================================================
# Pytest 配置
# ============================================================================

def pytest_configure(config):
    """Pytest 配置钩子"""
    # 注册自定义标记
    config.addinivalue_line(
        "markers", "unit: 单元测试标记"
    )
    config.addinivalue_line(
        "markers", "integration: 集成测试标记"
    )
    config.addinivalue_line(
        "markers", "api: API 测试标记"
    )
    config.addinivalue_line(
        "markers", "slow: 慢速测试标记"
    )


@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ============================================================================
# 测试工具函数
# ============================================================================

@pytest.fixture
def assert_valid_response():
    """验证 API 响应格式的辅助函数"""

    def _assert(response, expected_status=200):
        assert response.status_code == expected_status, (
            f"Expected status {expected_status}, got {response.status_code}\n"
            f"Response: {response.text}"
        )

        # 验证响应格式
        if response.status_code in (200, 201):
            data = response.json()
            assert "success" in data or "data" in data, (
                f"Response missing 'success' or 'data' field: {data}"
            )
            return data

        return response.json()

    return _assert
