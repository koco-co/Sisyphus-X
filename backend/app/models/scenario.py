from typing import Optional, Dict
from sqlmodel import SQLModel, Field, Column, JSON

class TestScenario(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int
    name: str
    cron_expression: Optional[str] = None # 定时任务表达式

    # 核心编排数据：存储 Reactflow 的节点(Nodes)和连线(Edges) JSON
    # 后端执行时，需解析此图结构转化为线性执行逻辑
    graph_data: Dict = Field(default={}, sa_column=Column(JSON))
