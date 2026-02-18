"""数据库配置模型 - SQLAlchemy 2.0 ORM

存储项目的数据库连接配置
"""
from datetime import datetime

from sqlalchemy import DateTime, Boolean, ForeignKey, Integer, String, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from typing import Optional, Dict, Any, List


class DatabaseConfig(Base):
    """数据库配置表 - 存储项目的数据库连接信息

    设计要点:
    - UUID 主键 (分布式友好)
    - 外键关联到 projects 表 (project_id)
    - UNIQUE(project_id, variable_name) 约束
    - 密码加密存储
    - 连接状态管理
    """

    __tablename__ = "database_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID 主键
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )  # 所属项目

    # 基本信息
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # 连接名称
    variable_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # 引用变量名 (用于测试场景)

    # 连接信息
    db_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 数据库类型
    host: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    initial_database: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # 初始数据库名
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    password: Mapped[str] = mapped_column(
        String(255), nullable=False
    )  # 加密存储的密码

    # 状态管理
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)  # 是否启用
    connection_status: Mapped[str] = mapped_column(
        String(50), default="unknown"
    )  # 连接状态: 'unknown', 'connected', 'failed'
    last_tested_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True
    )  # 最后测试连接时间

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.utcnow(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow(), nullable=False
    )

    __table_args__ = (
        Index(
            "idx_database_configs_project_variable",
            "project_id",
            "variable_name",
            unique=True,
        ),
    )
