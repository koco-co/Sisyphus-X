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
from app.models.global_param import GlobalParam
from app.models.keyword import Keyword
from app.models.project import Project, ProjectEnvironment
from app.models.user import User

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
        hashed_password="$2b$12$test_hash_not_for_production",
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

    env = ProjectEnvironment(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name="开发环境",
        domain="http://localhost:8000",
        variables={"base_url": "http://localhost:8000"},
    )
    session.add(env)

    print(f"[seed_projects] Created demo project (id={project_id}) with environment")
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
            "class_name": "发送请求",
            "name": "HTTP 请求",
            "method_name": "http_request",
            "code": "# 内置关键字 - 由引擎处理",
        },
        {
            "class_name": "断言类型",
            "name": "JSON 断言",
            "method_name": "assert_json",
            "code": "# 内置关键字 - 由引擎处理",
        },
        {
            "class_name": "提取变量",
            "name": "JSON 提取",
            "method_name": "extract_json",
            "code": "# 内置关键字 - 由引擎处理",
        },
        {
            "class_name": "数据库操作",
            "name": "执行 SQL",
            "method_name": "execute_sql",
            "code": "# 内置关键字 - 由引擎处理",
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
            id=str(uuid.uuid4()),
            class_name=kw_data["class_name"],
            name=kw_data["name"],
            method_name=kw_data["method_name"],
            code=kw_data["code"],
            is_built_in=True,
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
