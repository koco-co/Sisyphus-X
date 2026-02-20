"""关键字管理 API 端点

参考文档: docs/接口定义.md §4 关键字配置模块
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.keyword import Keyword
from app.models.user import User
from app.schemas.keyword import KeywordCreate, KeywordResponse, KeywordUpdate
from app.schemas.pagination import PageResponse

router = APIRouter()


@router.get("/", response_model=PageResponse[KeywordResponse])
async def list_keywords(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(10, ge=1, le=100, description="每页条数"),
    project_id: str | None = Query(None, description="项目 ID（为空则返回所有内置关键字）"),
    type: str | None = Query(None, description="关键字类型"),
    is_builtin: bool | None = Query(None, description="是否内置关键字"),
    is_enabled: bool | None = Query(None, description="启用状态"),
    search: str | None = Query(None, description="搜索关键字名称或方法名"),
    session: AsyncSession = Depends(get_session),
) -> PageResponse[KeywordResponse]:
    """获取关键字列表（支持过滤和分页）

    Args:
        page: 页码
        size: 每页条数
        project_id: 项目 ID（可选）
        type: 关键字类型（可选）
        is_builtin: 是否内置（可选）
        is_enabled: 启用状态（可选）
        session: 数据库会话

    Returns:
        关键字列表（分页）
    """
    # 构建查询
    query = select(Keyword)

    # 过滤条件
    if project_id is not None:
        query = query.where(col(Keyword.project_id) == project_id)
    else:
        # 如果未指定项目，返回内置关键字
        query = query.where(col(Keyword.is_built_in))

    if type:
        query = query.where(col(Keyword.class_name) == type)

    if is_builtin is not None:
        query = query.where(col(Keyword.is_built_in) == is_builtin)

    if is_enabled is not None:
        query = query.where(col(Keyword.is_enabled) == is_enabled)

    if search:
        query = query.where(
            col(Keyword.name).contains(search) | col(Keyword.method_name).contains(search)
        )

    # 获取总数
    count_statement = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_statement)
    total = int(total_result.scalar_one() or 0)

    # 分页查询
    skip = (page - 1) * size
    statement = query.order_by(col(Keyword.created_at).desc()).offset(skip).limit(size)
    result = await session.execute(statement)
    keywords = result.scalars().all()

    # 计算总页数
    pages = (total + size - 1) // size if total > 0 else 1

    return PageResponse(items=list(keywords), total=total, page=page, size=size, pages=pages)


@router.post("/", response_model=KeywordResponse, status_code=status.HTTP_201_CREATED)
async def create_keyword(
    keyword_in: KeywordCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> KeywordResponse:
    """创建自定义关键字

    Args:
        keyword_in: 关键字创建请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        创建的关键字

    Raises:
        HTTPException 409: class_name + method_name 已存在
    """
    # 检查 class_name + method_name 唯一性
    existing_statement = select(Keyword).where(
        col(Keyword.class_name) == keyword_in.class_name,
        col(Keyword.method_name) == keyword_in.method_name,
    )
    existing_result = await session.execute(existing_statement)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"关键字 {keyword_in.class_name}.{keyword_in.method_name} 已存在",
        )

    # 创建关键字
    keyword = Keyword(
        id=keyword_in.id or str(uuid.uuid4()),
        project_id=keyword_in.project_id,
        name=keyword_in.name,
        class_name=keyword_in.class_name,
        method_name=keyword_in.method_name,
        description=keyword_in.description,
        code=keyword_in.code,
        parameters=keyword_in.parameters,
        return_type=keyword_in.return_type,
        is_built_in=keyword_in.is_built_in,
        is_enabled=keyword_in.is_enabled,
    )
    session.add(keyword)
    await session.commit()
    await session.refresh(keyword)

    return KeywordResponse.model_validate(keyword)


@router.get("/{keyword_id}", response_model=KeywordResponse)
async def get_keyword(
    keyword_id: str,
    session: AsyncSession = Depends(get_session),
) -> KeywordResponse:
    """获取关键字详情

    Args:
        keyword_id: 关键字 ID
        session: 数据库会话

    Returns:
        关键字详情

    Raises:
        HTTPException 404: 关键字不存在
    """
    keyword = await session.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="关键字不存在")

    return KeywordResponse.model_validate(keyword)


@router.put("/{keyword_id}", response_model=KeywordResponse)
async def update_keyword(
    keyword_id: str,
    keyword_in: KeywordUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> KeywordResponse:
    """更新关键字

    Args:
        keyword_id: 关键字 ID
        keyword_in: 关键字更新请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        更新后的关键字

    Raises:
        HTTPException 404: 关键字不存在
        HTTPException 403: 内置关键字不可编辑
        HTTPException 409: class_name + method_name 已存在
    """
    keyword = await session.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="关键字不存在")

    # 内置关键字不可编辑
    if keyword.is_built_in:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="内置关键字不可编辑",
        )

    # 检查 class_name + method_name 唯一性
    if keyword_in.class_name or keyword_in.method_name:
        new_class_name = keyword_in.class_name or keyword.class_name
        new_method_name = keyword_in.method_name or keyword.method_name

        existing_statement = select(Keyword).where(
            col(Keyword.class_name) == new_class_name,
            col(Keyword.method_name) == new_method_name,
            col(Keyword.id) != keyword_id,
        )
        existing_result = await session.execute(existing_statement)
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"关键字 {new_class_name}.{new_method_name} 已存在",
            )

    # 更新字段
    update_data = keyword_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(keyword, field, value)

    keyword.updated_at = datetime.utcnow()
    session.add(keyword)
    await session.commit()
    await session.refresh(keyword)

    return KeywordResponse.model_validate(keyword)


@router.delete("/{keyword_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_keyword(
    keyword_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """删除关键字

    Args:
        keyword_id: 关键字 ID
        current_user: 当前登录用户
        session: 数据库会话

    Raises:
        HTTPException 404: 关键字不存在
        HTTPException 403: 内置关键字不可删除
    """
    keyword = await session.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="关键字不存在")

    # 内置关键字不可删除
    if keyword.is_built_in:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="内置关键字不可删除",
        )

    await session.delete(keyword)
    await session.commit()


@router.patch("/{keyword_id}/toggle")
async def toggle_keyword_status(
    keyword_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """切换关键字启用状态

    Args:
        keyword_id: 关键字 ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        切换后的状态

    Raises:
        HTTPException 404: 关键字不存在
    """
    keyword = await session.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="关键字不存在")

    # 切换状态
    keyword.is_enabled = not keyword.is_enabled
    keyword.updated_at = datetime.utcnow()
    session.add(keyword)
    await session.commit()

    return {"id": keyword_id, "is_enabled": keyword.is_enabled}
