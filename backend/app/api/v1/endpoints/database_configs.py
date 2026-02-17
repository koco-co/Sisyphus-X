"""数据库配置 API 端点

参考文档: docs/接口定义.md §3.6-3.10 数据库配置管理
"""

import uuid
from datetime import datetime, timezone

import pymysql
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.api.deps import get_current_user
from app.core.crypto import decrypt_password, encrypt_password
from app.core.db import get_session
from app.models.database_config import DatabaseConfig
from app.models.project import Project
from app.models.user import User
from app.schemas.database_config import (
    DatabaseConfigCreate,
    DatabaseConfigResponse,
    DatabaseConfigTestResult,
    DatabaseConfigUpdate,
)
from app.schemas.pagination import PageResponse

router = APIRouter()


async def test_database_connection(
    db_type: str, host: str, port: int, username: str, password: str, database: str | None = None
) -> tuple[bool, str, int | None]:
    """测试数据库连接

    Args:
        db_type: 数据库类型 (MySQL/PostgreSQL)
        host: 主机地址
        port: 端口号
        username: 用户名
        password: 密码
        database: 数据库名（可选）

    Returns:
        (成功标志, 消息, 延迟毫秒数)
    """
    import time

    start_time = time.time()

    try:
        if db_type.lower() == "mysql":
            # 测试 MySQL 连接
            connection = pymysql.connect(
                host=host,
                port=port,
                user=username,
                password=password,
                database=database,
                connect_timeout=5,
            )
            connection.close()
            latency = int((time.time() - start_time) * 1000)
            return True, "连接成功", latency

        elif db_type.lower() == "postgresql":
            # 测试 PostgreSQL 连接
            import psycopg2

            connection = psycopg2.connect(
                host=host,
                port=port,
                user=username,
                password=password,
                database=database,
                connect_timeout=5,
            )
            connection.close()
            latency = int((time.time() - start_time) * 1000)
            return True, "连接成功", latency

        else:
            return False, f"不支持的数据库类型: {db_type}", None

    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        return False, f"连接失败: {str(e)}", latency


@router.get("/{project_id}/databases", response_model=PageResponse[DatabaseConfigResponse])
async def list_database_configs(
    project_id: str,
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(10, ge=1, le=100, description="每页条数"),
    is_enabled: bool | None = Query(None, description="启用状态筛选"),
    session: AsyncSession = Depends(get_session),
) -> PageResponse[DatabaseConfigResponse]:
    """获取项目的数据库配置列表（分页）

    Args:
        project_id: 项目 ID
        page: 页码
        size: 每页条数
        is_enabled: 启用状态筛选
        session: 数据库会话

    Returns:
        数据库配置列表
    """
    # 验证项目存在
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")

    # 构建查询
    query = select(DatabaseConfig).where(col(DatabaseConfig.project_id) == project_id)

    if is_enabled is not None:
        query = query.where(col(DatabaseConfig.is_enabled) == is_enabled)

    # 获取总数
    count_statement = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_statement)
    total = int(total_result.scalar_one() or 0)

    # 分页查询
    skip = (page - 1) * size
    statement = query.order_by(col(DatabaseConfig.created_at).desc()).offset(skip).limit(size)
    result = await session.execute(statement)
    configs = result.scalars().all()

    # 计算总页数
    pages = (total + size - 1) // size if total > 0 else 1

    # 转换为响应模型（密码脱敏）
    items = []
    for config in configs:
        config_dict = {
            "id": config.id,
            "project_id": config.project_id,
            "name": config.name,
            "variable_name": config.variable_name,
            "db_type": config.db_type,
            "host": config.host,
            "port": config.port,
            "initial_database": config.initial_database,
            "username": config.username,
            "password": "******",  # 脱敏
            "is_enabled": config.is_enabled,
            "connection_status": config.connection_status,
            "last_tested_at": config.last_tested_at.isoformat() if config.last_tested_at else None,
            "created_at": config.created_at.isoformat(),
            "updated_at": config.updated_at.isoformat(),
        }
        items.append(DatabaseConfigResponse(**config_dict))

    return PageResponse(items=items, total=total, page=page, size=size, pages=pages)


