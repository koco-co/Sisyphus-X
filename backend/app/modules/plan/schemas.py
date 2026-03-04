"""测试计划模块 Pydantic Schemas"""

from datetime import datetime
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from app.core.response import PagedData


# ============================================================================
# 计划-场景关联 Schemas
# ============================================================================


class PlanScenarioCreate(BaseModel):
    """创建计划-场景关联请求"""

    scenario_id: str = Field(..., min_length=1, description="场景 ID")
    dataset_id: str | None = Field(None, description="测试数据集 ID")
    variables_override: dict[str, Any] = Field(
        default_factory=dict, description="变量覆盖"
    )
    sort_order: int = Field(default=0, ge=0, description="排序顺序")


class PlanScenarioUpdate(BaseModel):
    """更新计划-场景关联请求"""

    dataset_id: str | None = Field(None, description="测试数据集 ID")
    variables_override: dict[str, Any] | None = Field(None, description="变量覆盖")
    sort_order: int | None = Field(None, ge=0, description="排序顺序")


class PlanScenarioResponse(BaseModel):
    """计划-场景关联响应（包含关联信息）"""

    id: str
    plan_id: str
    scenario_id: str
    dataset_id: str | None
    variables_override: dict[str, Any]
    sort_order: int
    created_at: datetime
    # 关联信息
    scenario_name: str | None = Field(None, description="场景名称")
    dataset_name: str | None = Field(None, description="数据集名称")

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# 测试计划 Schemas
# ============================================================================


class TestPlanCreate(BaseModel):
    """创建测试计划请求"""

    name: str = Field(..., min_length=1, max_length=255, description="计划名称")
    description: str | None = Field(None, description="计划描述")
    scenarios: list[PlanScenarioCreate] = Field(
        default_factory=list, description="场景关联列表"
    )


class TestPlanUpdate(BaseModel):
    """更新测试计划请求"""

    name: str | None = Field(None, min_length=1, max_length=255, description="计划名称")
    description: str | None = Field(None, description="计划描述")


class TestPlanResponse(BaseModel):
    """测试计划响应（完整详情，包含场景列表）"""

    id: str
    project_id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    scenarios: list[PlanScenarioResponse] = Field(
        default_factory=list, description="场景关联列表"
    )

    model_config = ConfigDict(from_attributes=True)


class TestPlanBriefResponse(BaseModel):
    """测试计划简要响应（不含场景列表）"""

    id: str
    project_id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    scenario_count: int = Field(default=0, description="场景数量")

    model_config = ConfigDict(from_attributes=True)


class TestPlanListResponse(BaseModel):
    """测试计划列表响应 - 兼容 ApiResponse[PagedData[TestPlanBriefResponse]]"""

    code: int = 0
    message: str = "success"
    data: "PagedData[TestPlanBriefResponse]"

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# 批量操作 Schemas
# ============================================================================


class PlanScenarioBatchCreate(BaseModel):
    """批量添加场景请求"""

    scenarios: list[PlanScenarioCreate] = Field(
        ..., min_length=1, description="场景关联列表"
    )


class PlanScenarioReorder(BaseModel):
    """场景重排序请求"""

    plan_scenario_ids: list[str] = Field(
        ..., min_length=1, description="计划-场景关联 ID 列表（按新顺序排列）"
    )
