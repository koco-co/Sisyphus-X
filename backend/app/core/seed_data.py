"""种子数据脚本 - 用于初始化测试数据

这个脚本创建基础的测试数据:
- 默认测试用户
- 演示项目及环境
- 内置关键字
- 全局参数示例

可以通过命令行运行:
    cd backend && uv run python -m app.core.seed_data
"""
import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import async_session_maker, init_db
from app.models_new import (
    Environment,
    GlobalParam,
    GlobalVariable,
    Keyword,
    Project,
    User,
)

# 默认测试用户 ID
DEFAULT_TEST_USER_ID = "00000000-0000-0000-0000-000000000001"


async def seed_users(session: AsyncSession) -> bool:
    """创建默认测试用户

    Returns:
        bool: True 如果创建了新用户, False 如果用户已存在
    """
    result = await session.execute(select(User).where(User.id == DEFAULT_TEST_USER_ID))
    if result.scalar_one_or_none():
        print("[seed_users] Test user already exists")
        return False

    user = User(
        id=DEFAULT_TEST_USER_ID,
        email="default-test-user@example.com",
        username="default_user",
        password_hash="$2b$12$test_hash_not_for_production",  # 开发环境用
        is_active=True,
    )
    session.add(user)
    print("[seed_users] Created default test user")
    return True


async def seed_projects(session: AsyncSession) -> bool:
    """创建测试项目和关联数据

    创建:
    - Demo Project
    - 默认环境 (开发环境)
    - 全局变量 (base_url)

    Returns:
        bool: True 如果创建了新项目, False 如果项目已存在
    """
    result = await session.execute(select(Project).where(Project.name == "Demo Project"))
    if result.scalar_one_or_none():
        print("[seed_projects] Demo project already exists")
        return False

    project_id = str(uuid.uuid4())
    project = Project(
        id=project_id,
        name="Demo Project",
        description="演示项目, 用于测试系统功能",
        created_by=DEFAULT_TEST_USER_ID,
    )
    session.add(project)
    await session.flush()  # 确保 project.id 可用

    # 创建默认环境
    env = Environment(
        id=uuid.uuid4(),
        project_id=uuid.UUID(project_id),
        name="开发环境",
        base_url="http://localhost:8000",
        is_default=True,
    )
    session.add(env)

    # 创建全局变量
    global_var = GlobalVariable(
        id=uuid.uuid4(),
        project_id=uuid.UUID(project_id),
        key="base_url",
        value="http://localhost:8000",
        description="基础 URL",
    )
    session.add(global_var)

    print(f"[seed_projects] Created demo project (id={project_id}) with environment and global variable")
    return True


async def seed_keywords(session: AsyncSession) -> int:
    """创建内置关键字

    创建系统内置的测试关键字:
    - HTTP 请求
    - JSON 断言
    - JSON 提取
    - 执行 SQL

    Returns:
        int: 创建的关键字数量
    """
    builtin_keywords = [
        {
            "keyword_type": "发送请求",
            "name": "HTTP 请求",
            "method_name": "http_request",
            "is_builtin": True,
            "params_schema": {
                "method": {"type": "select", "options": ["GET", "POST", "PUT", "DELETE", "PATCH"]},
                "url": {"type": "string"},
                "headers": {"type": "key_value"},
                "body": {"type": "json"},
            },
        },
        {
            "keyword_type": "断言类型",
            "name": "JSON 断言",
            "method_name": "assert_json",
            "is_builtin": True,
            "params_schema": {
                "expression": {"type": "string", "description": "JSONPath 表达式"},
                "operator": {
                    "type": "select",
                    "options": ["==", "!=", ">", "<", ">=", "<=", "contains"],
                },
                "expected": {"type": "string"},
            },
        },
        {
            "keyword_type": "提取变量",
            "name": "JSON 提取",
            "method_name": "extract_json",
            "is_builtin": True,
            "params_schema": {
                "variable_name": {"type": "string"},
                "variable_type": {"type": "select", "options": ["全局", "环境"]},
                "expression": {"type": "string", "description": "JSONPath 表达式"},
            },
        },
        {
            "keyword_type": "数据库操作",
            "name": "执行 SQL",
            "method_name": "execute_sql",
            "is_builtin": True,
            "params_schema": {
                "datasource": {"type": "select", "options": []},  # 动态加载
                "sql": {"type": "code", "language": "sql"},
            },
        },
    ]

    created_count = 0
    for kw_data in builtin_keywords:
        result = await session.execute(
            select(Keyword).where(Keyword.method_name == kw_data["method_name"])
        )
        if result.scalar_one_or_none():
            continue

        keyword = Keyword(
            id=uuid.uuid4(),
            keyword_type=kw_data["keyword_type"],
            name=kw_data["name"],
            method_name=kw_data["method_name"],
            is_builtin=kw_data["is_builtin"],
            params_schema=kw_data["params_schema"],
        )
        session.add(keyword)
        print(f"[seed_keywords] Created keyword: {kw_data['name']}")
        created_count += 1

    return created_count


async def seed_global_params(session: AsyncSession) -> bool:
    """创建全局参数示例

    创建一个随机字符串生成的工具函数作为示例

    Returns:
        bool: True 如果创建了新参数, False 如果参数已存在
    """
    sample_code = '''class Utils:
    """工具函数类"""

    @staticmethod
    def random_string(length: int = 10) -> str:
        """
        生成随机字符串

        Args:
            length: 字符串长度, 默认 10

        Returns:
            str: 随机字符串
        """
        import random
        import string
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
'''

    result = await session.execute(
        select(GlobalParam).where(GlobalParam.method_name == "random_string")
    )
    if result.scalar_one_or_none():
        print("[seed_global_params] Sample global param already exists")
        return False

    param = GlobalParam(
        id=uuid.uuid4(),
        class_name="Utils",
        method_name="random_string",
        code=sample_code,
        description="生成随机字符串",
        input_params=[{"name": "length", "type": "int", "description": "字符串长度, 默认 10"}],
        output_params=[{"name": "result", "type": "str", "description": "随机字符串"}],
    )
    session.add(param)
    print("[seed_global_params] Created sample global param: Utils.random_string")
    return True


async def main() -> None:
    """主函数 - 执行所有种子数据初始化"""
    print("=" * 60)
    print("Starting seed data initialization...")
    print("=" * 60)

    # 初始化数据库表结构
    print("\n[1/5] Initializing database tables...")
    await init_db()

    # 使用 session 执行种子数据
    async with async_session_maker() as session:
        try:
            # 1. 创建用户
            print("\n[2/5] Seeding users...")
            await seed_users(session)
            await session.commit()

            # 2. 创建项目和关联数据
            print("\n[3/5] Seeding projects...")
            await seed_projects(session)
            await session.commit()

            # 3. 创建关键字
            print("\n[4/5] Seeding keywords...")
            keywords_created = await seed_keywords(session)
            await session.commit()
            print(f"    Created {keywords_created} keywords")

            # 4. 创建全局参数
            print("\n[5/5] Seeding global params...")
            await seed_global_params(session)
            await session.commit()

            print("\n" + "=" * 60)
            print("Seed data completed successfully!")
            print("=" * 60)

        except Exception as e:
            await session.rollback()
            print(f"\n[ERROR] Seed data failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
