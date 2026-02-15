"""用户模型 - SQLAlchemy 2.0 ORM"""
from datetime import datetime

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class User(Base):
    """用户表 - 存储用户认证和基本信息"""

    __tablename__ = "users"

    # 主键
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # 基本信息
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)  # OAuth 用户无密码
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # OAuth 字段
    oauth_provider: Mapped[str | None] = mapped_column(String(20), nullable=True)  # github/google
    oauth_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 第三方用户 ID

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # 关系 - 注意: AuditLog 在 user_management.py 中定义，避免循环导入
    # audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")
