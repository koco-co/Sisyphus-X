from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_session
from app.models.project import Interface, InterfaceFolder
from app.schemas.pagination import PageResponse
import httpx
import time
from app.schemas.interface import InterfaceSendRequest, InterfaceSendResponse

router = APIRouter()

@router.get("/", response_model=PageResponse[Interface])
async def read_interfaces(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    project_id: int = Query(None),
    folder_id: int = Query(None),
    session: AsyncSession = Depends(get_session)
):
    skip = (page - 1) * size
    
    statement = select(Interface)
    count_statement = select(func.count()).select_from(Interface)
    
    if project_id:
        statement = statement.where(Interface.project_id == project_id)
        count_statement = count_statement.where(Interface.project_id == project_id)
    
    if folder_id:
        statement = statement.where(Interface.folder_id == folder_id)
        count_statement = count_statement.where(Interface.folder_id == folder_id)
        
    total = (await session.execute(count_statement)).scalar()
    result = await session.execute(statement.offset(skip).limit(size))
    interfaces = result.scalars().all()
    
    pages = (total + size - 1) // size
    
    return PageResponse(
        items=interfaces,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("/", response_model=Interface)
async def create_interface(
    interface: Interface,
    session: AsyncSession = Depends(get_session)
):
    session.add(interface)
    await session.commit()
    await session.refresh(interface)
    return interface

@router.get("/{interface_id}", response_model=Interface)
async def read_interface(
    interface_id: int,
    session: AsyncSession = Depends(get_session)
):
    interface = await session.get(Interface, interface_id)
    if not interface:
        raise HTTPException(status_code=404, detail="Interface not found")
    return interface


@router.put("/{interface_id}", response_model=Interface)
async def update_interface(
    interface_id: int,
    data: dict,
    session: AsyncSession = Depends(get_session)
):
    """更新接口"""
    from datetime import datetime
    
    interface = await session.get(Interface, interface_id)
    if not interface:
        raise HTTPException(status_code=404, detail="Interface not found")
    
    # 允许更新的字段
    allowed_fields = ['name', 'url', 'method', 'status', 'description', 
                      'headers', 'params', 'body', 'body_type', 'cookies', 'folder_id']
    for key, value in data.items():
        if key in allowed_fields:
            setattr(interface, key, value)
    
    interface.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(interface)
    return interface


@router.delete("/{interface_id}")
async def delete_interface(
    interface_id: int,
    session: AsyncSession = Depends(get_session)
):
    """删除接口"""
    interface = await session.get(Interface, interface_id)
    if not interface:
        raise HTTPException(status_code=404, detail="Interface not found")
    
    await session.delete(interface)
    await session.commit()
    return {"deleted": interface_id}

@router.post("/debug/send", response_model=InterfaceSendResponse)
async def send_interface_request(
    request: InterfaceSendRequest
):
    async with httpx.AsyncClient() as client:
        start_time = time.time()
        try:
            response = await client.request(
                method=request.method,
                url=request.url,
                headers=request.headers,
                params=request.params,
                json=request.body,
                timeout=request.timeout
            )
            elapsed = time.time() - start_time
            
            try:
                body = response.json()
            except:
                body = response.text
 
            return InterfaceSendResponse(
                status_code=response.status_code,
                headers=dict(response.headers),
                body=body,
                elapsed=elapsed
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

# === 接口文件夹管理 ===

@router.get("/folders", response_model=List[InterfaceFolder])
async def list_folders(
    project_id: int = Query(None),
    session: AsyncSession = Depends(get_session)
):
    """获取接口文件夹树"""
    statement = select(InterfaceFolder)
    if project_id:
        statement = statement.where(InterfaceFolder.project_id == project_id)
    
    result = await session.execute(statement)
    folders = result.scalars().all()
    return folders

@router.post("/folders", response_model=InterfaceFolder)
async def create_folder(
    folder: InterfaceFolder,
    session: AsyncSession = Depends(get_session)
):
    """创建接口文件夹"""
    session.add(folder)
    await session.commit()
    await session.refresh(folder)
    return folder

@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: int,
    session: AsyncSession = Depends(get_session)
):
    """删除接口文件夹"""
    folder = await session.get(InterfaceFolder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # 检查是否有子文件夹或接口
    child_folders_stmt = select(func.count()).select_from(InterfaceFolder).where(
        InterfaceFolder.parent_id == folder_id
    )
    child_count = (await session.execute(child_folders_stmt)).scalar()
    
    interfaces_stmt = select(func.count()).select_from(Interface).where(
        Interface.folder_id == folder_id
    )
    interface_count = (await session.execute(interfaces_stmt)).scalar()
    
    if child_count > 0 or interface_count > 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete folder with children or interfaces"
        )
    
    await session.delete(folder)
    await session.commit()
    return {"deleted": folder_id}
