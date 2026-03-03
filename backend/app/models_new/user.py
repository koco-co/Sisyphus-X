"""用户模型 - SQLAlchemy 2.0 ORM

按照 Phase 1 重构计划定义的用户表结构
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base
from app.utils.datetime import utcnow


class User(Base):
    """用户表 - 存储用户认证信息

    支持邮箱密码登录和 OAuth(GitHub/Google)登录
    """

    __tablename__ = "users"

    # 主键 - UUID
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # 基本信息
    email: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    username: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    password_hash: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )  # NULL 表示 OAuth 用户

    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: utcnow(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: utcnow(), onupdate=lambda: utcnow(), nullable=False
    )

    # 关系
    projects = relationship("Project", back_populates="created_by_user")
    executions = relationship("Execution", back_populates="created_by_user")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, is_active={self.is_active})>"
