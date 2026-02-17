"""GlobalParam 模型单元测试

按照 docs/数据库设计.md §3.17 定义
"""
import uuid
import pytest
from sqlalchemy import select

from app.models.global_param import GlobalParam
from app.models.user import User


@pytest.mark.asyncio
async def test_create_global_param(db_session):
    """测试创建全局参数"""
    # 创建用户
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        username="testuser",
        email="test@example.com",
        hashed_password="hashed",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    # 创建全局参数
    param = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="StringUtils",
        method_name="random_string",
        code="def random_string(length: int) -> str:\n    return 'random'",
        description="生成随机字符串",
        parameters='[{"name": "length", "type": "int"}]',
        return_value='{"type": "str", "description": "随机字符串"}',
        created_by=user_id,
    )
    db_session.add(param)
    await db_session.commit()
    await db_session.refresh(param)

    assert param.id is not None
    assert param.class_name == "StringUtils"
    assert param.method_name == "random_string"
    assert param.code is not None
    assert param.created_at is not None
    assert param.updated_at is not None


@pytest.mark.asyncio
async def test_global_param_jsonb_fields(db_session):
    """测试 JSONB 字段"""
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        username="testuser",
        email="test@example.com",
        hashed_password="hashed",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    # 测试 JSONB 数据
    parameters = '[{"name": "min", "type": "int"}, {"name": "max", "type": "int"}]'
    return_value = '{"type": "int", "description": "随机整数"}'

    param = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="NumberUtils",
        method_name="random_int",
        code="code",
        parameters=parameters,
        return_value=return_value,
        created_by=user_id,
    )
    db_session.add(param)
    await db_session.commit()
    await db_session.refresh(param)

    assert param.parameters is not None
    assert param.return_value is not None


@pytest.mark.asyncio
async def test_query_global_params_by_class(db_session):
    """测试按类名查询全局参数"""
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        username="testuser",
        email="test@example.com",
        hashed_password="hashed",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    # 创建多个参数
    for i in range(3):
        param = GlobalParam(
            id=str(uuid.uuid4()),
            class_name="StringUtils",
            method_name=f"method_{i}",
            code=f"code_{i}",
            created_by=user_id,
        )
        db_session.add(param)

    # 不同类的参数
    param2 = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="NumberUtils",
        method_name="random_int",
        code="code",
        created_by=user_id,
    )
    db_session.add(param2)
    await db_session.commit()

    # 查询 StringUtils 类的所有参数
    stmt = select(GlobalParam).where(GlobalParam.class_name == "StringUtils")
    result = await db_session.execute(stmt)
    string_utils_params = result.scalars().all()

    assert len(string_utils_params) == 3
    for param in string_utils_params:
        assert param.class_name == "StringUtils"


@pytest.mark.asyncio
async def test_global_param_update(db_session):
    """测试更新全局参数"""
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        username="testuser",
        email="test@example.com",
        hashed_password="hashed",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    param = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="StringUtils",
        method_name="random_string",
        code="old_code",
        description="旧描述",
        created_by=user_id,
    )
    db_session.add(param)
    await db_session.commit()
    await db_session.refresh(param)

    # 更新
    param.code = "new_code"
    param.description = "新描述"
    await db_session.commit()
    await db_session.refresh(param)

    assert param.code == "new_code"
    assert param.description == "新描述"
    assert param.updated_at > param.created_at


@pytest.mark.asyncio
async def test_global_param_timestamps(db_session):
    """测试时间戳"""
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        username="testuser",
        email="test@example.com",
        hashed_password="hashed",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    param = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="StringUtils",
        method_name="random_string",
        code="code",
        created_by=user_id,
    )
    db_session.add(param)
    await db_session.commit()
    await db_session.refresh(param)

    from datetime import datetime
    assert param.created_at is not None
    assert isinstance(param.created_at, datetime)
    assert param.updated_at is not None
    assert isinstance(param.updated_at, datetime)
