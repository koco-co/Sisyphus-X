"""
测试点模型 - 功能测试模块
"""

from datetime import datetime

from sqlalchemy import DateTime, Float, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class TestPoint(Base):
    """测试点表"""

    __tablename__ = "test_points"

    __table_args__ = (
        Index("idx_test_points_req_cat_pri", "requirement_id", "category", "priority"),
    )

    id: Mapped[int | None] = mapped_column(Integer, primary_key=True, autoincrement=True)
    requirement_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    sub_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    priority: Mapped[str] = mapped_column(String(20), nullable=False)
    risk_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_ai_generated: Mapped[bool] = mapped_column(default=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
