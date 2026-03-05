"""全局参数模型 - SQLAlchemy 2.0 ORM

按照 docs/数据库设计.md §3.17 定义

Phase 1 重构: 使用 input_params/output_params (JSONB) 代替 parameters/return_value
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base
from app.utils.datetime import utcnow


class GlobalParam(Base):
    """全局参数表 - 存储全局工具函数

    设计要点:
    - UUID 主键
    - 唯一约束: (class_name, method_name)
    - JSONB 存储参数和返回值说明
    - 支持代码存储
    """

    __tablename__ = "global_params"

    # 表级索引和约束
    __table_args__ = (
        Index("idx_global_params_class_name", "class_name"),
        UniqueConstraint("class_name", "method_name", name="uq_global_params_class_method"),
    )

    # 主键
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # 类和方法标识（唯一约束）
    class_name: Mapped[str] = mapped_column(String(255), nullable=False)
    method_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # 代码和描述
    code: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # JSON 字段 (使用 JSON 而非 JSONB 以兼容 SQLite 测试)
    input_params: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # 入参释义
    output_params: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # 出参释义

    # 时间戳（使用 naive UTC 时间, 兼容 PostgreSQL TIMESTAMP WITHOUT TIME ZONE）
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=utcnow,
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<GlobalParam(id={self.id}, class_name={self.class_name}, method_name={self.method_name})>"
