"""
测试执行记录模型 - SQLAlchemy 2.0 ORM
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from typing import Optional, Dict, Any, List


class TestExecution(Base):
    """测试执行记录表"""

    __tablename__ = "test_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID 主键
    test_case_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)  # TODO: Add foreign key after testcase table is created
    environment_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("project_environments.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending, running, success, failed, error
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration: Mapped[Optional[float]] = mapped_column(nullable=True)  # 执行时长（秒）

    result_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
