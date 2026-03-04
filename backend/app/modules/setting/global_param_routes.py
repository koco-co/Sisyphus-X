"""全局参数路由 - REST API 端点

提供全局参数（辅助函数）的增删改查等 API 接口。
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import PagedData, success
from app.models_new.user import User
from app.modules.setting import global_param_service
from app.modules.setting.global_param_schemas import (
    GlobalParamCreate,
    GlobalParamResponse,
    GlobalParamUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/global-params", tags=["全局参数管理"])


@router.get("")
async def list_global_params(
    search: str | None = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=100, description="每页数量"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取全局参数列表"""
    param_service = global_param_service.GlobalParamService(session)
    items, total = await param_service.list(
        search=search,
        page=page,
        page_size=page_size,
    )

    return success(
        data=PagedData(
            items=[GlobalParamResponse.model_validate(item).model_dump() for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@router.post("")
async def create_global_param(
    data: GlobalParamCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """创建全局参数"""
    param_service = global_param_service.GlobalParamService(session)
    param = await param_service.create(data)
    return success(
        data=GlobalParamResponse.model_validate(param).model_dump(),
        message="全局参数创建成功"
    )


@router.get("/{param_id}")
async def get_global_param(
    param_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取全局参数详情"""
    param_service = global_param_service.GlobalParamService(session)
    param = await param_service.get(param_id)

    if not param:
        raise HTTPException(status_code=404, detail="全局参数不存在")

    return success(data=GlobalParamResponse.model_validate(param).model_dump())


@router.put("/{param_id}")
async def update_global_param(
    param_id: str,
    data: GlobalParamUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """更新全局参数"""
    param_service = global_param_service.GlobalParamService(session)
    param = await param_service.update(param_id, data)

    if not param:
        raise HTTPException(status_code=404, detail="全局参数不存在")

    return success(
        data=GlobalParamResponse.model_validate(param).model_dump(),
        message="全局参数更新成功"
    )


@router.delete("/{param_id}")
async def delete_global_param(
    param_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除全局参数"""
    param_service = global_param_service.GlobalParamService(session)
    deleted = await param_service.delete(param_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="全局参数不存在")

    return success(message="全局参数已删除")
