"""全局参数模型 - SQLAlchemy 2.0 ORM

按照 docs/数据库设计.md §3.17 定义
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class GlobalParam(Base):
    """全局参数表 - 存储全局工具函数

    设计要点:
    - UUID 主键
    - 外键关联到 users (级联删除)
    - 唯一约束: (class_name, method_name)
    - JSONB 存储参数和返回值说明
    - 支持代码存储
    """

    __tablename__ = "global_params"

    # 表级索引和约束
    __table_args__ = (
        Index("idx_global_params_class_name", "class_name"),
        Index("idx_global_params_created_by", "created_by"),
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

    # JSONB 字段（JSON 存储，SQLite 兼容）
    parameters: Mapped[dict | None] = mapped_column(Text, nullable=True)  # 入参释义
    return_value: Mapped[dict | None] = mapped_column(Text, nullable=True)  # 出参释义

    # 外键
    created_by: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<GlobalParam(id={self.id}, class_name={self.class_name}, method_name={self.method_name})>"
