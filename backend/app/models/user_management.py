"""
用户和权限管理模型
"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from sqlmodel import SQLModel, Field, Relationship


# 角色-权限关联表
role_permission_table = Table(
    "role_permissions",
    SQLModel.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE")),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"))
)


class Permission(SQLModel, table=True):
    """权限模型"""
    __tablename__ = "permissions"

    id: Optional[int] = Field(default=None, primary_key=True)
    resource: str = Field(max_length=50, description="资源名称，如 projects, testcases")
    action: str = Field(max_length=50, description="操作，如 create, read, update, delete, execute")
    description: Optional[str] = Field(default=None, max_length=200)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # 关系
    roles: List["Role"] = Relationship(
        back_populates="permission_list",
        sa_relationship_kwargs={"secondary": role_permission_table}
    )


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
