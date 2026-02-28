"""内置全局参数种子数据 (BE-062 / GP-002)

在应用启动时写入系统内置工具函数，如 UUID 生成等。
"""

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.global_param import GlobalParam
from app.models.user import User

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
    "parameters": [],
    "return_value": {"type": "str", "description": "UUID 字符串"},
}


async def seed_builtin_global_params(session: AsyncSession) -> None:
    """初始化内置全局参数种子数据。

    若数据库中尚无对应该 class_name + method_name 的记录，则插入一条。
    需要至少存在一个用户，以其 id 作为 created_by。
    """
    result = await session.execute(select(GlobalParam).where(
        GlobalParam.class_name == BUILTIN_GLOBAL_PARAM["class_name"],
        GlobalParam.method_name == BUILTIN_GLOBAL_PARAM["method_name"],
    ))
    if result.scalar_one_or_none() is not None:
        return

    # 使用第一个用户作为 created_by；若无用户则跳过（如全新安装需先注册）
    user_result = await session.execute(select(User).limit(1))
    user = user_result.scalar_one_or_none()
    if not user:
        return

    # 表中 parameters/return_value 为 Text 存 JSON 字符串
    parameters_json = json.dumps(BUILTIN_GLOBAL_PARAM.get("parameters") or [], ensure_ascii=False)
    return_value_json = json.dumps(BUILTIN_GLOBAL_PARAM.get("return_value") or {}, ensure_ascii=False)
    param = GlobalParam(
        class_name=BUILTIN_GLOBAL_PARAM["class_name"],
        method_name=BUILTIN_GLOBAL_PARAM["method_name"],
        description=BUILTIN_GLOBAL_PARAM["description"],
        code=BUILTIN_GLOBAL_PARAM["code"],
        parameters=parameters_json,
        return_value=return_value_json,
        created_by=user.id,
    )
    session.add(param)
    await session.commit()
