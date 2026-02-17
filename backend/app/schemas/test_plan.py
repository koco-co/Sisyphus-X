"""测试计划相关 Pydantic Schemas

参考文档:
- docs/数据库设计.md §3.13-§3.15
- docs/接口定义.md §7. 测试计划模块
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# ========== TestPlan Schemas ==========


class TestPlanBase(BaseModel):
    """测试计划基础 Schema"""
    name: str = Field(..., min_length=1, max_length=255, description="测试计划名称")
    description: Optional[str] = Field(None, description="测试计划描述")


class TestPlanCreate(TestPlanBase):
    """创建测试计划 Schema"""
    project_id: str = Field(..., description="项目 ID")


class TestPlanUpdate(BaseModel):
    """更新测试计划 Schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="测试计划名称")
    description: Optional[str] = Field(None, description="测试计划描述")


class TestPlanResponse(TestPlanBase):
    """测试计划响应 Schema"""
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="测试计划 ID")
    project_id: str = Field(..., description="项目 ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")


# ========== PlanScenario Schemas ==========


class PlanScenarioBase(BaseModel):
    """计划场景关联基础 Schema"""
    execution_order: int = Field(..., ge=0, description="执行顺序")


class PlanScenarioCreate(PlanScenarioBase):
    """创建计划场景关联 Schema"""
    test_plan_id: str = Field(..., description="测试计划 ID")
    scenario_id: str = Field(..., description="场景 ID")


class PlanScenarioUpdate(BaseModel):
    """更新计划场景关联 Schema"""
    execution_order: Optional[int] = Field(None, ge=0, description="执行顺序")


class PlanScenarioResponse(PlanScenarioBase):
    """计划场景关联响应 Schema"""
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="计划场景关联 ID")
    test_plan_id: str = Field(..., description="测试计划 ID")
    scenario_id: str = Field(..., description="场景 ID")
    created_at: datetime = Field(..., description="创建时间")


# ========== TestPlanExecution Schemas ==========


class TestPlanExecutionBase(BaseModel):
    """测试计划执行基础 Schema"""
    status: str = Field(
        default="pending",
        description="执行状态: pending/running/completed/failed/cancelled"
    )


class TestPlanExecutionCreate(TestPlanExecutionBase):
    """创建测试计划执行 Schema"""
    test_plan_id: str = Field(..., description="测试计划 ID")


class TestPlanExecutionUpdate(BaseModel):
    """更新测试计划执行 Schema"""
    status: Optional[str] = Field(
        None,
        description="执行状态: pending/running/completed/failed/cancelled"
    )
    started_at: Optional[datetime] = Field(None, description="开始时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")
    total_scenarios: Optional[int] = Field(None, ge=0, description="场景总数")
    passed_scenarios: Optional[int] = Field(None, ge=0, description="通过场景数")
    failed_scenarios: Optional[int] = Field(None, ge=0, description="失败场景数")
    skipped_scenarios: Optional[int] = Field(None, ge=0, description="跳过场景数")


class TestPlanExecutionResponse(TestPlanExecutionBase):
    """测试计划执行响应 Schema"""
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="执行记录 ID")
    test_plan_id: str = Field(..., description="测试计划 ID")
    started_at: Optional[datetime] = Field(None, description="开始时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")
    total_scenarios: int = Field(..., description="场景总数")
    passed_scenarios: int = Field(..., description="通过场景数")
    failed_scenarios: int = Field(..., description="失败场景数")
    skipped_scenarios: int = Field(..., description="跳过场景数")
    created_at: datetime = Field(..., description="创建时间")


# ========== PlanExecutionStep Schemas ==========


class PlanExecutionStepBase(BaseModel):
    """计划执行步骤基础 Schema"""
    status: str = Field(
        default="pending",
        description="执行状态: pending/running/passed/failed/skipped"
    )


class PlanExecutionStepCreate(PlanExecutionStepBase):
    """创建计划执行步骤 Schema"""
    test_plan_execution_id: str = Field(..., description="测试执行 ID")
    scenario_id: str = Field(..., description="场景 ID")


class PlanExecutionStepUpdate(BaseModel):
    """更新计划执行步骤 Schema"""
    status: Optional[str] = Field(
        None,
        description="执行状态: pending/running/passed/failed/skipped"
    )
    started_at: Optional[datetime] = Field(None, description="开始时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")
    error_message: Optional[str] = Field(None, description="错误信息")


class PlanExecutionStepResponse(PlanExecutionStepBase):
    """计划执行步骤响应 Schema"""
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="执行步骤 ID")
    test_plan_execution_id: str = Field(..., description="测试执行 ID")
    scenario_id: str = Field(..., description="场景 ID")
    started_at: Optional[datetime] = Field(None, description="开始时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")
    error_message: Optional[str] = Field(None, description="错误信息")
    created_at: datetime = Field(..., description="创建时间")
