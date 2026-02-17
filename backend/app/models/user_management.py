"""
用户和权限管理模型
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Column, ForeignKey, Integer, Table, Text
from sqlmodel import Field, SQLModel
from typing import Optional, Dict, Any, List

# 角色-权限关联表
role_permission_table = Table(
    "role_permissions",
    SQLModel.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE")),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE")),
)


class Permission(SQLModel, table=True):
    """权限模型"""

    __tablename__ = "permissions"  # pyright: ignore[reportAssignmentType]

    id: Optional[int] = Field(default=None, primary_key=True)
    resource: str = Field(max_length=50, description="资源名称，如 projects, testcases")
    action: str = Field(max_length=50, description="操作，如 create, read, update, delete, execute")
    description: Optional[str] = Field(default=None, max_length=200)
    created_at: datetime = Field(default_factory=datetime.now(timezone.utc))

    # 关系 - 使用 TYPE_CHECKING 避免循环导入
    # roles: list["Role"] = Relationship(
    #     back_populates="permission_list",
    #     sa_relationship_kwargs={"secondary": role_permission_table},
    # )


class AuditLog(SQLModel, table=True):
    """审计日志模型"""

    __tablename__ = "audit_logs"  # pyright: ignore[reportAssignmentType]

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    action: str = Field(max_length=50, description="操作类型，如 create, update, delete")
    resource_type: str = Field(max_length=50, description="资源类型")
    resource_id: Optional[int] = Field(default=None, description="资源ID")
    details: Optional[str] = Field(default=None, sa_column=Column(Text))
    ip_address: Optional[str] = Field(default=None, max_length=50)
    user_agent: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.now(timezone.utc))

    # 关系 - 使用 TYPE_CHECKING 避免循环导入
    # user: "User" = Relationship(back_populates="audit_logs")


# 导入 User 类，但放在文件末尾避免循环导入
# 注意: 这个 User 是 user_management.py 中定义的版本，与 user.User 不同
# 为了避免冲突，重命名为 UserModel
# from app.models.user import User as UserModel  # noqa: E402
