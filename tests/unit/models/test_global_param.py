"""GlobalParam 模型单元测试

按照 docs/数据库设计.md §3.17 定义

Phase 1 重构: 使用 input_params/output_params (JSON) 代替 parameters/return_value
"""
import uuid
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.global_param import GlobalParam


@pytest.mark.asyncio
async def test_create_global_param(db_session):
    """测试创建全局参数"""
    # 创建全局参数
    param = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="StringUtils",
        method_name="random_string",
        code="def random_string(length: int) -> str:\n    return 'random'",
        description="生成随机字符串",
        input_params=[{"name": "length", "type": "int"}],
        output_params={"type": "str", "description": "随机字符串"},
    )
    db_session.add(param)
    await db_session.commit()
    await db_session.refresh(param)

    assert param.id is not None
    assert param.class_name == "StringUtils"
    assert param.method_name == "random_string"
    assert param.code is not None
    assert param.created_at is not None


@pytest.mark.asyncio
async def test_global_param_json_fields(db_session):
    """测试 JSON 字段 (input_params/output_params)"""
    # 测试 JSON 数据
    input_params = [{"name": "min", "type": "int"}, {"name": "max", "type": "int"}]
    output_params = {"type": "int", "description": "随机整数"}

    param = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="NumberUtils",
        method_name="random_int",
        code="code",
        input_params=input_params,
        output_params=output_params,
    )
    db_session.add(param)
    await db_session.commit()
    await db_session.refresh(param)

    assert param.input_params is not None
    assert param.output_params is not None
    assert len(param.input_params) == 2
    assert param.output_params["type"] == "int"


@pytest.mark.asyncio
async def test_query_global_params_by_class(db_session):
    """测试按类名查询全局参数"""
    # 创建多个参数
    for i in range(3):
        param = GlobalParam(
            id=str(uuid.uuid4()),
            class_name="StringUtils",
            method_name=f"method_{i}",
            code=f"code_{i}",
        )
        db_session.add(param)

    # 不同类的参数
    param2 = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="NumberUtils",
        method_name="random_int",
        code="code",
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
    param = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="StringUtils",
        method_name="random_string",
        code="old_code",
        description="旧描述",
    )
    db_session.add(param)
    await db_session.commit()
    await db_session.refresh(param)
    original_created_at = param.created_at

    # 更新
    param.code = "new_code"
    param.description = "新描述"
    await db_session.commit()
    await db_session.refresh(param)

    assert param.code == "new_code"
    assert param.description == "新描述"
    assert param.created_at == original_created_at


@pytest.mark.asyncio
async def test_global_param_timestamps(db_session):
    """测试时间戳"""
    param = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="StringUtils",
        method_name="timestamp_test",
        code="code",
    )
    db_session.add(param)
    await db_session.commit()
    await db_session.refresh(param)

    from datetime import datetime
    assert param.created_at is not None
    assert isinstance(param.created_at, datetime)


@pytest.mark.asyncio
async def test_global_param_unique_class_method(db_session):
    """测试 (class_name, method_name) 唯一约束"""
    # 创建第一个参数
    param1 = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="TestUtils",
        method_name="unique_method",
        code="code1",
    )
    db_session.add(param1)
    await db_session.commit()

    # 尝试创建相同 class_name + method_name 的参数
    param2 = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="TestUtils",
        method_name="unique_method",  # 重复
        code="code2",
    )
    db_session.add(param2)

    # 应该抛出 IntegrityError
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_global_param_different_methods_allowed(db_session):
    """测试同一类名下可以有不同方法名"""
    param1 = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="DateUtils",
        method_name="get_date",
        code="code1",
    )
    param2 = GlobalParam(
        id=str(uuid.uuid4()),
        class_name="DateUtils",
        method_name="get_time",
        code="code2",
    )
    db_session.add_all([param1, param2])
    await db_session.commit()

    # 应该成功创建
    await db_session.refresh(param1)
    await db_session.refresh(param2)
    assert param1.method_name == "get_date"
    assert param2.method_name == "get_time"
