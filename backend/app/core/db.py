from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from typing import AsyncGenerator
from app.core.config import settings
# 导入所有模型，确保 SQLModel.metadata 包含所有表定义
from app.models import (
    User, Project, Interface, InterfaceFolder,
    TestScenario, TestCase, Keyword,
    TestReport, TestReportDetail, TestPlan,
    # 功能测试模块模型
    AIProviderConfig, Requirement, AIConversation,
    TestPoint, FunctionalTestCase, TestCaseKnowledge,
    TestCaseTemplate, FileAttachment
)


# 判断是否使用 SQLite（本地开发）或 PostgreSQL（生产）
if "sqlite" in settings.DATABASE_URL:
    # SQLite 需要使用 aiosqlite
    engine = create_async_engine(settings.DATABASE_URL, echo=True, future=True)
else:
    # PostgreSQL Connection
    engine = create_async_engine(settings.DATABASE_URL, echo=True, future=True)

async def init_db():
    async with engine.begin() as conn:
        # await conn.run_sync(SQLModel.metadata.drop_all) # Uncomment to reset DB
        await conn.run_sync(SQLModel.metadata.create_all)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
