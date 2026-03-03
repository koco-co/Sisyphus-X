"""接口模块路由

提供接口目录和接口定义的 API 端点。
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import PagedData, success
from app.models_new.user import User
from app.modules.interface.schemas import (
    FolderCreate,
    FolderResponse,
    FolderUpdate,
    InterfaceCreate,
    InterfaceResponse,
    InterfaceUpdate,
)
from app.modules.interface.service import FolderService, InterfaceService

router = APIRouter(prefix="/projects/{project_id}/interfaces", tags=["Interfaces"])


# ============================================================================
# 目录管理
# ============================================================================


@router.get("/folders", summary="获取目录树")
async def list_folders(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """获取项目下的目录树结构

    返回嵌套的目录结构，每个目录包含接口计数和子目录列表。
    """
    service = FolderService(session)
    folders = await service.get_tree(project_id)
    return success(folders)


@router.post("/folders", summary="创建目录")
async def create_folder(
    project_id: str,
    data: FolderCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """创建新目录

    可以指定父目录 ID 来创建嵌套结构。
    """
    service = FolderService(session)
    folder = await service.create(project_id, data)
    return success(FolderResponse.model_validate(folder))


@router.put("/folders/{folder_id}", summary="更新目录")
async def update_folder(
    project_id: str,
    folder_id: str,
    data: FolderUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """更新目录信息

    可以更新名称、排序顺序或移动到其他父目录下。
    """
    service = FolderService(session)
    folder = await service.update(folder_id, data)
    return success(FolderResponse.model_validate(folder))


@router.delete("/folders/{folder_id}", summary="删除目录")
async def delete_folder(
    project_id: str,
    folder_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """删除目录

    删除目录不会删除目录下的接口，接口会移动到根目录。
    """
    service = FolderService(session)
    await service.delete(folder_id)
    return success()


# ============================================================================
# 接口管理
# ============================================================================


@router.get("", summary="获取接口列表")
async def list_interfaces(
    project_id: str,
    folder_id: Optional[str] = Query(None, description="目录 ID，不传则返回所有接口"),
    search: Optional[str] = Query(None, description="搜索关键词，匹配名称和路径"),
    method: Optional[str] = Query(None, description="HTTP 方法过滤"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """获取接口列表

    支持按目录、搜索关键词和 HTTP 方法过滤，支持分页。
    """
    service = InterfaceService(session)
    interfaces, total = await service.list(
        project_id=project_id,
        folder_id=folder_id,
        search=search,
        method=method,
        page=page,
        page_size=page_size,
    )

    # 计算总页数
    total_pages = (total + page_size - 1) // page_size

    # 构建分页数据
    paged_data = PagedData[InterfaceResponse](
        items=[InterfaceResponse.model_validate(i) for i in interfaces],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

    return success(paged_data)


@router.post("", summary="创建接口")
async def create_interface(
    project_id: str,
    data: InterfaceCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """创建新接口定义

    可以指定所属目录、请求方法、路径、请求头、查询参数和请求体。
    """
    service = InterfaceService(session)
    interface = await service.create(project_id, data)
    return success(InterfaceResponse.model_validate(interface))


@router.get("/{interface_id}", summary="获取接口详情")
async def get_interface(
    project_id: str,
    interface_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """获取单个接口的详细信息"""
    service = InterfaceService(session)
    interface = await service.get(interface_id)
    return success(InterfaceResponse.model_validate(interface))


@router.put("/{interface_id}", summary="更新接口")
async def update_interface(
    project_id: str,
    interface_id: str,
    data: InterfaceUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """更新接口定义

    可以更新接口的所有属性。
    """
    service = InterfaceService(session)
    interface = await service.update(interface_id, data)
    return success(InterfaceResponse.model_validate(interface))


@router.delete("/{interface_id}", summary="删除接口")
async def delete_interface(
    project_id: str,
    interface_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """删除接口定义"""
    service = InterfaceService(session)
    await service.delete(interface_id)
    return success()


@router.post("/{interface_id}/move", summary="移动接口")
async def move_interface(
    project_id: str,
    interface_id: str,
    folder_id: Optional[str] = Query(None, description="目标目录 ID，不传则移动到根目录"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """移动接口到指定目录

    将接口移动到指定的目录下，如果不传 folder_id 则移动到根目录。
    """
    service = InterfaceService(session)
    interface = await service.move(interface_id, folder_id)
    return success(InterfaceResponse.model_validate(interface))