@router.post(
    "/{project_id}/databases",
    response_model=DatabaseConfigResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_database_config(
    project_id: str,
    config_in: DatabaseConfigCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> DatabaseConfigResponse:
    """创建数据库配置

    Args:
        project_id: 项目 ID
        config_in: 数据库配置创建请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        创建的数据库配置

    Raises:
        HTTPException 404: 项目不存在
        HTTPException 409: 变量名已存在
    """
    # 验证项目存在
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")

    # 检查变量名唯一性
    if config_in.variable_name:
        existing_statement = select(DatabaseConfig).where(
            col(DatabaseConfig.project_id) == project_id,
            col(DatabaseConfig.variable_name) == config_in.variable_name,
        )
        existing_result = await session.execute(existing_statement)
        if existing_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="变量名已存在")

    # 加密密码
    encrypted_password = encrypt_password(config_in.password)

    # 创建数据库配置
    config = DatabaseConfig(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=config_in.name,
        variable_name=config_in.variable_name,
        db_type=config_in.db_type,
        host=config_in.host,
        port=config_in.port,
        initial_database=config_in.initial_database,
        username=config_in.username,
        password=encrypted_password,
        is_enabled=config_in.is_enabled,
        connection_status="unknown",
    )
    session.add(config)
    await session.commit()
    await session.refresh(config)

    # 返回响应（密码脱敏）
    config_dict = {
        "id": config.id,
        "project_id": config.project_id,
        "name": config.name,
        "variable_name": config.variable_name,
        "db_type": config.db_type,
        "host": config.host,
        "port": config.port,
        "initial_database": config.initial_database,
        "username": config.username,
        "password": "******",
        "is_enabled": config.is_enabled,
        "connection_status": config.connection_status,
        "last_tested_at": None,
        "created_at": config.created_at.isoformat(),
        "updated_at": config.updated_at.isoformat(),
    }
    return DatabaseConfigResponse(**config_dict)


@router.get("/{project_id}/databases/{db_id}", response_model=DatabaseConfigResponse)
async def get_database_config(
    project_id: str,
    db_id: str,
    session: AsyncSession = Depends(get_session),
) -> DatabaseConfigResponse:
    """获取数据库配置详情

    Args:
        project_id: 项目 ID
        db_id: 数据库配置 ID
        session: 数据库会话

    Returns:
        数据库配置详情

    Raises:
        HTTPException 404: 配置不存在
    """
    config = await session.get(DatabaseConfig, db_id)
    if not config or config.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据库配置不存在")

    # 返回响应（密码脱敏）
    config_dict = {
        "id": config.id,
        "project_id": config.project_id,
        "name": config.name,
        "variable_name": config.variable_name,
        "db_type": config.db_type,
        "host": config.host,
        "port": config.port,
        "initial_database": config.initial_database,
        "username": config.username,
        "password": "******",
        "is_enabled": config.is_enabled,
        "connection_status": config.connection_status,
        "last_tested_at": config.last_tested_at.isoformat() if config.last_tested_at else None,
        "created_at": config.created_at.isoformat(),
        "updated_at": config.updated_at.isoformat(),
    }
    return DatabaseConfigResponse(**config_dict)


@router.put("/{project_id}/databases/{db_id}", response_model=DatabaseConfigResponse)
async def update_database_config(
    project_id: str,
    db_id: str,
    config_in: DatabaseConfigUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> DatabaseConfigResponse:
    """更新数据库配置

    Args:
        project_id: 项目 ID
        db_id: 数据库配置 ID
        config_in: 数据库配置更新请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        更新后的数据库配置

    Raises:
        HTTPException 404: 配置不存在
        HTTPException 409: 变量名已存在
    """
    config = await session.get(DatabaseConfig, db_id)
    if not config or config.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据库配置不存在")

    # 检查变量名唯一性
    if config_in.variable_name and config_in.variable_name != config.variable_name:
        existing_statement = select(DatabaseConfig).where(
            col(DatabaseConfig.project_id) == project_id,
            col(DatabaseConfig.variable_name) == config_in.variable_name,
            col(DatabaseConfig.id) != db_id,
        )
        existing_result = await session.execute(existing_statement)
        if existing_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="变量名已存在")

    # 更新字段
    update_data = config_in.model_dump(exclude_unset=True)

    # 如果更新密码，需要加密
    if "password" in update_data:
        update_data["password"] = encrypt_password(update_data["password"])

    for field, value in update_data.items():
        setattr(config, field, value)

    config.updated_at = datetime.now(timezone.utc)
    session.add(config)
    await session.commit()
    await session.refresh(config)

    # 返回响应（密码脱敏）
    config_dict = {
        "id": config.id,
        "project_id": config.project_id,
        "name": config.name,
        "variable_name": config.variable_name,
        "db_type": config.db_type,
        "host": config.host,
        "port": config.port,
        "initial_database": config.initial_database,
        "username": config.username,
        "password": "******",
        "is_enabled": config.is_enabled,
        "connection_status": config.connection_status,
        "last_tested_at": config.last_tested_at.isoformat() if config.last_tested_at else None,
        "created_at": config.created_at.isoformat(),
        "updated_at": config.updated_at.isoformat(),
    }
    return DatabaseConfigResponse(**config_dict)


@router.delete("/{project_id}/databases/{db_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_database_config(
    project_id: str,
    db_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """删除数据库配置

    Args:
        project_id: 项目 ID
        db_id: 数据库配置 ID
        current_user: 当前登录用户
        session: 数据库会话

    Raises:
        HTTPException 404: 配置不存在
    """
    config = await session.get(DatabaseConfig, db_id)
    if not config or config.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据库配置不存在")

    await session.delete(config)
    await session.commit()


@router.post("/{project_id}/databases/{db_id}/test", response_model=DatabaseConfigTestResult)
async def test_database_connection_endpoint(
    project_id: str,
    db_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> DatabaseConfigTestResult:
    """测试数据库连接

    Args:
        project_id: 项目 ID
        db_id: 数据库配置 ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        测试结果

    Raises:
        HTTPException 404: 配置不存在
    """
    config = await session.get(DatabaseConfig, db_id)
    if not config or config.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据库配置不存在")

    # 解密密码
    plain_password = decrypt_password(config.password)

    # 测试连接
    success, message, latency = await test_database_connection(
        db_type=config.db_type,
        host=config.host,
        port=config.port,
        username=config.username,
        password=plain_password,
        database=config.initial_database,
    )

    # 更新连接状态
    config.connection_status = "connected" if success else "failed"
    config.last_tested_at = datetime.now(timezone.utc)
    session.add(config)
    await session.commit()

    return DatabaseConfigTestResult(
        success=success, connection_status=config.connection_status, message=message
    )
