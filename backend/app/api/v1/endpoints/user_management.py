"""
用户和权限管理 API 端点
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from app.api import deps
from app.core.db import get_session
from app.models.settings import Role
from app.models.user import User
from app.models.user_management import (
    AuditLog,
    Permission,
)
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


def _to_user_response(user: User) -> UserResponse:
    if user.id is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="用户数据异常")
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=None,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        roles=[],
    )


def _to_role_response(role: Role) -> RoleResponse:
    if role.id is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="角色数据异常")
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system=False,
        created_at=role.created_at,
        permissions=[],
    )


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
    statement = select(User).order_by(col(User.created_at).desc()).offset(skip).limit(size)
    result = await session.execute(statement)
    users = result.scalars().all()
    return [_to_user_response(user) for user in users]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_superuser),
):
    """创建用户（需要超级用户权限）"""
    # 检查用户名和邮箱是否已存在
    existing = await session.execute(
        select(User).where(
            (col(User.username) == user_data.username) | (col(User.email) == user_data.email)
        )
    )
    if existing.first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="用户名或邮箱已存在")

    # 创建用户
    from app.core.security import get_password_hash

    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        is_active=user_data.is_active,
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return _to_user_response(user)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
):
    """获取用户详情"""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return _to_user_response(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_superuser),
):
    """更新用户（需要超级用户权限）"""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    # 更新字段
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "password" and value:
            from app.core.security import get_password_hash

            user.password_hash = get_password_hash(value)
        elif field == "role_ids":
            # 当前 User 模型未建立角色关系，暂不在此处直接更新。
            continue
        else:
            if field == "full_name":
                # 当前 User 模型未包含 full_name 字段。
                continue
            setattr(user, field, value)

    await session.commit()
    await session.refresh(user)
    return _to_user_response(user)


# ============================================================================
# 角色管理
# ============================================================================


@router.get("/roles", response_model=list[RoleResponse])
async def list_roles(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
):
    """获取角色列表"""
    result = await session.execute(select(Role).order_by(col(Role.name)))
    roles = result.scalars().all()
    return [_to_role_response(role) for role in roles]


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
    role = Role(
        name=role_data.name,
        code=role_data.name.lower().replace(" ", "_"),
        description=role_data.description,
        permissions={"permission_ids": role_data.permission_ids},
    )

    session.add(role)
    await session.commit()
    await session.refresh(role)

    return _to_role_response(role)


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
    return _to_role_response(role)


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
    statement = select(AuditLog).order_by(col(AuditLog.created_at).desc())

    if user_id is not None:
        statement = statement.where(col(AuditLog.user_id) == user_id)
    if resource_type:
        statement = statement.where(col(AuditLog.resource_type) == resource_type)

    statement = statement.offset(skip).limit(size)
    result = await session.execute(statement)
    logs = result.scalars().all()
    return logs
