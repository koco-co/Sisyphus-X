"""项目管理路由 - 模块化版本

使用新的 service 层和统一响应格式
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.core.response import PagedData, success
from app.models.user import User
from app.modules.project import schemas, service

router = APIRouter(prefix="/projects", tags=["项目管理"])


@router.get("", response_model=schemas.ProjectListResponse)
async def list_projects(
    search: str = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取项目列表"""
    project_service = service.ProjectService(session)
    projects, total = await project_service.list_projects(
        search=search,
        page=page,
        page_size=page_size,
    )

    return success(data=PagedData(
        items=[schemas.ProjectResponse.model_validate(p) for p in projects],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total > 0 else 1,
    ))


@router.post("", response_model=schemas.ProjectResponse)
async def create_project(
    data: schemas.ProjectCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """创建项目"""
    project_service = service.ProjectService(session)
    project = await project_service.create_project(data, str(current_user.id))
    return success(data=schemas.ProjectResponse.model_validate(project), message="创建成功")


@router.get("/{project_id}", response_model=schemas.ProjectResponse)
async def get_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取项目详情"""
    project_service = service.ProjectService(session)
    project = await project_service.get_project(project_id)
    return success(data=schemas.ProjectResponse.model_validate(project))


@router.put("/{project_id}", response_model=schemas.ProjectResponse)
async def update_project(
    project_id: str,
    data: schemas.ProjectUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """更新项目"""
    project_service = service.ProjectService(session)
    project = await project_service.update_project(project_id, data)
    return success(data=schemas.ProjectResponse.model_validate(project), message="更新成功")


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除项目"""
    project_service = service.ProjectService(session)
    await project_service.delete_project(project_id)
    return success(message="删除成功")
