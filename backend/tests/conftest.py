"""测试配置文件

定义所有测试共享的 fixtures
"""
import asyncio
import os
import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from fastapi import Depends

from app.core.base import Base
# 导入所有模型以确保 metadata.create_all() 能创建所有表
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
# 其他模型按需导入

# 使用内存 SQLite 数据库进行测试
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环实例"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def async_engine():
    """创建测试数据库引擎"""
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )

    # 创建所有表
    async with engine.begin() as conn:
        # 启用 SQLite 外键约束
        await conn.execute(text("PRAGMA foreign_keys = ON"))
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # 清理:删除所有表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(async_engine):
    """创建数据库会话"""
    async_session_maker = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_maker() as session:
        yield session

    # 会话自动回滚/关闭


@pytest.fixture(scope="function")
async def sample_user(db_session: AsyncSession):
    """创建示例用户 fixture (UUID 版本)"""
    import uuid
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


@pytest.fixture(scope="function")
async def sample_project(db_session: AsyncSession, sample_user: User):
    """创建示例项目 fixture (UUID 版本)"""
    import uuid
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


@pytest.fixture(scope="function")
async def sample_environment(db_session: AsyncSession, sample_project: Project):
    """创建示例环境 fixture (UUID 版本)"""
    import uuid
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


@pytest.fixture(scope="function")
async def sample_test_plan(db_session: AsyncSession, sample_project: Project):
    """创建示例测试计划 fixture"""
    import uuid
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


@pytest.fixture(scope="function")
async def sample_test_scenario(db_session: AsyncSession, sample_project: Project, sample_user: User):
    """创建示例测试场景 fixture"""
    import uuid
    scenario = Scenario(
        id=str(uuid.uuid4()),
        project_id=sample_project.id,
        name="测试场景",
        description="测试场景描述",
        created_by=sample_user.id  # 添加created_by字段
    )
    db_session.add(scenario)
    await db_session.commit()
    await db_session.refresh(scenario)

    return scenario


# ========== FastAPI Test Client ==========


@pytest.fixture(scope="function")
async def async_client(async_engine, db_session: AsyncSession):
    """创建异步 HTTP 测试客户端"""
    from fastapi import FastAPI
    from httpx import AsyncClient
    from app.api.v1.api import api_router
    from app.core.config import settings
    from app.core.db import get_session, async_session_maker, sync_session_maker, engine

    # 保存原始的 session makers 和引擎
    original_async_session_maker = async_session_maker
    original_sync_session_maker = sync_session_maker
    original_engine = engine

    # 创建测试用的同步引擎
    from sqlalchemy import create_engine
    test_sync_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

    # 在同步引擎上创建所有表
    from app.core.base import Base
    from sqlalchemy import text
    with test_sync_engine.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys = ON"))
        Base.metadata.create_all(conn)

    # 创建测试用的 session makers
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

    # 替换全局 session makers 和引擎
    import app.core.db as db_module
    db_module.async_session_maker = test_async_session_maker
    db_module.sync_session_maker = test_sync_session_maker
    db_module.engine = async_engine

    # 创建测试应用
    app = FastAPI(redirect_slashes=False)  # 禁用自动重定向
    app.include_router(api_router, prefix="/api/v1")

    # 覆盖数据库依赖
    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session

    # 禁用认证: 创建默认测试用户
    from app.api.deps import get_current_user
    from app.core.security import get_password_hash

    async def override_get_current_user(session: AsyncSession = Depends(get_session)):
        # 查找或创建测试用户
        from sqlalchemy import select
        result = await session.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                username="test_user",
                email="test@example.com",
                hashed_password=get_password_hash("test123"),
                is_active=True,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        return user

    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    # 清理依赖覆盖
    app.dependency_overrides.clear()

    # 恢复原始 session makers 和引擎
    db_module.async_session_maker = original_async_session_maker
    db_module.sync_session_maker = original_sync_session_maker
    db_module.engine = original_engine

    # 清理测试同步引擎
    test_sync_engine.dispose()
