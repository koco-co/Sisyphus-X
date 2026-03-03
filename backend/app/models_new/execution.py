"""执行与报告模型 - SQLAlchemy 2.0 ORM

按照 Phase 1 重构计划定义的执行记录、执行步骤和报告表结构
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base
from app.utils.datetime import utcnow


class Execution(Base):
    """执行记录表 - 存储测试执行的整体记录

    设计要点:
    - UUID 主键
    - 外键关联到 test_plans, scenarios, environments, users 表
    - 支持多种执行状态 (pending/running/completed/failed/cancelled/paused)
    - 记录执行统计数据
    """

    __tablename__ = "executions"

    # 主键 - UUID
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # 外键
    plan_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("test_plans.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    scenario_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    environment_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("environments.id"),
        nullable=True,
        index=True
    )

    # 执行状态
    status: Mapped[str] = mapped_column(
        String(50), default="pending"
    )  # pending/running/completed/failed/cancelled/paused

    # Celery 任务 ID (用于异步执行)
    celery_task_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    # 统计数据
    total_scenarios: Mapped[int] = mapped_column(Integer, default=0)
    passed_scenarios: Mapped[int] = mapped_column(Integer, default=0)
    failed_scenarios: Mapped[int] = mapped_column(Integer, default=0)
    skipped_scenarios: Mapped[int] = mapped_column(Integer, default=0)

    # 时间戳
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False), nullable=True
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False), nullable=True
    )

    # 创建者
    created_by: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: utcnow(), nullable=False
    )

    # 关系
    plan = relationship("TestPlan", back_populates="executions")
    environment = relationship("Environment", back_populates="executions")
    created_by_user = relationship("User", back_populates="executions")
    steps = relationship(
        "ExecutionStep", back_populates="execution", cascade="all, delete-orphan"
    )
    report = relationship(
        "Report", back_populates="execution", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Execution(id={self.id}, status={self.status})>"


class ExecutionStep(Base):
    """执行步骤详情表 - 存储每个步骤的执行详情

    设计要点:
    - UUID 主键
    - 外键关联到 executions 和 scenarios 表
    - 记录请求/响应数据和断言结果
    """

    __tablename__ = "execution_steps"

    # 主键 - UUID
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # 外键
    execution_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("executions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    scenario_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("scenarios.id"),
        nullable=True,
        index=True
    )

    # 步骤信息
    step_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # passed/failed/skipped

    # 时间戳
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False), nullable=True
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False), nullable=True
    )

    # 请求数据 (JSON 格式)
    request_data: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )

    # 响应数据 (JSON 格式)
    response_data: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )

    # 断言结果 (JSON 格式)
    assertions: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )

    # 错误信息
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 关系
    execution = relationship("Execution", back_populates="steps")

    def __repr__(self) -> str:
        return f"<ExecutionStep(step_name={self.step_name}, status={self.status})>"


class Report(Base):
    """报告表 - 存储测试报告信息

    设计要点:
    - UUID 主键
    - 外键关联到 executions 表 (一对一)
    - 支持多种报告类型 (platform/allure)
    - 报告过期时间 (默认 30 天)
    """

    __tablename__ = "reports"

    # 主键 - UUID
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # 外键 (一对一关系)
    execution_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("executions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )

    # 报告类型
    report_type: Mapped[str] = mapped_column(
        String(50), default="platform"
    )  # platform/allure

    # 存储路径 (MinIO 或本地文件系统)
    storage_path: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )

    # 过期时间 (默认 30 天后过期)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False), nullable=True
    )

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: utcnow(), nullable=False
    )

    # 关系
    execution = relationship("Execution", back_populates="report")

    def __repr__(self) -> str:
        return f"<Report(id={self.id}, report_type={self.report_type})>"
