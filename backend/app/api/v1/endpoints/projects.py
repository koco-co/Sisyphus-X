from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.hash import bcrypt
from app.core.db import get_session
from app.models.project import Project, ProjectEnvironment, ProjectDataSource
from app.schemas.pagination import PageResponse
from app.schemas.environment import (
    EnvironmentCreate, EnvironmentUpdate, EnvironmentResponse,
    DataSourceCreate, DataSourceUpdate, DataSourceResponse,
    DataSourceTestRequest, DataSourceTestResponse
)

router = APIRouter()


# ============================================
# Project CRUD
# ============================================
@router.get("/", response_model=PageResponse[Project])
async def read_projects(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_session)
):
    # 计算偏移量
    skip = (page - 1) * size
    
    # 获取总数
    count_statement = select(func.count()).select_from(Project)
    total = (await session.execute(count_statement)).scalar()
    
    # 获取分页数据
    statement = select(Project).offset(skip).limit(size)
    result = await session.execute(statement)
    projects = result.scalars().all()
    
    # 计算总页数
    pages = (total + size - 1) // size
    
    return PageResponse(
        items=projects,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("/", response_model=Project)
async def create_project(
    project: Project,
    session: AsyncSession = Depends(get_session)
):
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project

@router.get("/{project_id}", response_model=Project)
async def read_project(
    project_id: int,
    session: AsyncSession = Depends(get_session)
):
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    session: AsyncSession = Depends(get_session)
):
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await session.delete(project)
    await session.commit()
    return {"message": "Project deleted"}


# ============================================
# Environment CRUD
# ============================================
@router.get("/{project_id}/environments", response_model=List[EnvironmentResponse])
async def list_environments(
    project_id: int,
    session: AsyncSession = Depends(get_session)
):
    """获取项目的所有环境配置"""
    statement = select(ProjectEnvironment).where(ProjectEnvironment.project_id == project_id)
    result = await session.execute(statement)
    return result.scalars().all()

@router.post("/{project_id}/environments", response_model=EnvironmentResponse)
async def create_environment(
    project_id: int,
    env: EnvironmentCreate,
    session: AsyncSession = Depends(get_session)
):
    """创建新环境配置"""
    # 检查项目是否存在
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_env = ProjectEnvironment(
        project_id=project_id,
        name=env.name,
        domain=env.domain,
        variables=env.variables,
        headers=env.headers
    )
    session.add(db_env)
    await session.commit()
    await session.refresh(db_env)
    return db_env

@router.get("/{project_id}/environments/{env_id}", response_model=EnvironmentResponse)
async def get_environment(
    project_id: int,
    env_id: int,
    session: AsyncSession = Depends(get_session)
):
    """获取单个环境配置"""
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")
    return env

@router.put("/{project_id}/environments/{env_id}", response_model=EnvironmentResponse)
async def update_environment(
    project_id: int,
    env_id: int,
    env_update: EnvironmentUpdate,
    session: AsyncSession = Depends(get_session)
):
    """更新环境配置"""
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    update_data = env_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(env, key, value)
    env.updated_at = datetime.utcnow()
    
    session.add(env)
    await session.commit()
    await session.refresh(env)
    return env

@router.delete("/{project_id}/environments/{env_id}")
async def delete_environment(
    project_id: int,
    env_id: int,
    session: AsyncSession = Depends(get_session)
):
    """删除环境配置"""
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    await session.delete(env)
    await session.commit()
    return {"message": "Environment deleted"}

@router.post("/{project_id}/environments/{env_id}/copy", response_model=EnvironmentResponse)
async def copy_environment(
    project_id: int,
    env_id: int,
    session: AsyncSession = Depends(get_session)
):
    """深拷贝环境配置"""
    env = await session.get(ProjectEnvironment, env_id)
    if not env or env.project_id != project_id:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    # 创建副本
    new_env = ProjectEnvironment(
        project_id=project_id,
        name=f"{env.name} (Copy)",
        domain=env.domain,
        variables=dict(env.variables),  # 深拷贝字典
        headers=dict(env.headers)
    )
    session.add(new_env)
    await session.commit()
    await session.refresh(new_env)
    return new_env


# ============================================
# DataSource CRUD
# ============================================
@router.get("/{project_id}/datasources", response_model=List[DataSourceResponse])
async def list_datasources(
    project_id: int,
    session: AsyncSession = Depends(get_session)
):
    """获取项目的所有数据源"""
    statement = select(ProjectDataSource).where(ProjectDataSource.project_id == project_id)
    result = await session.execute(statement)
    return result.scalars().all()

@router.post("/{project_id}/datasources", response_model=DataSourceResponse)
async def create_datasource(
    project_id: int,
    ds: DataSourceCreate,
    session: AsyncSession = Depends(get_session)
):
    """创建新数据源"""
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 加密密码
    password_hash = bcrypt.hash(ds.password) if ds.password else ""
    
    db_ds = ProjectDataSource(
        project_id=project_id,
        name=ds.name,
        db_type=ds.db_type,
        host=ds.host,
        port=ds.port,
        db_name=ds.db_name,
        username=ds.username,
        password_hash=password_hash
    )
    session.add(db_ds)
    await session.commit()
    await session.refresh(db_ds)
    return db_ds

@router.put("/{project_id}/datasources/{ds_id}", response_model=DataSourceResponse)
async def update_datasource(
    project_id: int,
    ds_id: int,
    ds_update: DataSourceUpdate,
    session: AsyncSession = Depends(get_session)
):
    """更新数据源"""
    ds = await session.get(ProjectDataSource, ds_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(status_code=404, detail="DataSource not found")
    
    update_data = ds_update.model_dump(exclude_unset=True)
    
    # 特殊处理密码字段
    if 'password' in update_data:
        password = update_data.pop('password')
        if password:
            ds.password_hash = bcrypt.hash(password)
    
    for key, value in update_data.items():
        setattr(ds, key, value)
    ds.updated_at = datetime.utcnow()
    
    session.add(ds)
    await session.commit()
    await session.refresh(ds)
    return ds

@router.delete("/{project_id}/datasources/{ds_id}")
async def delete_datasource(
    project_id: int,
    ds_id: int,
    session: AsyncSession = Depends(get_session)
):
    """删除数据源"""
    ds = await session.get(ProjectDataSource, ds_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(status_code=404, detail="DataSource not found")
    
    await session.delete(ds)
    await session.commit()
    return {"message": "DataSource deleted"}

@router.post("/datasources/test", response_model=DataSourceTestResponse)
async def test_datasource_connection(
    test_req: DataSourceTestRequest
):
    """测试数据源连接 (不保存)"""
    import socket
    
    try:
        # 简单的 TCP 连接测试
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)  # 5秒超时
        result = sock.connect_ex((test_req.host, test_req.port))
        sock.close()
        
        if result == 0:
            return DataSourceTestResponse(
                success=True,
                message=f"Successfully connected to {test_req.host}:{test_req.port}"
            )
        else:
            return DataSourceTestResponse(
                success=False,
                message=f"Failed to connect to {test_req.host}:{test_req.port} (error code: {result})"
            )
    except socket.timeout:
        return DataSourceTestResponse(
            success=False,
            message=f"Connection timed out to {test_req.host}:{test_req.port}"
        )
    except Exception as e:
        return DataSourceTestResponse(
            success=False,
            message=f"Connection error: {str(e)}"
        )

