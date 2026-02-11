"""
用户和权限管理 API 端点
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api import deps
from app.core.db import get_session
from app.models.user import User
from app.models.user_management import (
    AuditLog,
    Permission,
    Role,
)
from app.models.user_management import User as UserModel
from app.schemas.user_management import (
    AuditLogResponse,
    PermissionCreate,
    PermissionResponse,
    RoleCreate,
    RoleResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)

router = APIRouter(tags=["用户和权限管理"])


# ============================================================================
# 用户管理
# ============================================================================


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_superuser),
):
    """获取用户列表（需要超级用户权限）"""
    skip = (page - 1) * size
    statement = select(UserModel).order_by(UserModel.created_at.desc()).offset(skip).limit(size)
    result = await session.execute(statement)
    users = result.scalars().all()
    return users


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_superuser),
):
    """创建用户（需要超级用户权限）"""
    # 检查用户名和邮箱是否已存在
    existing = await session.execute(
        select(UserModel).where(
            (UserModel.username == user_data.username) | (UserModel.email == user_data.email)
        )
    )
    if existing.first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="用户名或邮箱已存在")

    # 创建用户
    from app.core.security import get_password_hash

    user = UserModel(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        is_active=user_data.is_active,
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    # 分配角色
    if user_data.role_ids:
        for role_id in user_data.role_ids:
            role = await session.get(Role, role_id)
            if role:
                user.roles.append(role)

    await session.commit()
    await session.refresh(user)

    return user


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
):
    """获取用户详情"""
    user = await session.get(UserModel, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_superuser),
):
    """更新用户（需要超级用户权限）"""
    user = await session.get(UserModel, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    # 更新字段
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "password" and value:
            from app.core.security import get_password_hash

            user.hashed_password = get_password_hash(value)
        elif field == "role_ids":
            # 更新角色
            user.roles.clear()
            for role_id in value:
                role = await session.get(Role, role_id)
                if role:
                    user.roles.append(role)
        else:
            setattr(user, field, value)

    await session.commit()
    await session.refresh(user)
    return user


# ============================================================================
# 角色管理
# ============================================================================


@router.get("/roles", response_model=list[RoleResponse])
async def list_roles(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
):
    """获取角色列表"""
    result = await session.execute(select(Role).order_by(Role.name))
    roles = result.scalars().all()
    return roles


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_superuser),
):
    """创建角色（需要超级用户权限）"""
    # 检查角色名是否已存在
    existing = await session.execute(select(Role).where(Role.name == role_data.name))
    if existing.first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色名已存在")

    # 创建角色
    role = Role(name=role_data.name, description=role_data.description)

    session.add(role)
    await session.commit()
    await session.refresh(role)

    # 分配权限
    if role_data.permission_ids:
        for perm_id in role_data.permission_ids:
            perm = await session.get(Permission, perm_id)
            if perm:
                role.permissions.append(perm)

    await session.commit()
    await session.refresh(role)

    return role


@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
):
    """获取角色详情"""
    role = await session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="角色不存在")
    return role


# ============================================================================
# 权限管理
# ============================================================================


@router.get("/permissions", response_model=list[PermissionResponse])
async def list_permissions(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
):
    """获取权限列表"""
    result = await session.execute(
        select(Permission).order_by(Permission.resource, Permission.action)
    )
    permissions = result.scalars().all()
    return permissions


@router.post("/permissions", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
async def create_permission(
    perm_data: PermissionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_superuser),
):
    """创建权限（需要超级用户权限）"""
    permission = Permission(**perm_data.model_dump())
    session.add(permission)
    await session.commit()
    await session.refresh(permission)
    return permission


# ============================================================================
# 审计日志
# ============================================================================


@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def list_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user_id: int | None = None,
    resource_type: str | None = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_superuser),
):
    """获取审计日志（需要超级用户权限）"""
    skip = (page - 1) * size
    statement = select(AuditLog).order_by(AuditLog.created_at.desc())

    if user_id:
        statement = statement.where(AuditLog.user_id == user_id)
    if resource_type:
        statement = statement.where(AuditLog.resource_type == resource_type)

    statement = statement.offset(skip).limit(size)
    result = await session.execute(statement)
    logs = result.scalars().all()
    return logs
