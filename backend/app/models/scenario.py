from sqlmodel import JSON, Column, Field, SQLModel


class TestScenario(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int
    name: str
    cron_expression: str | None = None  # 定时任务表达式

    # 核心编排数据：存储 Reactflow 的节点(Nodes)和连线(Edges) JSON
    # 后端执行时，需解析此图结构转化为线性执行逻辑
    graph_data: dict = Field(default={}, sa_column=Column(JSON))
