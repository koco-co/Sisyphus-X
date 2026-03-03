"""全局变量路由"""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.response import success
from app.core.deps import get_current_user
from app.models.user import User
from app.modules.setting import schemas
from app.modules.setting.global_variable_service import GlobalVariableService

router = APIRouter(prefix="/projects/{project_id}/global-variables", tags=["全局变量"])


@router.get("", response_model=schemas.GlobalVariableListResponse)
async def list_global_variables(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取项目下的全局变量列表"""
    service = GlobalVariableService(session)
    variables = await service.list_by_project(project_id)
    return success(
        data=[schemas.GlobalVariableResponse.model_validate(v) for v in variables]
    )


@router.post("", response_model=schemas.GlobalVariableResponse)
async def create_global_variable(
    project_id: str,
    data: schemas.GlobalVariableCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """创建全局变量"""
    service = GlobalVariableService(session)
    variable = await service.create(project_id, data)
    return success(data=schemas.GlobalVariableResponse.model_validate(variable), message="创建成功")


@router.put("/{variable_id}", response_model=schemas.GlobalVariableResponse)
async def update_global_variable(
    project_id: str,
    variable_id: str,
    data: schemas.GlobalVariableUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """更新全局变量"""
    service = GlobalVariableService(session)
    variable = await service.update(variable_id, data)
    return success(data=schemas.GlobalVariableResponse.model_validate(variable), message="更新成功")


@router.delete("/{variable_id}")
async def delete_global_variable(
    project_id: str,
    variable_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除全局变量"""
    service = GlobalVariableService(session)
    await service.delete(variable_id)
    return success(message="删除成功")
