# 用户模型
from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship


class User(SQLModel, table=True):
    """用户表 - 存储用户认证和基本信息"""
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, max_length=50)
    email: str = Field(index=True, unique=True, max_length=100)
    password_hash: Optional[str] = Field(default=None, max_length=255)  # OAuth 用户无密码
    avatar: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = Field(default=True)
    # OAuth 字段
    oauth_provider: Optional[str] = Field(default=None, max_length=20)  # github/google
    oauth_id: Optional[str] = Field(default=None, max_length=100)  # 第三方用户 ID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # 关系
    audit_logs: List["AuditLog"] = Relationship(back_populates="user")
