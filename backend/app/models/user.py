"""用户模型 - SQLAlchemy 2.0 ORM

按照 docs/数据库设计.md 定义的用户表结构
"""
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import DateTime, Boolean, String, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class User(Base):
    """用户表 - 存储用户认证信息

    支持邮箱密码登录和 OAuth(GitHub/Google)登录
    """

    __tablename__ = "users"

    # 表级索引和约束
    __table_args__ = (
        Index("idx_users_oauth", "oauth_provider", "oauth_id", unique=True),
    )

    # 主键 - UUID
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # 基本信息
    username: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    hashed_password: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # NULL 表示 OAuth 用户

    # 可选信息
    avatar: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    full_name: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # OAuth 字段
    oauth_provider: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # 'github' / 'google' / NULL
    oauth_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # OAuth 提供商的用户 ID

    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.utcnow(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username}, email={self.email}, is_active={self.is_active})>"


# 导入 uuid
import uuid
