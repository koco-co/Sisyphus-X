"""测试计划相关模型 - SQLAlchemy 2.0 ORM

参考文档: docs/数据库设计.md
- §3.13 测试计划表 (test_plans)
- §3.14 计划场景关联表 (plan_scenarios)
- §3.14 测试执行表 (test_executions)
- §3.15 执行步骤表 (execution_steps)

字段说明:
TestPlan:
- id: UUID 主键
- project_id: 项目 ID (外键)
- name: 计划名称
- description: 计划描述 (可选)
- created_at: 创建时间
- updated_at: 更新时间

PlanScenario:
- id: UUID 主键
- test_plan_id: 测试计划 ID (外键)
- scenario_id: 场景 ID (外键)
- execution_order: 执行顺序
- created_at: 创建时间

TestExecution:
- id: UUID 主键
- test_plan_id: 测试计划 ID (外键)
- status: 执行状态 (pending/running/completed/failed/cancelled)
- started_at: 开始时间
- completed_at: 完成时间
- total_scenarios: 场景总数
- passed_scenarios: 通过场景数
- failed_scenarios: 失败场景数
- skipped_scenarios: 跳过场景数
- created_at: 创建时间

ExecutionStep:
- id: UUID 主键
- test_execution_id: 测试执行 ID (外键)
- scenario_id: 场景 ID
- status: 执行状态 (pending/running/passed/failed/skipped)
- started_at: 开始时间
- completed_at: 完成时间
- error_message: 错误信息 (可选)
- created_at: 创建时间

索引:
- idx_plan_scenarios_plan_order: (test_plan_id, execution_order) 唯一索引
- idx_test_plans_project_id: project_id 索引
- idx_test_executions_test_plan_id: test_plan_id 索引
- idx_test_executions_status: status 索引
- idx_execution_steps_test_execution_id: test_execution_id 索引
- idx_execution_steps_status: status 索引
"""
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional, List, Dict, Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.scenario import Scenario


class TestPlan(Base):
    """测试计划表 - 存储测试计划基本信息

    设计要点:
    - UUID 主键 (分布式友好)
    - 外键关联到 projects 表 (级联删除)
    - 支持描述信息
    - 包含创建和更新时间戳
    - 支持定时执行（cron_expression）
    - 支持状态管理（active/paused/archived）
    - 记录运行时间信息
    """

    __tablename__ = "test_plans"

    # 主键
    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # 外键
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 基本信息
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 调度和状态信息
    cron_expression: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=None
    )  # Cron 定时表达式
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="active", index=True
    )  # active, paused, archived

    # 运行时间信息
    next_run: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, default=None
    )  # 下次运行时间
    last_run: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, default=None
    )  # 最后运行时间

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc), nullable=False
    )

    # 关系
    plan_scenarios: Mapped[List["PlanScenario"]] = relationship(
        "PlanScenario",
        back_populates="test_plan",
        cascade="all, delete-orphan",
        order_by="PlanScenario.execution_order",
    )
    test_plan_executions: Mapped[List["TestPlanExecution"]] = relationship(
        "TestPlanExecution",
        back_populates="test_plan",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<TestPlan(id={self.id}, name={self.name}, project_id={self.project_id})>"


class PlanScenario(Base):
    """计划场景关联表 - 存储测试计划与场景的多对多关系

    设计要点:
    - UUID 主键
    - 外键关联到 test_plans 表 (级联删除)
    - 外键关联到 test_scenarios 表 (级联删除)
    - 复合唯一索引 (test_plan_id, execution_order)
    - 支持场景执行顺序排序
    """

    __tablename__ = "plan_scenarios"

    # 主键
    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # 外键
    test_plan_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("test_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scenario_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 执行信息
    execution_order: Mapped[int] = mapped_column(Integer, nullable=False)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc), nullable=False)

    # 复合唯一索引: test_plan_id + execution_order 必须唯一
    __table_args__ = (
        Index("idx_plan_scenarios_plan_order", "test_plan_id", "execution_order", unique=True),
    )

    # 关系
    test_plan: Mapped["TestPlan"] = relationship("TestPlan", back_populates="plan_scenarios")
    scenario: Mapped["Scenario"] = relationship("Scenario")

    def __repr__(self) -> str:
        return (
            f"<PlanScenario(id={self.id}, test_plan_id={self.test_plan_id}, "
            f"scenario_id={self.scenario_id}, execution_order={self.execution_order})>"
        )


class TestPlanExecution(Base):
    """测试计划执行表 - 存储测试计划执行记录

    设计要点:
    - UUID 主键
    - 外键关联到 test_plans 表 (级联删除)
    - 支持多种执行状态 (pending/running/completed/failed/cancelled)
    - 记录执行时间和统计信息
    - 级联删除执行步骤
    """

    __tablename__ = "test_plan_executions"

    # 主键
    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # 外键
    test_plan_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("test_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 执行状态和统计信息
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending", index=True
    )  # pending, running, completed, failed, cancelled

    # 时间信息
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # 统计信息
    total_scenarios: Mapped[int] = mapped_column(Integer, default=0)
    passed_scenarios: Mapped[int] = mapped_column(Integer, default=0)
    failed_scenarios: Mapped[int] = mapped_column(Integer, default=0)
    skipped_scenarios: Mapped[int] = mapped_column(Integer, default=0)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc), nullable=False)

    # 关系
    test_plan: Mapped["TestPlan"] = relationship("TestPlan", back_populates="test_plan_executions")
    execution_steps: Mapped[List["PlanExecutionStep"]] = relationship(
        "PlanExecutionStep",
        back_populates="test_plan_execution",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<TestPlanExecution(id={self.id}, test_plan_id={self.test_plan_id}, "
            f"status={self.status})>"
        )


class PlanExecutionStep(Base):
    """计划执行步骤表 - 存储测试计划执行的详细步骤

    设计要点:
    - UUID 主键
    - 外键关联到 test_plan_executions 表 (级联删除)
    - 记录场景执行状态和结果
    - 支持错误信息记录
    - 记录执行时间
    """

    __tablename__ = "plan_execution_steps"

    # 主键
    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # 外键
    test_plan_execution_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("test_plan_executions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 场景信息
    scenario_id: Mapped[str] = mapped_column(String(36), nullable=False)

    # 执行状态
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending", index=True
    )  # pending, running, passed, failed, skipped

    # 时间信息
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # 错误信息
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc), nullable=False)

    # 关系
    test_plan_execution: Mapped["TestPlanExecution"] = relationship(
        "TestPlanExecution", back_populates="execution_steps"
    )

    def __repr__(self) -> str:
        return (
            f"<PlanExecutionStep(id={self.id}, test_plan_execution_id={self.test_plan_execution_id}, "
            f"scenario_id={self.scenario_id}, status={self.status})>"
        )
