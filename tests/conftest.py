"""Sisyphus-X 测试全局配置

统一管理所有 Python 测试（单元测试、接口测试）的共享 fixtures
"""

from __future__ import annotations

import sys
from pathlib import Path

# 将 backend 目录加入 Python path，使得 app 模块可以被导入
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import asyncio
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from fastapi import Depends

from app.core.base import Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.project import Project, InterfaceFolder, Interface, ProjectEnvironment, ProjectDataSource
from app.models.keyword import Keyword
from app.models.database_config import DatabaseConfig
from app.models.env_variable import EnvVariable
from app.models.api_test_case import ApiTestCase, ApiTestExecution, ApiTestStep, ApiTestStepResult
from app.models.scenario import Scenario, ScenarioStep, Dataset
from app.models.test_execution import TestExecution as ApiTestExecutionRecord
from app.models.test_plan import TestPlan, PlanScenario, TestPlanExecution, PlanExecutionStep
from app.models.test_report import TestReport
from app.models.global_param import GlobalParam

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
DEFAULT_TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_TEST_USER_EMAIL = "default-test-user@example.com"
DEFAULT_TEST_USERNAME = "seed_user"


@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环实例"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def async_engine():
    """创建测试数据库引擎"""
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA foreign_keys = ON"))
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(async_engine):
    """创建数据库会话"""
    async_session_maker = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_maker() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def sample_user(db_session: AsyncSession):
    """创建示例用户 fixture"""
    user = User(
        id=str(uuid.uuid4()),
        username="sample_user",
        email="sample@example.com",
        hashed_password="hashed_password",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    return user


@pytest_asyncio.fixture(scope="function")
async def sample_project(db_session: AsyncSession, sample_user: User):
    """创建示例项目 fixture"""
    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=sample_user.id,
        description="这是一个测试项目",
    )
    db_session.add(project)
    await db_session.commit()
    await db_session.refresh(project)

    return project


@pytest_asyncio.fixture(scope="function")
async def sample_environment(db_session: AsyncSession, sample_project: Project):
    """创建示例环境 fixture"""
    env = ProjectEnvironment(
        id=str(uuid.uuid4()),
        project_id=sample_project.id,
        name="Dev",
        domain="https://api-dev.example.com"
    )
    db_session.add(env)
    await db_session.commit()
    await db_session.refresh(env)

    return env


@pytest_asyncio.fixture(scope="function")
async def sample_test_plan(db_session: AsyncSession, sample_project: Project):
    """创建示例测试计划 fixture"""
    test_plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=sample_project.id,
        name="测试计划",
        description="初始描述",
        status="active"
    )
    db_session.add(test_plan)
    await db_session.commit()
    await db_session.refresh(test_plan)

    return test_plan


@pytest_asyncio.fixture(scope="function")
async def sample_test_scenario(db_session: AsyncSession, sample_project: Project, sample_user: User):
    """创建示例测试场景 fixture"""
    scenario = Scenario(
        id=str(uuid.uuid4()),
        project_id=sample_project.id,
        name="测试场景",
        description="测试场景描述",
        created_by=sample_user.id
    )
    db_session.add(scenario)
    await db_session.commit()
    await db_session.refresh(scenario)

    return scenario


# ========== FastAPI Test Client ==========


@pytest_asyncio.fixture(scope="function")
async def async_client(async_engine, db_session: AsyncSession):
    """创建异步 HTTP 测试客户端"""
    from fastapi import FastAPI
    from httpx import AsyncClient
    from app.api.v1.api import api_router
    from app.core.config import settings
    from app.core.db import get_session, async_session_maker, sync_session_maker, engine

    original_async_session_maker = async_session_maker
    original_sync_session_maker = sync_session_maker
    original_engine = engine

    from sqlalchemy import create_engine
    test_sync_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

    from app.core.base import Base
    from sqlalchemy import text
    with test_sync_engine.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys = ON"))
        Base.metadata.create_all(conn)

    from sqlalchemy.ext.asyncio import async_sessionmaker
    from sqlalchemy.orm import sessionmaker

    test_async_session_maker = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    test_sync_session_maker = sessionmaker(
        bind=test_sync_engine,
        expire_on_commit=False,
    )

    import app.core.db as db_module
    db_module.async_session_maker = test_async_session_maker
    db_module.sync_session_maker = test_sync_session_maker
    db_module.engine = async_engine

    # 确保存在一个默认测试用户，避免后续请求因外键约束失败
    from sqlalchemy import select as sa_select
    from app.core.security import get_password_hash as _get_password_hash

    async with test_async_session_maker() as init_session:
        result = await init_session.execute(
            sa_select(User).where(User.id == DEFAULT_TEST_USER_ID)
        )
        existing_user = result.scalar_one_or_none()
        if not existing_user:
            user = User(
                id=DEFAULT_TEST_USER_ID,
                username=DEFAULT_TEST_USERNAME,
                email=DEFAULT_TEST_USER_EMAIL,
                hashed_password=_get_password_hash("password123"),
                is_active=True,
            )
            init_session.add(user)
            await init_session.commit()

    app = FastAPI(redirect_slashes=False)
    app.include_router(api_router, prefix="/api/v1")

    async def override_get_session():
        async with test_async_session_maker() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    from app.api.deps import get_current_user
    from fastapi import Header, HTTPException
    from starlette import status
    from app.core.security import decode_access_token, get_password_hash

    async def override_get_current_user(
        session: AsyncSession = Depends(get_session),
        authorization: str = Header(None)
    ):
        """测试模式下的认证覆盖：从 JWT token 或返回已存在测试用户"""
        from sqlalchemy import select
        from sqlalchemy.exc import IntegrityError

        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            try:
                payload = decode_access_token(token)
                user_id = payload.get("sub")
                if user_id:
                    result = await session.execute(select(User).where(User.id == user_id))
                    user = result.scalar_one_or_none()
                    if user:
                        session.expunge(user)
                        return user
            except Exception:
                # Token 无效或解析失败时，模拟认证失败
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials",
                )

        # 无 Token 或未携带 Bearer 头：优先返回已存在用户，否则自动创建一个测试用户
        result = await session.execute(select(User).order_by(User.created_at).limit(1))
        user = result.scalar_one_or_none()
        if not user:
            import uuid

            user = User(
                id=DEFAULT_TEST_USER_ID,
                username=DEFAULT_TEST_USERNAME,
                email=DEFAULT_TEST_USER_EMAIL,
                hashed_password=get_password_hash("password123"),
                is_active=True,
            )
            session.add(user)
            try:
                await session.commit()
            except IntegrityError:
                # 并发创建默认用户时，忽略唯一约束错误并加载已存在用户
                await session.rollback()
                result = await session.execute(
                    select(User).where(User.id == DEFAULT_TEST_USER_ID)
                )
                user = result.scalar_one_or_none()
                if not user:
                    # 回退到任意一个已存在用户（如果有）
                    result = await session.execute(
                        select(User).order_by(User.created_at).limit(1)
                    )
                    user = result.scalar_one_or_none()
                    if not user:
                        # 仍然没有用户，重新抛出异常以便尽早暴露问题
                        raise

        session.expunge(user)
        return user

    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()

    db_module.async_session_maker = original_async_session_maker
    db_module.sync_session_maker = original_sync_session_maker
    db_module.engine = original_engine

    test_sync_engine.dispose()


@pytest.fixture(scope="session")
def test_config():
    """测试配置 fixture"""
    return {
        "base_url": "http://test",
        "timeout": 5,
        "test_user": {
            "email": "test@example.com",
            "password": "password123",
            "username": "testuser",
        },
    }
