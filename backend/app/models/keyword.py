"""关键字模型 - SQLAlchemy 2.0 ORM

参考文档: docs/数据库设计.md §3.4 关键字表 (keywords)

字段说明:
- id: UUID 主键
- project_id: 项目 ID (NULL 表示内置关键字)
- name: 关键字名称 (最大 100 字符)
- class_name: 类名 (最大 100 字符)
- method_name: 方法名 (最大 100 字符)
- description: 描述信息 (可选)
- code: Python 代码块
- parameters: 参数 JSON 字符串 (可选)
- return_type: 返回类型 (可选, 最大 100 字符)
- is_built_in: 是否内置关键字 (默认 False)
- is_enabled: 是否启用 (默认 True)
- created_at: 创建时间
- updated_at: 更新时间

索引:
- idx_keywords_class_method: (class_name, method_name) 唯一索引
- idx_keywords_is_built_in: is_built_in 索引
- idx_keywords_is_enabled: is_enabled 索引
"""
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import DateTime, Boolean, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class Keyword(Base):
    """关键字库表 - 存储测试关键字

    支持内置关键字 (project_id=NULL, is_built_in=True)
    和自定义关键字 (project_id 非 NULL, is_built_in=False)
    """

    __tablename__ = "keywords"

    # 主键
    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # 外键: project_id=NULL 表示内置关键字
    project_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
    )

    # 基本信息
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    class_name: Mapped[str] = mapped_column(String(100), nullable=False)
    method_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # 可选字段
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    parameters: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON 字符串
    return_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # 标记字段
    is_built_in: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.utcnow(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow(), nullable=False
    )

    # 复合唯一索引: class_name + method_name 必须唯一
    __table_args__ = (
        Index("idx_keywords_class_method", "class_name", "method_name", unique=True),
    )

    def __repr__(self) -> str:
        return (
            f"<Keyword(id={self.id}, name={self.name}, "
            f"class_name={self.class_name}, method_name={self.method_name})>"
        )
