"""
需求模型 - SQLAlchemy 2.0 ORM
功能测试模块 - 管理产品需求文档和AI澄清记录
"""
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from typing import Optional, List, Dict, Any


class Requirement(Base):
    """需求表"""

    __tablename__ = "requirements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    requirement_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)  # REQ-2025-001
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    module_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # 禅道模块ID
    module_name: Mapped[str] = mapped_column(String(255), nullable=False)
    iteration: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    priority: Mapped[str] = mapped_column(String(20), nullable=False)  # high/medium/low

    # 需求内容
    description: Mapped[str] = mapped_column(Text, default="")  # Markdown格式
    attachments: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)  # MinIO存储路径数组

    # AI澄清记录
    ai_conversation_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    clarification_status: Mapped[str] = mapped_column(String(20), default="draft")  # draft/clarifying/confirmed
    risk_points: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)  # JSON数组

    # 状态
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft/review/approved/cancelled

    # 关联
    test_case_suite_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # 元数据
    created_by: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
