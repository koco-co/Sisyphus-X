"""报告 Schemas - Pydantic 模型定义

定义报告相关的请求和响应模型。
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

# ============ 报告统计 Schemas ============


class ReportStatistics(BaseModel):
    """报告统计数据"""

    total_scenarios: int = Field(default=0, description="场景总数")
    passed_scenarios: int = Field(default=0, description="通过场景数")
    failed_scenarios: int = Field(default=0, description="失败场景数")
    skipped_scenarios: int = Field(default=0, description="跳过场景数")
    total_steps: int = Field(default=0, description="步骤总数")
    passed_steps: int = Field(default=0, description="通过步骤数")
    failed_steps: int = Field(default=0, description="失败步骤数")
    pass_rate: float = Field(default=0.0, description="通过率 (0-100)")
    duration_ms: int = Field(default=0, description="执行耗时 (毫秒)")


# ============ 步骤结果 Schemas ============


class StepResult(BaseModel):
    """步骤执行结果"""

    id: UUID
    step_name: str
    status: str
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration_ms: int | None = Field(default=None, description="步骤耗时 (毫秒)")
    request_data: dict | None = None
    response_data: dict | None = None
    assertions: dict | None = None
    error_message: str | None = None

    model_config = {"from_attributes": True}


# ============ 场景结果 Schemas ============


class ScenarioResult(BaseModel):
    """场景执行结果"""

    scenario_id: UUID | None = None
    scenario_name: str
    status: str
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration_ms: int | None = Field(default=None, description="场景耗时 (毫秒)")
    steps: list[StepResult] = []

    model_config = {"from_attributes": True}


# ============ 报告响应 Schemas ============


class ReportDetailResponse(BaseModel):
    """报告详情响应"""

    id: UUID
    execution_id: UUID
    report_type: str
    storage_path: str | None = None
    expires_at: datetime | None = None
    created_at: datetime

    # 执行信息
    execution_status: str
    started_at: datetime | None = None
    finished_at: datetime | None = None

    # 关联信息
    plan_name: str | None = None
    scenario_name: str | None = None
    environment_name: str | None = None

    # 统计数据
    statistics: ReportStatistics

    # 场景结果
    scenarios: list[ScenarioResult] = []

    model_config = {"from_attributes": True}


class ReportBriefResponse(BaseModel):
    """报告简要响应"""

    id: UUID
    execution_id: UUID
    report_type: str
    created_at: datetime
    expires_at: datetime | None = None

    # 执行信息
    execution_status: str
    started_at: datetime | None = None
    finished_at: datetime | None = None
    total_scenarios: int = 0
    passed_scenarios: int = 0
    failed_scenarios: int = 0

    # 关联信息
    plan_name: str | None = None
    scenario_name: str | None = None
    environment_name: str | None = None

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    """报告列表响应"""

    items: list[ReportBriefResponse]
    total: int


class ReportExportQuery(BaseModel):
    """报告导出查询参数"""

    format: str = Field(default="json", pattern="^(json|html)$")
