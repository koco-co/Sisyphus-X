"""
用户和权限管理模型
"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from sqlmodel import SQLModel, Field, Relationship

from app.core.db import Base


# 用户-角色关联表
user_role_table = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE")),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"))
)

# 角色-权限关联表
role_permission_table = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE")),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"))
)

# 项目-用户关联表（项目成员）
project_user_table = Table(
    "project_users",
    Base.metadata,
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE")),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE")),
    Column("role", String(50), default="member")  # owner, admin, member, viewer
)


class User(SQLModel, table=True):
    """用户模型"""
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, max_length=50)
    email: str = Field(index=True, unique=True, max_length=100)
    full_name: Optional[str] = Field(default=None, max_length=100)
    hashed_password: str = Field(max_length=255)
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    # 关系
    roles: List["Role"] = Relationship(back_populates="users", link_table=user_role_table)
    projects: List["Project"] = Relationship(back_populates="members", link_table=project_user_table)


class Role(SQLModel, table=True):
    """角色模型"""
    __tablename__ = "roles"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, max_length=50, description="角色名称，如 admin, tester, viewer")
    description: Optional[str] = Field(default=None, max_length=200)
    is_system: bool = Field(default=False, description="是否为系统角色（不可删除）")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # 关系
    users: List["User"] = Relationship(back_populates="roles", link_table=user_role_table)
    permissions: List["Permission"] = Relationship(back_populates="roles", link_table=role_permission_table)


class Permission(SQLModel, table=True):
    """权限模型"""
    __tablename__ = "permissions"

    id: Optional[int] = Field(default=None, primary_key=True)
    resource: str = Field(max_length=50, description="资源名称，如 projects, testcases")
    action: str = Field(max_length=50, description="操作，如 create, read, update, delete, execute")
    description: Optional[str] = Field(default=None, max_length=200)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # 关系
    roles: List["Role"] = Relationship(back_populates="permissions", link_table=role_permission_table)


class Project(SQLModel, table=True):
    """项目模型（扩展）"""
    __tablename__ = "projects"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    key: str = Field(max_length=50, unique=True)
    owner: str = Field(max_length=100)
    description: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    # 关系
    members: List["User"] = Relationship(back_populates="projects", link_table=project_user_table)


class AuditLog(SQLModel, table=True):
    """审计日志模型"""
    __tablename__ = "audit_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    action: str = Field(max_length=50, description="操作类型，如 create, update, delete")
    resource_type: str = Field(max_length=50, description="资源类型")
    resource_id: Optional[int] = Field(default=None, description="资源ID")
    details: Optional[str] = Field(default=None, sa_column=Column(Text))
    ip_address: Optional[str] = Field(default=None, max_length=50)
    user_agent: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # 关系
    user: Optional["User"] = Relationship(back_populates="audit_logs")
