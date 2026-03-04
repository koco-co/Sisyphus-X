"""关键字路由 - REST API 端点

提供关键字的增删改查等 API 接口。
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import PagedData, success
from app.models_new.user import User
from app.modules.keyword import schemas, service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/keywords", tags=["关键字管理"])


@router.get("")
async def list_keywords(
    keyword_type: str | None = Query(None, description="关键字类型"),
    is_enabled: bool | None = Query(None, description="是否启用"),
    search: str | None = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=100, description="每页数量"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取关键字列表"""
    keyword_service = service.KeywordService(session)
    items, total = await keyword_service.list(
        keyword_type=keyword_type,
        is_enabled=is_enabled,
        search=search,
        page=page,
        page_size=page_size,
    )

    return success(
        data=PagedData(
            items=[schemas.KeywordResponse.model_validate(item).model_dump() for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@router.get("/types")
async def get_keyword_types(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取关键字类型列表"""
    keyword_service = service.KeywordService(session)
    types = await keyword_service.get_types()
    return success(data=[t.model_dump() for t in types])


@router.post("")
async def create_keyword(
    data: schemas.KeywordCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """创建关键字"""
    keyword_service = service.KeywordService(session)
    keyword = await keyword_service.create(data)
    return success(
        data=schemas.KeywordResponse.model_validate(keyword).model_dump(),
        message="关键字创建成功"
    )


@router.get("/{keyword_id}")
async def get_keyword(
    keyword_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取关键字详情"""
    keyword_service = service.KeywordService(session)
    keyword = await keyword_service.get(keyword_id)

    if not keyword:
        raise HTTPException(status_code=404, detail="关键字不存在")

    return success(data=schemas.KeywordResponse.model_validate(keyword).model_dump())


@router.put("/{keyword_id}")
async def update_keyword(
    keyword_id: str,
    data: schemas.KeywordUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """更新关键字"""
    keyword_service = service.KeywordService(session)
    keyword = await keyword_service.update(keyword_id, data)

    if not keyword:
        raise HTTPException(status_code=404, detail="关键字不存在")

    return success(
        data=schemas.KeywordResponse.model_validate(keyword).model_dump(),
        message="关键字更新成功"
    )


@router.delete("/{keyword_id}")
async def delete_keyword(
    keyword_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除关键字"""
    keyword_service = service.KeywordService(session)

    try:
        deleted = await keyword_service.delete(keyword_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="关键字不存在")
        return success(message="关键字已删除")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
