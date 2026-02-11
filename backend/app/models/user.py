# 用户模型
from datetime import datetime

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """用户表 - 存储用户认证和基本信息"""

    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, max_length=50)
    email: str = Field(index=True, unique=True, max_length=100)
    password_hash: str | None = Field(default=None, max_length=255)  # OAuth 用户无密码
    avatar: str | None = Field(default=None, max_length=500)
    is_active: bool = Field(default=True)
    # OAuth 字段
    oauth_provider: str | None = Field(default=None, max_length=20)  # github/google
    oauth_id: str | None = Field(default=None, max_length=100)  # 第三方用户 ID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # 关系 - 注意: AuditLog 在 user_management.py 中定义，避免循环导入
    # audit_logs: list["AuditLog"] = Relationship(back_populates="user")
