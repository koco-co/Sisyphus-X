"""
系统设置 API 端点
"""

from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.db import get_session
from app.models.settings import GlobalConfig, NotificationChannel, Role
from typing import Optional

router = APIRouter()


# ==================== 全局配置 ====================


@router.get("/config", response_model=list[GlobalConfig])
async def list_configs(
    category: Optional[str] = Query(None), session: AsyncSession = Depends(get_session)
):
    """获取全局配置列表"""
    statement = select(GlobalConfig)
    if category:
        statement = statement.where(GlobalConfig.category == category)
    result = await session.execute(statement)
    configs = result.scalars().all()

    # 隐藏敏感信息
    for config in configs:
        if config.is_secret:
            config.value = "******"

    return configs


@router.get("/config/{key}")
async def get_config(key: str, session: AsyncSession = Depends(get_session)):
    """获取单个配置"""
    result = await session.execute(select(GlobalConfig).where(GlobalConfig.key == key))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    return config


@router.put("/config/{key}")
async def update_config(
    key: str, value: str = Body(..., embed=True), session: AsyncSession = Depends(get_session)
):
    """更新配置"""
    result = await session.execute(select(GlobalConfig).where(GlobalConfig.key == key))
    config = result.scalar_one_or_none()

    if not config:
        # 创建新配置
        config = GlobalConfig(key=key, value=value)
        session.add(config)
    else:
        config.value = value
        config.updated_at = datetime.utcnow()

    await session.commit()
    await session.refresh(config)
    return config


@router.post("/config/batch")
async def batch_update_configs(
    configs: list[dict] = Body(...), session: AsyncSession = Depends(get_session)
):
    """批量更新配置"""
    updated = []
    for item in configs:
        key = item.get("key")
        if not isinstance(key, str) or not key:
            continue
        value = item.get("value", "")
        category = item.get("category", "general")
        description = item.get("description")
        is_secret = item.get("is_secret", False)

        result = await session.execute(select(GlobalConfig).where(GlobalConfig.key == key))
        config = result.scalar_one_or_none()

        if config:
            config.value = value
            config.category = category
            config.description = description
            config.is_secret = is_secret
            config.updated_at = datetime.utcnow()
        else:
            config = GlobalConfig(
                key=key,
                value=value,
                category=category,
                description=description,
                is_secret=is_secret,
            )
            session.add(config)

        updated.append(key)

    await session.commit()
    return {"updated": updated, "count": len(updated)}


# ==================== 消息通知 ====================


@router.get("/notifications", response_model=list[NotificationChannel])
async def list_notification_channels(session: AsyncSession = Depends(get_session)):
    """获取通知渠道列表"""
    result = await session.execute(select(NotificationChannel))
    return result.scalars().all()


@router.post("/notifications", response_model=NotificationChannel)
async def create_notification_channel(
    data: dict = Body(...), session: AsyncSession = Depends(get_session)
):
    """创建通知渠道"""
    channel = NotificationChannel(**data)
    session.add(channel)
    await session.commit()
    await session.refresh(channel)
    return channel


@router.put("/notifications/{channel_id}")
async def update_notification_channel(
    channel_id: int, data: dict = Body(...), session: AsyncSession = Depends(get_session)
):
    """更新通知渠道"""
    channel = await session.get(NotificationChannel, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="渠道不存在")

    for key, value in data.items():
        if hasattr(channel, key):
            setattr(channel, key, value)

    channel.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(channel)
    return channel


@router.delete("/notifications/{channel_id}")
async def delete_notification_channel(
    channel_id: int, session: AsyncSession = Depends(get_session)
):
    """删除通知渠道"""
    channel = await session.get(NotificationChannel, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="渠道不存在")

    await session.delete(channel)
    await session.commit()
    return {"deleted": channel_id}


# ==================== 角色管理 ====================


@router.get("/roles", response_model=list[Role])
async def list_roles(session: AsyncSession = Depends(get_session)):
    """获取角色列表"""
    result = await session.execute(select(Role))
    return result.scalars().all()


@router.post("/roles", response_model=Role)
async def create_role(data: dict = Body(...), session: AsyncSession = Depends(get_session)):
    """创建角色"""
    role = Role(**data)
    session.add(role)
    await session.commit()
    await session.refresh(role)
    return role


@router.put("/roles/{role_id}")
async def update_role(
    role_id: int, data: dict = Body(...), session: AsyncSession = Depends(get_session)
):
    """更新角色"""
    role = await session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")

    for key, value in data.items():
        if hasattr(role, key):
            setattr(role, key, value)

    await session.commit()
    await session.refresh(role)
    return role


@router.delete("/roles/{role_id}")
async def delete_role(role_id: int, session: AsyncSession = Depends(get_session)):
    """删除角色"""
    role = await session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")

    await session.delete(role)
    await session.commit()
    return {"deleted": role_id}
