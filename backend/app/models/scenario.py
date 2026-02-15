"""测试场景模型 - SQLAlchemy 2.0 ORM"""
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class TestScenario(Base):
    """测试场景表 - 存储 ReactFlow 图结构"""

    __tablename__ = "testscenario"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("project.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    cron_expression: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 定时任务表达式

    # 核心编排数据：存储 Reactflow 的节点(Nodes)和连线(Edges) JSON
    # 后端执行时，需解析此图结构转化为线性执行逻辑
    graph_data: Mapped[dict] = mapped_column(JSON, default={})
