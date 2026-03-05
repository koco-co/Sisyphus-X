"""内置全局参数种子数据 (BE-062 / GP-002)

在应用启动时写入系统内置工具函数，如 UUID 生成等。
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.global_param import GlobalParam

# 内置全局参数：UUID 工具类
BUILTIN_GLOBAL_PARAM = {
    "class_name": "UUIDHelper",
    "method_name": "random_uuid",
    "description": "生成随机 UUID 字符串",
    "code": '''class UUIDHelper:
    """UUID 工具类"""

    @staticmethod
    def random_uuid() -> str:
        """生成随机 UUID 字符串。

        Returns:
            str: 如 "550e8400-e29b-41d4-a716-446655440000"
        """
        import uuid
        return str(uuid.uuid4())
''',
    "input_params": [],  # 无入参
    "output_params": [{"name": "uuid", "type": "str", "description": "UUID 字符串"}],
}


async def seed_builtin_global_params(session: AsyncSession) -> None:
    """初始化内置全局参数种子数据。

    若数据库中尚无对应该 class_name + method_name 的记录，则插入一条。
    使用新的表结构: input_params/output_params (JSONB) 代替 parameters/return_value。
    """
    result = await session.execute(select(GlobalParam).where(
        GlobalParam.class_name == BUILTIN_GLOBAL_PARAM["class_name"],
        GlobalParam.method_name == BUILTIN_GLOBAL_PARAM["method_name"],
    ))
    if result.scalar_one_or_none() is not None:
        return

    # 创建全局参数 (使用新的表结构)
    param = GlobalParam(
        class_name=BUILTIN_GLOBAL_PARAM["class_name"],
        method_name=BUILTIN_GLOBAL_PARAM["method_name"],
        description=BUILTIN_GLOBAL_PARAM["description"],
        code=BUILTIN_GLOBAL_PARAM["code"],
        input_params=BUILTIN_GLOBAL_PARAM["input_params"],
        output_params=BUILTIN_GLOBAL_PARAM["output_params"],
    )
    session.add(param)
    await session.commit()
