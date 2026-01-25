from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func
from datetime import datetime
from app.core.db import get_session
from app.models import Keyword
from app.schemas.keyword import KeywordCreate, KeywordUpdate, KeywordResponse
from app.schemas.pagination import PageResponse

router = APIRouter()

@router.get("/", response_model=PageResponse[KeywordResponse])
async def list_keywords(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    project_id: int = Query(None),
    session: AsyncSession = Depends(get_session)
):
    """获取关键字列表 (分页)"""
    skip = (page - 1) * size
    statement = select(Keyword)
    count_statement = select(func.count()).select_from(Keyword)
    
    if project_id:
        statement = statement.where(Keyword.project_id == project_id)
        count_statement = count_statement.where(Keyword.project_id == project_id)
    
    total = (await session.execute(count_statement)).scalar()
    result = await session.execute(statement.offset(skip).limit(size))
    keywords = result.scalars().all()
    
    pages = (total + size - 1) // size
    
    return PageResponse(
        items=keywords,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("/", response_model=KeywordResponse)
async def create_keyword(
    data: KeywordCreate,
    session: AsyncSession = Depends(get_session)
):
    """创建关键字"""
    keyword = Keyword(**data.model_dump())
    session.add(keyword)
    await session.commit()
    await session.refresh(keyword)
    return keyword

@router.get("/{keyword_id}", response_model=KeywordResponse)
async def get_keyword(
    keyword_id: int,
    session: AsyncSession = Depends(get_session)
):
    """获取单个关键字"""
    keyword = await session.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    return keyword

@router.put("/{keyword_id}", response_model=KeywordResponse)
async def update_keyword(
    keyword_id: int,
    data: KeywordUpdate,
    session: AsyncSession = Depends(get_session)
):
    """更新关键字"""
    keyword = await session.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    # 更新字段
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(keyword, key, value)
    
    keyword.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(keyword)
    return keyword

@router.delete("/{keyword_id}")
async def delete_keyword(
    keyword_id: int,
    session: AsyncSession = Depends(get_session)
):
    """删除关键字"""
    keyword = await session.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    await session.delete(keyword)
    await session.commit()
    return {"deleted": keyword_id}


@router.put("/{keyword_id}/toggle")
async def toggle_keyword_status(
    keyword_id: int,
    session: AsyncSession = Depends(get_session)
):
    """切换关键字启用/禁用状态"""
    keyword = await session.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    keyword.is_active = not keyword.is_active
    keyword.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(keyword)
    return {"id": keyword_id, "is_active": keyword.is_active}


@router.post("/{keyword_id}/generate-file")
async def generate_keyword_file(
    keyword_id: int,
    session: AsyncSession = Depends(get_session)
):
    """将关键字代码写入到 api-engine/keywords/ 目录"""
    import os
    
    keyword = await session.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    # 确定文件路径
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
    keywords_dir = os.path.join(base_dir, "engines", "api-engine", "keywords")
    
    # 创建目录
    os.makedirs(keywords_dir, exist_ok=True)
    
    # 生成文件内容
    file_content = f'''# -*- coding: utf-8 -*-
"""
关键字: {keyword.name}
分类: {keyword.category}
描述: {keyword.description or '无'}
自动生成，请勿手动修改
"""

{keyword.function_code}
'''
    
    # 写入文件
    file_path = os.path.join(keywords_dir, f"{keyword.func_name}.py")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(file_content)
    
    return {
        "success": True,
        "message": f"已生成文件: keywords/{keyword.func_name}.py",
        "file_path": file_path
    }

