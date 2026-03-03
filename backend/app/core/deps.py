"""
认证依赖注入模块

使用 app/modules/auth/service.py 的 JWT 功能和 app/models_new/user.py 模型
"""
from typing import Optional

from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.core.exceptions import PermissionDeniedException
from app.models_new.user import User
from app.modules.auth.service import decode_token

security = HTTPBearer(auto_error=False)

# 默认测试用户 ID (开发模式使用)
DEFAULT_TEST_USER_ID = "00000000-0000-0000-0000-000000000001"


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> User:
    """
    获取当前用户

    开发模式: 如果 AUTH_DISABLED=true, 返回默认测试用户
    生产模式: 验证 JWT Token
    """
    if settings.AUTH_DISABLED:
        # 开发模式: 返回默认测试用户
        result = await session.execute(
            select(User).where(User.id == DEFAULT_TEST_USER_ID)
        )
        user = result.scalar_one_or_none()
        if user:
            return user
        # 如果不存在,创建默认用户
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        user = User(
            id=DEFAULT_TEST_USER_ID,
            email="default-test-user@example.com",
            username="default_user",
            password_hash=pwd_context.hash("default_password"),
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    # 生产模式: 验证 Token
    if not credentials:
        raise PermissionDeniedException("未提供认证信息")

    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise PermissionDeniedException("无效的 Token")

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise PermissionDeniedException("用户不存在")

    if not user.is_active:
        raise PermissionDeniedException("账户已被禁用")

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> Optional[User]:
    """可选的用户认证(不强制要求登录)"""
    try:
        return await get_current_user(credentials, session)
    except PermissionDeniedException:
        return None
