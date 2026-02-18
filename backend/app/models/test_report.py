"""测试报告模型 - SQLAlchemy 2.0 ORM

按照 docs/数据库设计.md §3.16 定义
"""
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class TestReport(Base):
    """测试报告表 - 存储测试执行的详细报告

    设计要点:
    - UUID 主键
    - 外键关联到 test_executions 和 scenarios
    - 支持多种状态: passed/failed/skipped
    - JSONB 存储详细结果
    - 记录 Allure 报告路径
    """

    __tablename__ = "test_reports"

    # 表级索引
    __table_args__ = (
        Index("idx_test_reports_execution_id", "execution_id"),
        Index("idx_test_reports_scenario_id", "scenario_id"),
        Index("idx_test_reports_status", "status"),
        Index("idx_test_reports_created_at", "created_at"),
    )

    # 主键
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # 外键
    execution_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("test_plan_executions.id", ondelete="CASCADE"),
        nullable=False,
    )
    scenario_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
    )

    # 执行结果
    status: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # 'passed' / 'failed' / 'skipped'
    duration: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )  # 耗时（秒）

    # JSONB 字段
    result: Mapped[Optional[dict]] = mapped_column(
        Text, nullable=True
    )  # 详细结果（JSON 存储，SQLite 兼容）

    # Allure 报告
    allure_report_path: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.utcnow(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<TestReport(id={self.id}, status={self.status}, scenario_id={self.scenario_id})>"
