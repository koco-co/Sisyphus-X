from typing import Optional
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
    name: Optional[str] = None
    scenario_id: Optional[int] = None
    cron_expression: Optional[str] = None
    status: Optional[str] = None

class PlanResponse(BaseModel):
    """测试计划响应"""
    id: int
    name: str
    scenario_id: int
    cron_expression: str
    status: str
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
