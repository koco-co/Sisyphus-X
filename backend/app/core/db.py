from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.core.config import settings
from app import models  # noqa: F401

# 导入所有模型，确保 SQLModel.metadata 包含所有表定义

# 判断是否使用 SQLite（本地开发）或 PostgreSQL（生产）
if "sqlite" in settings.DATABASE_URL:
    # SQLite 需要使用 aiosqlite
    engine = create_async_engine(settings.DATABASE_URL, echo=True, future=True)
    sync_engine = create_engine(settings.DATABASE_URL.replace("+aiosqlite", ""))
else:
    # PostgreSQL Connection
    engine = create_async_engine(settings.DATABASE_URL, echo=True, future=True)
    sync_engine = create_engine(settings.DATABASE_URL.replace("+asyncpg", ""))
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)
from sqlalchemy.orm import sessionmaker
sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)


async def init_db():
    async with engine.begin() as conn:
        # await conn.run_sync(SQLModel.metadata.drop_all) # Uncomment to reset DB
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
