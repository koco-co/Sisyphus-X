"""
文档中心 API 端点
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, func, select

from app.core.db import get_session
from app.models.document import Document, DocumentVersion
from app.schemas.pagination import PageResponse
from typing import Optional

router = APIRouter()


@router.get("/", response_model=PageResponse[Document])
async def list_documents(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    project_id: Optional[int] = Query(None),
    doc_type: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session),
):
    """获取文档列表"""
    skip = (page - 1) * size
    statement = select(Document)
    count_statement = select(func.count()).select_from(Document)

    if project_id is not None:
        statement = statement.where(col(Document.project_id) == project_id)
        count_statement = count_statement.where(col(Document.project_id) == project_id)

    if doc_type:
        statement = statement.where(col(Document.doc_type) == doc_type)
        count_statement = count_statement.where(col(Document.doc_type) == doc_type)

    total = int((await session.execute(count_statement)).scalar_one() or 0)
    result = await session.execute(
        statement.offset(skip).limit(size).order_by(col(Document.order_index))
    )
    items = list(result.scalars().all())

    return PageResponse(
        items=items, total=total, page=page, size=size, pages=(total + size - 1) // size
    )


@router.get("/tree")
async def get_document_tree(
    project_id: int = Query(...),
    doc_type: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session),
):
    """获取文档树形结构"""
    statement = select(Document).where(col(Document.project_id) == project_id)
    if doc_type:
        statement = statement.where(col(Document.doc_type) == doc_type)

    result = await session.execute(statement.order_by(col(Document.order_index)))
    documents = result.scalars().all()

    # 构建树形结构
    doc_map = {doc.id: {**doc.dict(), "children": []} for doc in documents}
    tree = []

    for doc in documents:
        if doc.parent_id and doc.parent_id in doc_map:
            doc_map[doc.parent_id]["children"].append(doc_map[doc.id])
        else:
            tree.append(doc_map[doc.id])

    return tree


@router.post("/", response_model=Document)
async def create_document(data: dict = Body(...), session: AsyncSession = Depends(get_session)):
    """创建文档"""
    document = Document(**data)
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return document


@router.get("/{document_id}", response_model=Document)
async def get_document(document_id: int, session: AsyncSession = Depends(get_session)):
    """获取文档详情"""
    document = await session.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    return document


@router.put("/{document_id}")
async def update_document(
    document_id: int,
    data: dict = Body(...),
    save_version: bool = Query(False),
    session: AsyncSession = Depends(get_session),
):
    """更新文档"""
    document = await session.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    # 保存版本历史
    if save_version:
        # 获取最新版本号
        version_stmt = select(func.max(DocumentVersion.version)).where(
            DocumentVersion.document_id == document_id
        )
        max_version = (await session.execute(version_stmt)).scalar() or 0

        version = DocumentVersion(
            document_id=document_id,
            version=max_version + 1,
            content=document.content,
            change_note=data.get("change_note", ""),
        )
        session.add(version)

    for key, value in data.items():
        if hasattr(document, key) and key != "change_note":
            setattr(document, key, value)

    document.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(document)
    return document


@router.delete("/{document_id}")
async def delete_document(document_id: int, session: AsyncSession = Depends(get_session)):
    """删除文档"""
    document = await session.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    await session.delete(document)
    await session.commit()
    return {"deleted": document_id}


@router.get("/{document_id}/versions", response_model=list[DocumentVersion])
async def get_document_versions(document_id: int, session: AsyncSession = Depends(get_session)):
    """获取文档版本历史"""
    result = await session.execute(
        select(DocumentVersion)
        .where(col(DocumentVersion.document_id) == document_id)
        .order_by(col(DocumentVersion.version).desc())
    )
    return result.scalars().all()


@router.post("/{document_id}/versions/{version}/restore")
async def restore_document_version(
    document_id: int, version: int, session: AsyncSession = Depends(get_session)
):
    """恢复到指定版本"""
    document = await session.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    version_stmt = select(DocumentVersion).where(
        DocumentVersion.document_id == document_id, DocumentVersion.version == version
    )
    result = await session.execute(version_stmt)
    doc_version = result.scalar_one_or_none()

    if not doc_version:
        raise HTTPException(status_code=404, detail="版本不存在")

    # 保存当前版本
    max_version_stmt = select(func.max(DocumentVersion.version)).where(
        DocumentVersion.document_id == document_id
    )
    max_version = (await session.execute(max_version_stmt)).scalar() or 0

    current_version = DocumentVersion(
        document_id=document_id,
        version=max_version + 1,
        content=document.content,
        change_note=f"恢复到版本 {version} 前的备份",
    )
    session.add(current_version)

    # 恢复内容
    document.content = doc_version.content
    document.updated_at = datetime.now(timezone.utc)

    await session.commit()
    return {"restored_to_version": version}


@router.post("/ai/search")
async def ai_search_documents(
    query: str = Body(..., embed=True),
    project_id: Optional[int] = Body(None, embed=True),
    session: AsyncSession = Depends(get_session),
):
    """AI文档检索"""

    # 获取文档内容
    statement = select(Document)
    if project_id is not None:
        statement = statement.where(col(Document.project_id) == project_id)

    result = await session.execute(statement)
    documents = result.scalars().all()

    # 简单关键字匹配 (生产环境应使用向量搜索)
    matches = []
    for doc in documents:
        if query.lower() in doc.title.lower() or query.lower() in doc.content.lower():
            matches.append(
                {
                    "id": doc.id,
                    "title": doc.title,
                    "doc_type": doc.doc_type,
                    "snippet": doc.content[:200] + "..." if len(doc.content) > 200 else doc.content,
                }
            )

    return {"query": query, "matches": matches}
