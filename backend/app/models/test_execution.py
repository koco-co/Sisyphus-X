"""
测试执行记录模型 - SQLAlchemy 2.0 ORM
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class TestExecution(Base):
    """测试执行记录表"""

    __tablename__ = "test_executions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    test_case_id: Mapped[int] = mapped_column(ForeignKey("testcase.id"), nullable=False, index=True)
    environment_id: Mapped[int | None] = mapped_column(
        ForeignKey("projectenvironment.id"), nullable=True, index=True
    )

    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending, running, success, failed, error
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration: Mapped[float | None] = mapped_column(nullable=True)  # 执行时长（秒）

    result_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
