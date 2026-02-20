"""数据库连接和 Session 管理

这个文件负责设置 SQLAlchemy 2.0 引擎、Session 工厂，
以及提供 FastAPI 依赖注入函数。
"""

from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.base import Base

# 导入所有模型以确保它们被注册到 Base.metadata
# 这对于 Alembic 自动生成迁移至关重要
# 注意：必须放在 Base 定义之后，避免循环导入
from app import models  # noqa: F401


# 判断是否使用 SQLite（本地开发）或 PostgreSQL（生产）
if "sqlite" in settings.DATABASE_URL:
    # SQLite 需要使用 aiosqlite 作为异步驱动
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG if hasattr(settings, 'DEBUG') else False,
        pool_pre_ping=True,  # 自动检测连接是否有效
    )
    # Alembic 迁移需要同步引擎
    sync_engine = create_engine(
        settings.DATABASE_URL.replace("+aiosqlite", ""),
        pool_pre_ping=True,
    )
else:
    # PostgreSQL 使用 asyncpg 作为异步驱动
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG if hasattr(settings, 'DEBUG') else False,
        pool_size=10,  # 连接池大小
        max_overflow=20,  # 最大溢出连接数
        pool_pre_ping=True,
    )
    # Alembic 迁移需要同步引擎
    sync_engine = create_engine(
        settings.DATABASE_URL.replace("+asyncpg", ""),
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
    )

# 异步 Session 工厂 - 用于所有异步数据库操作
async_session_maker = async_sessionmaker(
    engine,
    expire_on_commit=False,  # 提交后不过期对象，方便后续访问
)

# 同步 Session 工厂 - 用于 Alembic 迁移
sync_session_maker = sessionmaker(
    bind=sync_engine,
    expire_on_commit=False,
)


async def init_db():
    """初始化数据库表

    在应用启动时调用，创建所有不存在的表。
    注意：生产环境应该使用 Alembic 迁移而不是这个函数。
    """
    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all)  # 调试用：删除所有表
        await conn.run_sync(Base.metadata.create_all)

    # 初始化内置关键字种子数据
    from app.core.seed_keywords import seed_builtin_keywords
    async with async_session_maker() as session:
        await seed_builtin_keywords(session)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """获取异步数据库 Session

    这是 FastAPI 依赖注入函数，用于在路由中获取数据库会话。

    使用示例：
        @router.get("/users")
        async def get_users(session: AsyncSession = Depends(get_session)):
            result = await session.execute(select(User))
            return result.scalars().all()
    """
    async with async_session_maker() as session:
        yield session
