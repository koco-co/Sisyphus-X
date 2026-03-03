"""数据库配置模型 - SQLAlchemy 2.0 ORM

按照 Phase 1 重构计划定义的数据库配置表结构
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base
from app.utils.datetime import utcnow


class DatabaseConfig(Base):
    """数据库配置表 - 存储项目数据库连接信息

    设计要点:
    - UUID 主键
    - 外键关联到 projects 表
    - 支持多种数据库类型 (MySQL / PostgreSQL)
    - 密码加密存储
    """

    __tablename__ = "database_configs"

    # 主键 - UUID
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # 外键
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # 基本信息
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # 连接名称
    reference_var: Mapped[str] = mapped_column(String(100), nullable=False)  # 引用变量

    # 数据库连接信息
    db_type: Mapped[str] = mapped_column(String(50), nullable=False)  # MySQL / PostgreSQL
    host: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    database: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)  # 加密存储

    # 状态
    connection_status: Mapped[str] = mapped_column(
        String(50), default="unknown"
    )  # unknown/connected/failed
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # 时间戳
    last_check_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: utcnow(), nullable=False
    )

    # 关系
    project = relationship("Project", back_populates="database_configs")

    def __repr__(self) -> str:
        return f"<DatabaseConfig(id={self.id}, name={self.name}, db_type={self.db_type})>"
