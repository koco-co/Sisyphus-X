from datetime import datetime

from pydantic import BaseModel

# === 测试计划相关 Schema ===


class PlanCreate(BaseModel):
    """创建测试计划请求"""

    name: str
    scenario_id: int
    cron_expression: str
    status: str = "active"


class PlanUpdate(BaseModel):
    """更新测试计划请求"""

    name: str | None = None
    scenario_id: int | None = None
    cron_expression: str | None = None
    status: str | None = None


class PlanResponse(BaseModel):
    """测试计划响应"""

    id: int
    name: str
    scenario_id: int
    cron_expression: str
    status: str
    next_run: datetime | None = None
    last_run: datetime | None = None
    created_at: datetime
    updated_at: datetime
