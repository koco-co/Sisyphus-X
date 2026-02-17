"""
API 测试用例相关的 Pydantic schemas
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

# ============================================================================
# 测试用例相关 Schemas
# ============================================================================


class ApiTestCaseCreate(BaseModel):
    """创建 API 测试用例"""

    project_id: Optional[int] = None  # 从 URL 路径中获取，请求体中可选
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    config_data: dict[str, Any] = Field(default_factory=dict)
    environment_id: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    enabled: bool = Field(default=True)


class ApiTestCaseUpdate(BaseModel):
    """更新 API 测试用例"""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    config_data: dict[str, Any] | None = None
    environment_id: Optional[str] = None
    tags: list[str] | None = None
    enabled: Optional[bool] = None


class ApiTestCaseResponse(BaseModel):
    """API 测试用例响应"""

    id: str
    project_id: str
    name: str
    description: Optional[str]
    config_data: dict[str, Any]
    environment_id: Optional[str]
    tags: list[str]
    enabled: bool
    yaml_content: str
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ApiTestCaseListResponse(BaseModel):
    """API 测试用例列表响应"""

    total: int
    items: list[ApiTestCaseResponse]


# ============================================================================
# 测试执行相关 Schemas
# ============================================================================


class ApiTestExecutionRequest(BaseModel):
    """API 测试执行请求"""

    environment_id: Optional[str] = None
    verbose: bool = Field(default=True, description="是否详细输出")
    execution_options: dict[str, Any] = Field(default_factory=dict)


class ApiTestExecutionResponse(BaseModel):
    """API 测试执行响应"""

    id: str
    test_case_id: str
    environment_id: Optional[str]
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration: Optional[float]
    total_steps: int
    passed_steps: int
    failed_steps: int
    skipped_steps: int
    error_message: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiTestExecutionDetail(BaseModel):
    """API 测试执行详情"""

    id: str
    test_case_id: str
    environment_id: Optional[str]
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration: Optional[float]
    result_data: dict[str, Any]
    total_steps: int
    passed_steps: int
    failed_steps: int
    skipped_steps: int
    error_message: Optional[str]
    error_type: Optional[str]
    error_category: Optional[str]
    execution_options: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class StepValidationResult(BaseModel):
    """步骤验证结果"""

    passed: bool
    type: str
    path: Optional[str]
    actual: Any
    expected: Any
    description: Optional[str]
    error: Optional[str]


class ApiTestStepResultResponse(BaseModel):
    """API 测试步骤结果响应"""

    id: str
    execution_id: str
    step_name: str
    step_order: int
    step_type: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration: Optional[float]
    retry_count: int
    performance_metrics: dict[str, Any]
    response_data: dict[str, Any]
    validations: list[StepValidationResult]
    extracted_vars: dict[str, Any]
    error_info: dict[str, Any] | None

    model_config = {"from_attributes": True}


# ============================================================================
# 其他 Schemas
# ============================================================================


class ValidateYamlRequest(BaseModel):
    """验证 YAML 请求"""

    yaml_content: str


class ValidateYamlResponse(BaseModel):
    """验证 YAML 响应"""

    valid: bool
    errors: list[str] | None = None


class ImportFromYamlRequest(BaseModel):
    """从 YAML 导入请求"""

    project_id: str
    yaml_content: str
    override: bool = Field(default=False, description="如果用例已存在是否覆盖")


class ExecutionStatistics(BaseModel):
    """执行统计信息"""

    total: int
    passed: int
    failed: int
    skipped: int
    pass_rate: float
