from datetime import datetime

from pydantic import BaseModel, Field
from typing import Optional

# === 测试计划相关 Schema ===


class PlanCreate(BaseModel):
    """创建测试计划请求"""

    name: str = Field(..., min_length=1, max_length=255, description="测试计划名称")
    scenario_id: str = Field(..., description="场景ID")
    cron_expression: Optional[str] = Field(None, max_length=255, description="Cron定时表达式")
    status: str = Field(default="active", description="状态: active/paused/archived")


class PlanUpdate(BaseModel):
    """更新测试计划请求"""

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="测试计划名称")
    description: Optional[str] = Field(None, description="测试计划描述")
    scenario_id: Optional[str] = Field(None, description="场景ID")
    cron_expression: Optional[str] = Field(None, max_length=255, description="Cron定时表达式")
    status: Optional[str] = Field(None, description="状态: active/paused/archived")


class PlanResponse(BaseModel):
    """测试计划响应"""

    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    scenario_id: Optional[str] = None
    cron_expression: Optional[str] = None
    status: str
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
