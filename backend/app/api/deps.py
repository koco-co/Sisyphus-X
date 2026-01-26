"""
API 依赖注入模块
"""
import os
from typing import Optional
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import get_session
from app.core.security import decode_access_token
from app.models.user import User

from app.core.config import settings
# 全局配置: 是否禁用鉴权
AUTH_DISABLED = settings.AUTH_DISABLED


async def get_current_user(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
) -> User:
    """从 Authorization 头中获取当前用户"""
    
    # 开发模式: 禁用鉴权时返回默认用户
    if AUTH_DISABLED:
        result = await session.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        if user:
            return user
        # 如果没有用户，创建一个默认用户
        from app.core.security import get_password_hash
        default_user = User(
            username="admin",
            email="admin@sisyphus.dev",
            hashed_password=get_password_hash("admin123"),
            is_active=True
        )
        session.add(default_user)
        await session.commit()
        await session.refresh(default_user)
        return default_user
    
    # 正常鉴权流程
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供有效的认证令牌"
        )
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌无效或已过期"
        )
    
    user_id = int(payload["sub"])
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在或已被禁用"
        )
    
    return user


async def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
) -> Optional[User]:
    """可选的用户鉴权，用于不严格要求登录的接口"""
    if AUTH_DISABLED:
        result = await session.execute(select(User).limit(1))
        return result.scalar_one_or_none()
    
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    try:
        return await get_current_user(authorization, session)
    except HTTPException:
        return None

