"""
用户和权限管理相关的 Pydantic v2 schemas
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional

# ============================================================================
# 用户相关 Schemas
# ============================================================================


class UserBase(BaseModel):
    """用户基础 Schema"""

    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=100)
    is_active: bool = True


class UserCreate(UserBase):
    """创建用户"""

    password: str = Field(..., min_length=6, max_length=100)
    role_ids: list[int] = Field(default_factory=list, description="分配的角色ID列表")


class UserUpdate(BaseModel):
    """更新用户"""

    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)
    is_active: Optional[bool] = None
    role_ids: list[int] | None = None


class UserResponse(UserBase):
    """用户响应"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
    roles: list["RoleResponse"] = []


# ============================================================================
# 角色相关 Schemas
# ============================================================================


class RoleBase(BaseModel):
    """角色基础 Schema"""

    name: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = Field(None, max_length=200)


class RoleCreate(RoleBase):
    """创建角色"""

    permission_ids: list[int] = Field(..., description="分配的权限ID列表")


class RoleUpdate(BaseModel):
    """更新角色"""

    name: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = None
    permission_ids: list[int] | None = None


class RoleResponse(RoleBase):
    """角色响应"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    is_system: bool
    created_at: datetime
    permissions: list["PermissionResponse"] = []


# ============================================================================
# 权限相关 Schemas
# ============================================================================


class PermissionBase(BaseModel):
    """权限基础 Schema"""

    resource: str = Field(..., max_length=50)
    action: str = Field(..., max_length=50)
    description: Optional[str] = Field(None, max_length=200)


class PermissionCreate(PermissionBase):
    """创建权限"""

    pass


class PermissionUpdate(BaseModel):
    """更新权限"""

    resource: Optional[str] = None
    action: Optional[str] = None
    description: Optional[str] = None


class PermissionResponse(PermissionBase):
    """权限响应"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# ============================================================================
# 审计日志相关 Schemas
# ============================================================================


class AuditLogResponse(BaseModel):
    """审计日志响应"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    action: str
    resource_type: str
    resource_id: Optional[int]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime


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
    full_name: Optional[str]
    email: str
    role: str
    joined_at: datetime
