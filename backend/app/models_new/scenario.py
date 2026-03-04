# backend/app/models_new/scenario.py
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.base_new import Base


class Scenario(Base):
    """场景表"""
    __tablename__ = "scenarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(10), default="P2")  # P0/P1/P2/P3
    tags = Column(JSONB, default=list)
    variables = Column(JSONB, default=dict)
    pre_sql = Column(Text, nullable=True)
    post_sql = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    project = relationship("Project", back_populates="scenarios")
    steps = relationship("ScenarioStep", back_populates="scenario", cascade="all, delete-orphan", order_by="ScenarioStep.sort_order")
    datasets = relationship("TestDataset", back_populates="scenario", cascade="all, delete-orphan")
    plan_scenarios = relationship("PlanScenario", back_populates="scenario")

    def __repr__(self):
        return f"<Scenario {self.name}>"


class ScenarioStep(Base):
    """场景步骤表"""
    __tablename__ = "scenario_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    keyword_type = Column(String(100), nullable=False)
    keyword_method = Column(String(100), nullable=False)
    config = Column(JSONB, default=dict)  # 关键字参数
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    scenario = relationship("Scenario", back_populates="steps")

    def __repr__(self):
        return f"<ScenarioStep {self.name}>"


class TestDataset(Base):
    """测试数据集表"""
    __tablename__ = "test_datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    headers = Column(JSONB, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    scenario = relationship("Scenario", back_populates="datasets")
    rows = relationship("DatasetRow", back_populates="dataset", cascade="all, delete-orphan", order_by="DatasetRow.sort_order")
    plan_scenarios = relationship("PlanScenario", back_populates="dataset")

    def __repr__(self):
        return f"<TestDataset {self.name}>"


class DatasetRow(Base):
    """数据集行表"""
    __tablename__ = "dataset_rows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("test_datasets.id", ondelete="CASCADE"), nullable=False)
    row_data = Column(JSONB, default=dict)
    sort_order = Column(Integer, default=0)

    # 关系
    dataset = relationship("TestDataset", back_populates="rows")

    def __repr__(self):
        return f"<DatasetRow {self.id}>"
