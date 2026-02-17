"""环境变量模型 - SQLAlchemy 2.0 ORM

存储环境变量和全局变量
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, Boolean, ForeignKey, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from typing import Optional, Dict, Any, List


class EnvVariable(Base):
    """环境变量表 - 存储环境变量和全局变量

    设计要点:
    - UUID 主键 (分布式友好)
    - 外键关联到 project_environments 表 (environment_id)
    - UNIQUE(environment_id, name, is_global) 约束
    - 支持全局变量 (is_global)
    """

    __tablename__ = "env_variables"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID 主键
    environment_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("project_environments.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )  # 所属环境

    # 变量信息
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # 变量名
    value: Mapped[str] = mapped_column(Text, nullable=False)  # 变量值
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 描述

    # 全局变量标记
    is_global: Mapped[bool] = mapped_column(Boolean, default=False, index=True)  # 是否全局变量

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index(
            "idx_env_variables_env_name_global",
            "environment_id",
            "name",
            "is_global",
            unique=True,
        ),
    )
