"""测试计划模型 - SQLAlchemy 2.0 ORM

按照 Phase 1 重构计划定义的测试计划表结构
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base_new import Base
from app.utils.datetime import utcnow


class TestPlan(Base):
    """测试计划表 - 存储测试计划基本信息

    设计要点:
    - UUID 主键 (分布式友好)
    - 外键关联到 projects 表
    - 支持计划级别的描述和配置
    """

    __tablename__ = "test_plans"

    # 主键 - UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # 外键
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # 基本信息
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: utcnow(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: utcnow(), onupdate=lambda: utcnow(), nullable=False
    )

    # 关系
    project = relationship("Project", back_populates="test_plans")
    plan_scenarios = relationship(
        "PlanScenario",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="PlanScenario.sort_order"
    )
    executions = relationship("Execution", back_populates="plan")

    def __repr__(self) -> str:
        return f"<TestPlan(id={self.id}, name={self.name})>"


class PlanScenario(Base):
    """计划-场景关联表 - 存储测试计划与场景的关联关系

    设计要点:
    - UUID 主键 (分布式友好)
    - 支持场景排序 (sort_order)
    - 支持变量覆盖 (variables_override)
    - 支持关联测试数据集 (dataset_id)
    """

    __tablename__ = "plan_scenarios"

    # 主键 - UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # 外键
    plan_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("test_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    scenario_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    dataset_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("test_datasets.id", ondelete="SET NULL"),
        nullable=True
    )

    # 配置
    variables_override: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: utcnow(), nullable=False
    )

    # 表级约束
    __table_args__ = (
        Index("idx_plan_scenarios_plan_order", "plan_id", "sort_order"),
    )

    # 关系
    plan = relationship("TestPlan", back_populates="plan_scenarios")
    scenario = relationship("Scenario", back_populates="plan_scenarios")
    dataset = relationship("TestDataset", back_populates="plan_scenarios")

    def __repr__(self) -> str:
        return f"<PlanScenario(plan_id={self.plan_id}, scenario_id={self.scenario_id})>"
