"""
用户和权限管理相关的 Pydantic schemas
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

# ============================================================================
# 用户相关 Schemas
# ============================================================================


class UserBase(BaseModel):
    """用户基础 Schema"""

    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str | None = Field(None, max_length=100)
    is_active: bool = True


class UserCreate(UserBase):
    """创建用户"""

    password: str = Field(..., min_length=6, max_length=100)
    role_ids: list[int] | None = Field(default=[], description="分配的角色ID列表")


class UserUpdate(BaseModel):
    """更新用户"""

    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = Field(None, min_length=6, max_length=100)
    is_active: bool | None = None
    role_ids: list[int] | None = None


class UserResponse(UserBase):
    """用户响应"""

    id: int
    created_at: datetime
    updated_at: datetime | None = None
    roles: list["RoleResponse"] = []

    class Config:
        from_attributes = True


# ============================================================================
# 角色相关 Schemas
# ============================================================================


class RoleBase(BaseModel):
    """角色基础 Schema"""

    name: str = Field(..., min_length=2, max_length=50)
    description: str | None = Field(None, max_length=200)


class RoleCreate(RoleBase):
    """创建角色"""

    permission_ids: list[int] = Field(..., description="分配的权限ID列表")


class RoleUpdate(BaseModel):
    """更新角色"""

    name: str | None = Field(None, min_length=2, max_length=50)
    description: str | None = None
    permission_ids: list[int] | None = None


class RoleResponse(RoleBase):
    """角色响应"""

    id: int
    is_system: bool
    created_at: datetime
    permissions: list["PermissionResponse"] = []

    class Config:
        from_attributes = True


# ============================================================================
# 权限相关 Schemas
# ============================================================================


class PermissionBase(BaseModel):
    """权限基础 Schema"""

    resource: str = Field(..., max_length=50)
    action: str = Field(..., max_length=50)
    description: str | None = Field(None, max_length=200)


class PermissionCreate(PermissionBase):
    """创建权限"""

    pass


class PermissionUpdate(BaseModel):
    """更新权限"""

    resource: str | None = None
    action: str | None = None
    description: str | None = None


class PermissionResponse(PermissionBase):
    """权限响应"""

    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# 审计日志相关 Schemas
# ============================================================================


class AuditLogResponse(BaseModel):
    """审计日志响应"""

    id: int
    user_id: int
    action: str
    resource_type: str
    resource_id: int | None
    details: str | None
    ip_address: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# 项目成员相关 Schemas
# ============================================================================


class ProjectMemberAdd(BaseModel):
    """添加项目成员"""

    user_id: int
    role: str = Field(default="member", description="角色：owner, admin, member, viewer")


class ProjectMemberUpdate(BaseModel):
    """更新项目成员角色"""

    role: str = Field(..., description="角色：owner, admin, member, viewer")


class ProjectMemberResponse(BaseModel):
    """项目成员响应"""

    user_id: int
    username: str
    full_name: str | None
    email: str
    role: str
    joined_at: datetime


# 更新前向引用
UserResponse.model_rebuild()
RoleResponse.model_rebuild()
