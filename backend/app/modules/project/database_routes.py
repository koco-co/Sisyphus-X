"""数据库配置路由 - 模块化版本

提供项目数据库配置的 CRUD 操作和连接测试功能
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.core.response import success
from app.models.user import User
from app.modules.project import database_schemas, database_service
from app.modules.project.service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/databases", tags=["数据库配置"])


async def verify_project_access(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> str:
    """验证项目访问权限

    确保项目存在且用户有权访问

    Args:
        project_id: 项目 ID
        session: 数据库会话
        current_user: 当前用户

    Returns:
        项目 ID

    Raises:
        NotFoundError: 项目不存在时抛出
    """
    project_service = ProjectService(session)
    await project_service.get_project(project_id)
    return project_id


@router.get("", response_model=list[database_schemas.DatabaseConfigResponse])
async def list_databases(
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取项目的数据库配置列表

    Args:
        project_id: 项目 ID
        session: 数据库会话
        current_user: 当前用户

    Returns:
        数据库配置列表
    """
    db_service = database_service.DatabaseConfigService(session)
    configs = await db_service.list_by_project(project_id)
    return success(
        data=[
            database_schemas.DatabaseConfigResponse.model_validate(c)
            for c in configs
        ]
    )


@router.post("", response_model=database_schemas.DatabaseConfigResponse)
async def create_database(
    data: database_schemas.DatabaseConfigCreate,
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """创建数据库配置

    Args:
        data: 数据库配置创建请求
        project_id: 项目 ID
        session: 数据库会话
        current_user: 当前用户

    Returns:
        创建的数据库配置
    """
    db_service = database_service.DatabaseConfigService(session)
    config = await db_service.create(project_id, data)
    return success(
        data=database_schemas.DatabaseConfigResponse.model_validate(config),
        message="创建成功"
    )


@router.get("/{db_id}", response_model=database_schemas.DatabaseConfigResponse)
async def get_database(
    db_id: str,
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取数据库配置详情

    Args:
        db_id: 数据库配置 ID
        project_id: 项目 ID
        session: 数据库会话
        current_user: 当前用户

    Returns:
        数据库配置详情
    """
    db_service = database_service.DatabaseConfigService(session)
    config = await db_service.get(db_id)
    return success(data=database_schemas.DatabaseConfigResponse.model_validate(config))


@router.put("/{db_id}", response_model=database_schemas.DatabaseConfigResponse)
async def update_database(
    db_id: str,
    data: database_schemas.DatabaseConfigUpdate,
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """更新数据库配置

    Args:
        db_id: 数据库配置 ID
        data: 数据库配置更新请求
        project_id: 项目 ID
        session: 数据库会话
        current_user: 当前用户

    Returns:
        更新后的数据库配置
    """
    db_service = database_service.DatabaseConfigService(session)
    config = await db_service.update(db_id, data)
    return success(
        data=database_schemas.DatabaseConfigResponse.model_validate(config),
        message="更新成功"
    )


@router.delete("/{db_id}")
async def delete_database(
    db_id: str,
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除数据库配置

    Args:
        db_id: 数据库配置 ID
        project_id: 项目 ID
        session: 数据库会话
        current_user: 当前用户

    Returns:
        删除结果
    """
    db_service = database_service.DatabaseConfigService(session)
    await db_service.delete(db_id)
    return success(message="删除成功")


@router.post("/{db_id}/test", response_model=database_schemas.ConnectionTestResult)
async def test_connection(
    db_id: str,
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """测试数据库连接

    Args:
        db_id: 数据库配置 ID
        project_id: 项目 ID
        session: 数据库会话
        current_user: 当前用户

    Returns:
        连接测试结果
    """
    db_service = database_service.DatabaseConfigService(session)
    result = await db_service.test_connection(db_id)
    return success(data=result)


@router.post("/{db_id}/toggle", response_model=database_schemas.DatabaseConfigResponse)
async def toggle_database(
    db_id: str,
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """切换数据库配置启用状态

    Args:
        db_id: 数据库配置 ID
        project_id: 项目 ID
        session: 数据库会话
        current_user: 当前用户

    Returns:
        更新后的数据库配置
    """
    db_service = database_service.DatabaseConfigService(session)
    config = await db_service.toggle_enabled(db_id)
    return success(
        data=database_schemas.DatabaseConfigResponse.model_validate(config)
    )
