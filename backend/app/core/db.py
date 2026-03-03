"""数据库连接和 Session 管理

这个文件负责设置 SQLAlchemy 2.0 引擎、Session 工厂，
以及提供 FastAPI 依赖注入函数。

Phase 1 重构：支持 models_new 中的新模型
"""

from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker

# 导入现有模型以确保它们被注册到 Base.metadata
# 这对于 Alembic 自动生成迁移至关重要
from app import models  # noqa: F401
from app.core.base import Base

# 导入新模型 (Phase 1 重构)
# 这确保 Alembic 能检测到 models_new 中的所有表
from app import models_new  # noqa: F401
from app.core.base_new import Base as BaseNew  # noqa: F401

from app.core.config import settings

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

    Phase 1 重构：同时初始化旧模型和新模型的表
    """
    async with engine.begin() as conn:
        # 初始化现有模型的表
        await conn.run_sync(Base.metadata.create_all)
        # 初始化新模型的表 (Phase 1 重构)
        await conn.run_sync(BaseNew.metadata.create_all)

    # 初始化内置关键字种子数据 (BE-017)
    from app.core.seed_keywords import seed_builtin_keywords
    # 初始化内置全局参数种子数据 (BE-062)
    from app.core.seed_global_params import seed_builtin_global_params
    async with async_session_maker() as session:
        await seed_builtin_keywords(session)
        await seed_builtin_global_params(session)


async def drop_db():
    """删除所有表（仅用于测试）

    Phase 1 重构：同时删除旧模型和新模型的表
    """
    async with engine.begin() as conn:
        # 删除新模型的表
        await conn.run_sync(BaseNew.metadata.drop_all)
        # 删除现有模型的表
        await conn.run_sync(Base.metadata.drop_all)


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
