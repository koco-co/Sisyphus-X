"""场景相关模型 - SQLAlchemy 2.0 ORM

参考文档: docs/数据库设计.md
- §3.9 场景表 (scenarios)
- §3.10 场景步骤表 (scenario_steps)
- §3.11 测试数据集表 (datasets)

参考文档: docs/接口定义.md
- §6 场景编排模块

字段说明:
Scenario:
- id: UUID 主键
- project_id: 项目 ID (外键)
- name: 场景名称
- description: 场景描述 (可选)
- priority: 优先级 (P0/P1/P2/P3, 默认 P2)
- tags: 标签数组 (JSONB)
- variables: 场景级变量 (JSONB)
- pre_sql: 前置 SQL (可选, 用于数据准备)
- post_sql: 后置 SQL (可选, 用于数据验证)
- created_by: 创建人 ID (外键)
- created_at: 创建时间
- updated_at: 更新时间

ScenarioStep:
- id: UUID 主键
- scenario_id: 场景 ID (外键)
- description: 步骤描述 (可选)
- keyword_type: 关键字类型 (request/assertion/extract/db/custom)
- keyword_name: 关键字名称
- parameters: 参数 JSONB (可选)
- sort_order: 排序顺序 (默认 0)
- created_at: 创建时间
- updated_at: 更新时间

Dataset:
- id: UUID 主键
- project_id: 项目 ID (外键)
- scenario_id: 场景 ID (外键, 可选)
- name: 数据集名称
- csv_data: CSV 数据 (文本格式)
- created_at: 创建时间
- updated_at: 更新时间

索引:
- idx_scenario_steps_scenario_order: (scenario_id, sort_order)
"""
from datetime import datetime
from typing import TYPE_CHECKING, Optional, List, Dict, Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.keyword import Keyword


class Scenario(Base):
    """测试场景表 - 存储测试场景基本信息

    设计要点:
    - UUID 主键 (分布式友好)
    - 外键关联到 projects 表 (级联删除)
    - 外键关联到 users 表 (级联删除)
    - 支持前置 SQL 和后置 SQL (用于数据准备和验证)
    - 支持优先级、标签、变量等字段
    """

    __tablename__ = "scenarios"

    # 主键
    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # 外键
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 基本信息
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 优先级、标签、变量
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default="P2")  # P0/P1/P2/P3
    tags: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)  # JSONB
    variables: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)  # JSONB

    # SQL 预处理和后处理
    pre_sql: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    post_sql: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow(), nullable=False
    )

    # 关系
    steps: Mapped[List["ScenarioStep"]] = relationship(
        "ScenarioStep",
        back_populates="scenario",
        cascade="all, delete-orphan",
        order_by="ScenarioStep.sort_order",
    )
    datasets: Mapped[List["Dataset"]] = relationship(
        "Dataset",
        back_populates="scenario",
        cascade="all, delete-orphan",
    )
    user: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<Scenario(id={self.id}, name={self.name}, project_id={self.project_id})>"


class ScenarioStep(Base):
    """场景步骤表 - 存储测试场景的执行步骤

    设计要点:
    - UUID 主键
    - 外键关联到 scenarios 表 (级联删除)
    - 支持 keyword_type, keyword_name, parameters 等字段
    - 使用 sort_order 排序
    """

    __tablename__ = "scenario_steps"

    # 主键
    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # 外键
    scenario_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 步骤信息
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    keyword_type: Mapped[str] = mapped_column(String(50), nullable=False)  # request/assertion/extract/db/custom
    keyword_name: Mapped[str] = mapped_column(String(255), nullable=False)
    parameters: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)  # JSONB
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow(), nullable=False
    )

    # 索引
    __table_args__ = (
        Index("idx_scenario_steps_scenario_id", "scenario_id"),
        Index("idx_scenario_steps_sort_order", "sort_order"),
    )

    # 关系
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="steps")

    def __repr__(self) -> str:
        return (
            f"<ScenarioStep(id={self.id}, scenario_id={self.scenario_id}, "
            f"keyword_type={self.keyword_type}, keyword_name={self.keyword_name})>"
        )


class Dataset(Base):
    """测试数据集表 - 存储数据驱动测试的 CSV 数据

    设计要点:
    - UUID 主键
    - 外键关联到 projects 表 (级联删除)
    - 外键关联到 scenarios 表 (级联删除, 可选)
    - CSV 数据以文本格式存储 (支持导入导出)
    """

    __tablename__ = "datasets"

    # 主键
    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # 外键
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scenario_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # 数据集信息
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    csv_data: Mapped[str] = mapped_column(Text, nullable=False)  # CSV 格式数据

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow(), nullable=False
    )

    # 关系
    scenario: Mapped[Optional["Scenario"]] = relationship("Scenario", back_populates="datasets")

    def __repr__(self) -> str:
        return f"<Dataset(id={self.id}, name={self.name}, scenario_id={self.scenario_id})>"
