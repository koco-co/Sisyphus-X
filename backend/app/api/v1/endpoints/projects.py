"""项目管理 API 端点"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.api.deps import get_current_user, require_user_id
from app.core.db import get_session
from app.core.security import get_password_hash
from app.models.env_variable import EnvVariable
from app.models.project import Project, ProjectDataSource, ProjectEnvironment
from app.models.user import User
from app.schemas.env_variable import (
    EnvVariableCreate,
    EnvVariableResponse,
    EnvVariableUpdate,
)
from app.schemas.environment import (
    DataSourceCreate,
    DataSourceResponse,
    DataSourceTestRequest,
    DataSourceTestResponse,
    DataSourceUpdate,
    EnvironmentCreate,
    EnvironmentResponse,
    EnvironmentUpdate,
)
from app.schemas.pagination import PageResponse
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter()


# ============================================
# Project CRUD
# ============================================


@router.get("", response_model=PageResponse[ProjectResponse])
@router.get("/", response_model=PageResponse[ProjectResponse])
async def list_projects(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(10, ge=1, le=100, description="每页条数"),
    search: str | None = Query(None, description="项目名称搜索关键词"),
    session: AsyncSession = Depends(get_session),
) -> PageResponse[ProjectResponse]:
    """获取项目列表(支持搜索和分页)"""
    # 构建基础查询
    query = select(Project)

    # 搜索过滤
    if search:
        query = query.where(col(Project.name).contains(search))

    # 获取总数
    count_statement = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_statement)
    total = int(total_result.scalar_one() or 0)

    # 分页查询
    skip = (page - 1) * size
    statement = query.order_by(col(Project.updated_at).desc()).offset(skip).limit(size)
    result = await session.execute(statement)
    projects = result.scalars().all()

    # 计算总页数
    pages = (total + size - 1) // size if total > 0 else 1

    return PageResponse(
        items=list(projects),
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    """创建新项目

    Args:
        project_in: 项目创建请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        创建的项目信息

    Raises:
        HTTPException 409: 项目名称已存在
    """
    user_id = require_user_id(current_user)

    # 检查项目名称是否重复
    existing_statement = select(Project).where(
        col(Project.created_by) == user_id, col(Project.name) == project_in.name
    )
    existing_result = await session.execute(existing_statement)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该项目名称已存在",
        )

    # 创建新项目
    # 自动生成项目唯一标识 key (使用 UUID 去掉连字符)
    project_key = f"PROJ-{uuid.uuid4().hex[:8].upper()}"
    project = Project(
        id=str(uuid.uuid4()),
        name=project_in.name,
        key=project_key,
        description=project_in.description,
        created_by=user_id,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)

    return ProjectResponse.model_validate(project)


@router.get("/{project_id}", response_model=ProjectResponse)
@router.get("/{project_id}/", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    """获取项目详情

    Args:
        project_id: 项目 ID (UUID)
        session: 数据库会话

    Returns:
        项目详细信息

    Raises:
        HTTPException 404: 项目不存在
    """
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    return ProjectResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectResponse)
@router.put("/{project_id}/", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    """更新项目信息

    Args:
        project_id: 项目 ID (UUID)
        project_in: 项目更新请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        更新后的项目信息

    Raises:
        HTTPException 404: 项目不存在
        HTTPException 409: 项目名称已存在
    """
    user_id = require_user_id(current_user)

    # 获取项目
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    # 检查名称是否重复(如果修改了名称)
    if project_in.name and project_in.name != project.name:
        existing_statement = select(Project).where(
            col(Project.created_by) == user_id,
            col(Project.name) == project_in.name,
            col(Project.id) != project_id,
        )
        existing_result = await session.execute(existing_statement)
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="该项目名称已存在",
            )

    # 更新字段
    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    project.updated_at = datetime.utcnow()
    session.add(project)
    await session.commit()
    await session.refresh(project)

    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/{project_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """删除项目

    Args:
        project_id: 项目 ID (UUID)
        session: 数据库会话

    Raises:
        HTTPException 404: 项目不存在
        HTTPException 403: 项目下存在关联数据

    注意:
        - 如果项目下存在场景、接口等关联数据,将返回 403 错误
        - 删除操作是级联的,会删除所有关联数据
    """
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    # TODO: 检查项目下是否存在关联数据
    # 如果存在,返回 403 错误
    # from app.models.interface import Interface
    # from app.models.scenario import Scenario
    # interface_exists = await session.execute(
    #     select(Interface).where(col(Interface.project_id) == project_id).limit(1)
    # )
    # if interface_exists.scalar_one_or_none():
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="项目下存在关联数据,无法删除",
    #     )

    await session.delete(project)
    await session.commit()




# ============================================
# DataSource CRUD
# ============================================
@router.get("/{project_id}/datasources", response_model=list[DataSourceResponse])
@router.get("/{project_id}/datasources/", response_model=list[DataSourceResponse])
async def list_datasources(project_id: str, session: AsyncSession = Depends(get_session)):
    """获取项目的所有数据源"""
    statement = select(ProjectDataSource).where(ProjectDataSource.project_id == project_id)
    result = await session.execute(statement)
    return result.scalars().all()


@router.post("/{project_id}/datasources", response_model=DataSourceResponse)
@router.post("/{project_id}/datasources/", response_model=DataSourceResponse)
async def create_datasource(
    project_id: str, ds: DataSourceCreate, session: AsyncSession = Depends(get_session)
):
    """创建新数据源"""
    from datetime import datetime

    from app.core.network import test_mysql_connection

    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 加密密码
    password_hash = get_password_hash(ds.password) if ds.password else ""

    # 尝试测试连接以确定初始状态
    status = "unchecked"
    error_msg = None
    last_test_at = datetime.utcnow()

    if ds.username and ds.password:
        success, message = await test_mysql_connection(
            host=ds.host,
            port=ds.port,
            username=ds.username,
            password=ds.password,
            database=ds.db_name if ds.db_name else None,
        )
        status = "connected" if success else "error"
        error_msg = None if success else message

    db_ds = ProjectDataSource(
        project_id=project_id,
        name=ds.name,
        db_type=ds.db_type,
        host=ds.host,
        port=ds.port,
        db_name=ds.db_name,
        username=ds.username,
        password_hash=password_hash,
        variable_name=ds.variable_name,
        is_enabled=ds.is_enabled,
        status=status,
        last_test_at=last_test_at,
        error_msg=error_msg,
    )
    session.add(db_ds)
    await session.commit()
    await session.refresh(db_ds)
    return db_ds


@router.put("/{project_id}/datasources/{ds_id}", response_model=DataSourceResponse)
@router.put("/{project_id}/datasources/{ds_id}/", response_model=DataSourceResponse)
async def update_datasource(
    project_id: str,
    ds_id: str,
    ds_update: DataSourceUpdate,
    session: AsyncSession = Depends(get_session),
):
    """更新数据源"""

    ds = await session.get(ProjectDataSource, ds_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(status_code=404, detail="DataSource not found")

    update_data = ds_update.model_dump(exclude_unset=True)
    has_new_password = ds_update.password is not None

    # 特殊处理密码字段
    password_updated = False
    if "password" in update_data:
        password = update_data.pop("password")
        if password:
            ds.password_hash = get_password_hash(password)
            password_updated = True

    # 检查是否需要重新测试连接（配置发生变化）
    should_retest = (
        any(key in update_data for key in ["host", "port", "username", "db_name"])
        or password_updated
    )

    for key, value in update_data.items():
        setattr(ds, key, value)
    ds.updated_at = datetime.utcnow()

    # 如果连接配置发生变化，重新测试连接
    if should_retest and ds.username and ds.password_hash:
        # 注意：这里需要使用原始密码，但update时密码已经被加密了
        # 所以我们只在password字段有值时才测试
        if has_new_password or any(
            key in update_data for key in ["host", "port", "username", "db_name"]
        ):
            # 如果没有提供新密码，使用现有密码哈希（但无法解密，所以无法测试）
            # 这里简化处理：只在提供了新密码或相关配置变更时标记为unchecked
            ds.status = "unchecked"
            ds.error_msg = None
            ds.last_test_at = datetime.utcnow()

    session.add(ds)
    await session.commit()
    await session.refresh(ds)
    return ds


@router.patch("/{project_id}/datasources/{ds_id}", response_model=DataSourceResponse)
@router.patch("/{project_id}/datasources/{ds_id}/", response_model=DataSourceResponse)
async def patch_datasource(
    project_id: str,
    ds_id: str,
    ds_patch: DataSourceUpdate,
    session: AsyncSession = Depends(get_session),
):
    """部分更新数据源（用于启用/禁用等操作）"""
    ds = await session.get(ProjectDataSource, ds_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(status_code=404, detail="DataSource not found")

    update_data = ds_patch.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ds, key, value)
    ds.updated_at = datetime.utcnow()

    session.add(ds)
    await session.commit()
    await session.refresh(ds)
    return ds


@router.delete("/{project_id}/datasources/{ds_id}")
@router.delete("/{project_id}/datasources/{ds_id}/")
async def delete_datasource(
    project_id: str, ds_id: str, session: AsyncSession = Depends(get_session)
):
    """删除数据源"""
    ds = await session.get(ProjectDataSource, ds_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(status_code=404, detail="DataSource not found")

    await session.delete(ds)
    await session.commit()
    return {"message": "DataSource deleted"}


@router.post("/datasources/test", response_model=DataSourceTestResponse)
async def test_datasource_connection(test_req: DataSourceTestRequest):
    """测试数据源连接 (不保存)"""
    from app.core.network import test_mysql_connection, test_tcp_connection

    # 验证必填字段
    if not test_req.host or not test_req.port:
        return DataSourceTestResponse(success=False, message="主机地址和端口不能为空")

    # 如果没有提供用户名或密码，只测试 TCP 连接
    if not test_req.username or not test_req.password:
        success, message = test_tcp_connection(test_req.host, test_req.port)
        if success:
            return DataSourceTestResponse(
                success=True,
                message=f"TCP 连接成功 ({test_req.host}:{test_req.port})，但未提供数据库账号，无法验证数据库连接",
            )
        else:
            return DataSourceTestResponse(success=False, message=f"TCP 连接失败: {message}")

    # 测试 MySQL 数据库连接
    success, message = await test_mysql_connection(
        host=test_req.host,
        port=test_req.port,
        username=test_req.username,
        password=test_req.password,
        database=test_req.db_name,
    )

    return DataSourceTestResponse(success=success, message=message)


# ============================================
# Environment Variable CRUD
# ============================================
@router.get("/{project_id}/environments/{env_id}/variables", response_model=list[EnvVariableResponse])
@router.get("/{project_id}/environments/{env_id}/variables/", response_model=list[EnvVariableResponse])
async def list_env_variables(
    project_id: str, env_id: str, session: AsyncSession = Depends(get_session)
):
    """获取环境的所有变量"""
    # 验证环境是否存在
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")

    statement = select(EnvVariable).where(EnvVariable.environment_id == env_id)
    result = await session.execute(statement)
    return result.scalars().all()


@router.post("/{project_id}/environments/{env_id}/variables", response_model=EnvVariableResponse)
@router.post("/{project_id}/environments/{env_id}/variables/", response_model=EnvVariableResponse)
async def create_env_variable(
    project_id: str,
    env_id: str,
    data: EnvVariableCreate,
    session: AsyncSession = Depends(get_session),
):
    """创建环境变量"""
    # 验证环境是否存在
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")

    # 检查变量名是否已存在
    existing = await session.execute(
        select(EnvVariable).where(
            EnvVariable.environment_id == env_id,
            EnvVariable.name == data.name,
            EnvVariable.is_global == data.is_global
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Variable name already exists")

    var = EnvVariable(
        id=str(uuid.uuid4()),
        environment_id=env_id,
        name=data.name,
        value=data.value,
        description=data.description,
        is_global=data.is_global,
    )
    session.add(var)
    await session.commit()
    await session.refresh(var)
    return var


@router.get("/{project_id}/environments/{env_id}/variables/{var_id}", response_model=EnvVariableResponse)
@router.get("/{project_id}/environments/{env_id}/variables/{var_id}/", response_model=EnvVariableResponse)
async def get_env_variable(
    project_id: str, env_id: str, var_id: str, session: AsyncSession = Depends(get_session)
):
    """获取单个环境变量"""
    var = await session.get(EnvVariable, var_id)
    if not var or var.environment_id != env_id:
        raise HTTPException(status_code=404, detail="Variable not found")

    # 验证环境是否存在
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")

    return var


@router.put("/{project_id}/environments/{env_id}/variables/{var_id}", response_model=EnvVariableResponse)
@router.put("/{project_id}/environments/{env_id}/variables/{var_id}/", response_model=EnvVariableResponse)
async def update_env_variable(
    project_id: str,
    env_id: str,
    var_id: str,
    data: EnvVariableUpdate,
    session: AsyncSession = Depends(get_session),
):
    """更新环境变量"""
    var = await session.get(EnvVariable, var_id)
    if not var or var.environment_id != env_id:
        raise HTTPException(status_code=404, detail="Variable not found")

    # 验证环境是否存在
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")

    # 如果更新name，检查是否冲突
    if data.name and data.name != var.name:
        existing = await session.execute(
            select(EnvVariable).where(
                EnvVariable.environment_id == env_id,
                EnvVariable.name == data.name,
                EnvVariable.is_global == (data.is_global if data.is_global is not None else var.is_global)
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Variable name already exists")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(var, key, value)
    var.updated_at = datetime.utcnow()

    session.add(var)
    await session.commit()
    await session.refresh(var)
    return var


@router.delete("/{project_id}/environments/{env_id}/variables/{var_id}")
@router.delete("/{project_id}/environments/{env_id}/variables/{var_id}/")
async def delete_env_variable(
    project_id: str, env_id: str, var_id: str, session: AsyncSession = Depends(get_session)
):
    """删除环境变量"""
    var = await session.get(EnvVariable, var_id)
    if not var or var.environment_id != env_id:
        raise HTTPException(status_code=404, detail="Variable not found")

    # 验证环境是否存在
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")

    await session.delete(var)
    await session.commit()
    return {"message": "Variable deleted"}
