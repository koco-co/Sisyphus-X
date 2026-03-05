from datetime import datetime

from pydantic import BaseModel, Field

# === 测试计划相关 Schema ===


class PlanCreate(BaseModel):
    """创建测试计划请求 — 计划可以空创建,场景稍后通过 /scenarios 子接口添加"""

    name: str = Field(..., min_length=1, max_length=255, description="测试计划名称")
    project_id: str = Field(..., description="项目ID")
    description: str | None = Field(None, description="测试计划描述")
    cron_expression: str | None = Field(None, max_length=255, description="Cron定时表达式")
    status: str = Field(default="active", description="状态: active/paused/archived")


class PlanUpdate(BaseModel):
    """更新测试计划请求"""

    name: str | None = Field(None, min_length=1, max_length=255, description="测试计划名称")
    description: str | None = Field(None, description="测试计划描述")
    cron_expression: str | None = Field(None, max_length=255, description="Cron定时表达式")
    status: str | None = Field(None, description="状态: active/paused/archived")


class PlanResponse(BaseModel):
    """测试计划响应"""

    id: str
    project_id: str
    name: str
    description: str | None = None
    scenario_id: str | None = None
    cron_expression: str | None = None
    status: str
    next_run: datetime | None = None
    last_run: datetime | None = None
    created_at: datetime
    updated_at: datetime


# === 场景管理子接口 Schema ===


class AddScenarioToPlan(BaseModel):
    """向计划添加场景"""

    scenario_id: str = Field(..., description="场景ID")
    execution_order: int = Field(..., ge=0, description="执行顺序")


class ReorderScenarioItem(BaseModel):
    """重排序单项"""

    scenario_id: str = Field(..., description="场景ID")
    execution_order: int = Field(..., ge=0, description="新执行顺序")
