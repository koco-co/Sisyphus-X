"""
数据库连接测试脚本

用于验证 SQLAlchemy 2.0 基础架构配置正确。
运行: uv run python test_db_connection.py
"""

import asyncio
from sqlalchemy import text
from app.core.db import async_session_maker, engine
from app.core.base import Base


async def test_database_connection():
    """测试数据库连接和基本操作"""

    print("🔍 开始测试数据库连接...\n")

    # 测试 1: 引擎连接
    print("测试 1: 检查异步引擎...")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print(f"   ✅ 异步引擎连接成功: {result.scalar_one()}")
    except Exception as e:
        print(f"   ❌ 异步引擎连接失败: {e}")
        return False

    # 测试 2: Session 工厂
    print("\n测试 2: 检查 Session 工厂...")
    try:
        async with async_session_maker() as session:
            result = await session.execute(text("SELECT 2"))
            print(f"   ✅ Session 工厂正常: {result.scalar_one()}")
    except Exception as e:
        print(f"   ❌ Session 工厂失败: {e}")
        return False

    # 测试 3: 数据库类型检测
    print("\n测试 3: 检测数据库类型...")
    try:
        async with engine.connect() as conn:
            if "sqlite" in str(engine.url):
                result = await conn.execute(text("SELECT sqlite_version()"))
                print(f"   ✅ SQLite 版本: {result.scalar_one()}")
            elif "postgresql" in str(engine.url):
                result = await conn.execute(text("SELECT version()"))
                print(f"   ✅ PostgreSQL 版本: {result.scalar_one()[:50]}...")
            else:
                print(f"   ⚠️  未知数据库类型: {engine.url}")
    except Exception as e:
        print(f"   ❌ 数据库类型检测失败: {e}")
        return False

    # 测试 4: 表存在性检查
    print("\n测试 4: 检查现有表...")
    try:
        async with engine.connect() as conn:
            if "sqlite" in str(engine.url):
                result = await conn.execute(text(
                    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
                ))
            else:
                result = await conn.execute(text(
                    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
                ))

            tables = [row[0] for row in result.fetchall()]
            if tables:
                print(f"   ✅ 现有表 ({len(tables)} 个):")
                for table in tables[:10]:  # 只显示前 10 个
                    print(f"      - {table}")
                if len(tables) > 10:
                    print(f"      ... 还有 {len(tables) - 10} 个表")
            else:
                print("   ⚠️  数据库中没有表（正常，如果是全新安装）")
    except Exception as e:
        print(f"   ❌ 表检查失败: {e}")
        return False

    print("\n" + "=" * 50)
    print("✅ 所有测试通过！数据库连接正常。")
    print("=" * 50)
    return True


async def test_orm_import():
    """测试 ORM 模型导入"""
    print("\n测试 5: 检查 ORM 模型导入...")
    try:
        from app.models import user, project  # noqa: F401
        print("   ✅ ORM 模型导入成功")
    except ImportError as e:
        print(f"   ❌ ORM 模型导入失败: {e}")
        return False

    # 检查 Base.metadata
    try:
        print(f"   ✅ Base.metadata 包含 {len(Base.metadata.tables)} 个表")
        if Base.metadata.tables:
            print("   已注册的表:")
            for table_name in sorted(Base.metadata.tables.keys()):
                print(f"      - {table_name}")
    except Exception as e:
        print(f"   ❌ Base.metadata 检查失败: {e}")
        return False

    return True


async def main():
    """主测试函数"""
    print("=" * 50)
    print("SQLAlchemy 2.0 数据库连接测试")
    print("=" * 50)

    success = await test_database_connection()
    await test_orm_import()

    if success:
        print("\n🎉 所有测试完成！基础架构配置正确。")
    else:
        print("\n⚠️  部分测试失败，请检查配置。")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
