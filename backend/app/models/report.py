"""测试报告模型。"""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base
from app.utils.datetime import utcnow


class TestReport(Base):
    """测试报告主表。

    当前语义为一次测试计划执行的聚合报告。
    `scenario_id` 保留为兼容旧数据字段，新链路优先使用 `plan_id` 与 `execution_id`。
    """

    __tablename__ = "testreport"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    plan_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    execution_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    scenario_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("scenarios.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    total: Mapped[int] = mapped_column(Integer, default=0)
    success: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    duration: Mapped[str] = mapped_column(String(50), default="0s")
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=lambda: utcnow(), nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=lambda: utcnow(), nullable=False)


class TestReportDetail(Base):
    """测试报告详情表。

    一条详情记录表示计划级报告中的一个执行节点，通常对应一个接口步骤。
    """

    __tablename__ = "testreportdetail"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(Integer, ForeignKey("testreport.id"), nullable=False, index=True)
    scenario_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    scenario_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    node_id: Mapped[str] = mapped_column(String(100), nullable=False)
    node_name: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    request_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    response_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_msg: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    elapsed: Mapped[float] = mapped_column(default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=lambda: utcnow(), nullable=False)
