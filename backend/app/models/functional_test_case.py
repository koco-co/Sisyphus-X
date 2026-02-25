"""
测试用例模型 - 功能测试模块 (SQLAlchemy 2.0)
"""

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class FunctionalTestCase(Base):
    """测试用例表 (功能测试模块)"""

    __tablename__ = "test_cases"

    __table_args__ = (
        Index("idx_functional_tc_req_module", "requirement_id", "module_name", "page_name"),
    )

    id: Mapped[int | None] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    requirement_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    test_suite_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    test_point_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    module_name: Mapped[str] = mapped_column(String(100), nullable=False)
    page_name: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False)
    case_type: Mapped[str] = mapped_column(String(50), nullable=False)
    preconditions: Mapped[list] = mapped_column(JSON, default=list)
    steps: Mapped[list] = mapped_column(JSON, default=list)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    is_automated: Mapped[bool] = mapped_column(Boolean, default=False)
    complexity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    estimated_time: Mapped[int] = mapped_column(Integer, default=0)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    created_by: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
