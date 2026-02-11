from datetime import datetime

from sqlmodel import Field, SQLModel


class TestPlan(SQLModel, table=True):
    """测试计划表 - 用于定时任务调度"""

    __tablename__ = "testplan"  # pyright: ignore[reportAssignmentType]
    id: int | None = Field(default=None, primary_key=True)
    name: str  # 计划名称
    scenario_id: int = Field(foreign_key="testscenario.id")  # 关联的测试场景
    cron_expression: str  # Cron 表达式 (如: "0 8 * * *" 表示每天8点)
    status: str = "active"  # 'active' 或 'paused'
    next_run: datetime | None = None  # 下次执行时间
    last_run: datetime | None = None  # 上次执行时间
    created_at: datetime = Field(default_factory=datetime.utcnow)  # 创建时间
    updated_at: datetime = Field(default_factory=datetime.utcnow)  # 更新时间
