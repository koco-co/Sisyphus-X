"""执行记录模块 Pydantic Schemas"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExecutionStatus:
    """执行状态常量"""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class ExecutionCreate(BaseModel):
    """创建执行记录请求"""

    plan_id: str | None = Field(None, description="测试计划 ID")
    scenario_id: str | None = Field(None, description="场景 ID")
    environment_id: str = Field(..., description="环境 ID")


class ExecutionUpdate(BaseModel):
    """更新执行记录请求"""

    status: str | None = Field(None, description="执行状态")
    celery_task_id: str | None = Field(None, description="Celery 任务 ID")
    total_scenarios: int | None = Field(None, ge=0, description="总场景数")
    passed_scenarios: int | None = Field(None, ge=0, description="通过场景数")
    failed_scenarios: int | None = Field(None, ge=0, description="失败场景数")
    skipped_scenarios: int | None = Field(None, ge=0, description="跳过场景数")
    started_at: datetime | None = Field(None, description="开始时间")
    finished_at: datetime | None = Field(None, description="结束时间")
    error_message: str | None = Field(None, description="错误信息")


class ExecutionResponse(BaseModel):
    """执行记录响应（完整详情）"""

    id: UUID
    plan_id: UUID | None = None
    scenario_id: UUID | None = None
    environment_id: UUID | None = None
    status: str
    celery_task_id: str | None = None
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int
    skipped_scenarios: int
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_by: UUID | None = None
    created_at: datetime
    # 关联信息
    plan_name: str | None = Field(None, description="计划名称")
    scenario_name: str | None = Field(None, description="场景名称")
    environment_name: str | None = Field(None, description="环境名称")

    model_config = ConfigDict(from_attributes=True)


class ExecutionBriefResponse(BaseModel):
    """执行记录简要响应"""

    id: UUID
    plan_id: UUID | None = None
    scenario_id: UUID | None = None
    environment_id: UUID | None = None
    status: str
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int
    skipped_scenarios: int
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime
    # 关联信息
    plan_name: str | None = Field(None, description="计划名称")
    scenario_name: str | None = Field(None, description="场景名称")
    environment_name: str | None = Field(None, description="环境名称")

    model_config = ConfigDict(from_attributes=True)


class ExecutionStepResponse(BaseModel):
    """执行步骤响应"""

    id: UUID
    execution_id: UUID
    scenario_id: UUID | None = None
    step_name: str
    status: str
    started_at: datetime | None = None
    finished_at: datetime | None = None
    request_data: dict[str, Any] | None = None
    response_data: dict[str, Any] | None = None
    assertions: dict[str, Any] | None = None
    error_message: str | None = None
    duration_ms: int | None = Field(None, description="执行耗时(毫秒)")

    model_config = ConfigDict(from_attributes=True)


class ExecutionListResponse(BaseModel):
    """执行记录列表响应"""

    code: int = 0
    message: str = "success"
    data: dict[str, Any]  # PagedData[ExecutionBriefResponse]

    model_config = ConfigDict(from_attributes=True)
