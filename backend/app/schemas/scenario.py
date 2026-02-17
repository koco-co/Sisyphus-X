"""场景相关 Pydantic Schemas

定义 Scenario, ScenarioStep, Dataset 的请求和响应 Schema
遵循 API 接口定义: docs/接口定义.md §6 场景编排模块
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, HttpUrl


# ========== Scenario Schemas ==========


class ScenarioBase(BaseModel):
    """场景基础 Schema"""
    name: str = Field(..., min_length=1, max_length=255, description="场景名称")
    description: Optional[str] = Field(None, description="场景描述")
    priority: str = Field(default="P2", pattern=r"^P[0-3]$", description="优先级 (P0/P1/P2/P3)")
    tags: Optional[List[str]] = Field(default=None, description="标签列表")
    variables: Optional[Dict[str, Any]] = Field(default=None, description="场景级变量")
    pre_sql: Optional[str] = Field(None, description="前置 SQL")
    post_sql: Optional[str] = Field(None, description="后置 SQL")


class ScenarioCreate(ScenarioBase):
    """创建场景请求 Schema"""
    project_id: str = Field(..., description="项目 ID")


class ScenarioUpdate(BaseModel):
    """更新场景请求 Schema (所有字段可选)"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="场景名称")
    description: Optional[str] = Field(None, description="场景描述")
    priority: Optional[str] = Field(None, pattern=r"^P[0-3]$", description="优先级 (P0/P1/P2/P3)")
    tags: Optional[List[str]] = Field(None, description="标签列表")
    variables: Optional[Dict[str, Any]] = Field(None, description="场景级变量")
    pre_sql: Optional[str] = Field(None, description="前置 SQL")
    post_sql: Optional[str] = Field(None, description="后置 SQL")


class ScenarioStepSummary(BaseModel):
    """场景步骤摘要 Schema (用于场景详情响应)"""
    id: str
    description: Optional[str] = None
    keyword_type: str
    keyword_name: str
    parameters: Optional[Dict[str, Any]] = None
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class DatasetSummary(BaseModel):
    """数据集摘要 Schema (用于场景详情响应)"""
    id: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class ScenarioResponse(ScenarioBase):
    """场景响应 Schema"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    steps: List[ScenarioStepSummary] = []


class ScenarioDetailResponse(ScenarioResponse):
    """场景详情响应 Schema (包含完整步骤和数据集)"""
    datasets: List[DatasetSummary] = []


# ========== ScenarioStep Schemas ==========


class ScenarioStepBase(BaseModel):
    """场景步骤基础 Schema"""
    description: Optional[str] = Field(None, description="步骤描述")
    keyword_type: str = Field(..., description="关键字类型 (request/assertion/extract/db/custom)")
    keyword_name: str = Field(..., min_length=1, max_length=255, description="关键字名称")
    parameters: Optional[Dict[str, Any]] = Field(None, description="关键字参数")
    sort_order: int = Field(..., ge=0, description="排序顺序")


class ScenarioStepCreate(ScenarioStepBase):
    """创建场景步骤请求 Schema"""
    # scenario_id 从 URL 参数获取，不在请求体中


class ScenarioStepUpdate(BaseModel):
    """更新场景步骤请求 Schema (所有字段可选)"""
    description: Optional[str] = Field(None, description="步骤描述")
    keyword_type: Optional[str] = Field(None, description="关键字类型")
    keyword_name: Optional[str] = Field(None, min_length=1, max_length=255, description="关键字名称")
    parameters: Optional[Dict[str, Any]] = Field(None, description="关键字参数")
    sort_order: Optional[int] = Field(None, ge=0, description="排序顺序")


class ScenarioStepResponse(ScenarioStepBase):
    """场景步骤响应 Schema"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    scenario_id: str
    created_at: datetime
    updated_at: datetime


class ReorderStepsRequest(BaseModel):
    """批量更新步骤排序请求 Schema"""
    step_ids: List[str] = Field(..., min_length=1, description="按新顺序排列的步骤 ID 数组")


# ========== Dataset Schemas ==========


class DatasetBase(BaseModel):
    """数据集基础 Schema"""
    name: str = Field(..., min_length=1, max_length=255, description="数据集名称")


class DatasetCreate(DatasetBase):
    """创建数据集请求 Schema"""
    csv_data: str = Field(..., description="CSV 格式数据")


class DatasetUpdate(BaseModel):
    """更新数据集请求 Schema (所有字段可选)"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="数据集名称")
    csv_data: Optional[str] = Field(None, description="CSV 格式数据")


class DatasetResponse(DatasetBase):
    """数据集响应 Schema"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    scenario_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ImportCsvRequest(BaseModel):
    """导入 CSV 请求 Schema"""
    dataset_id: str = Field(..., description="数据集 ID")
    file: str = Field(..., description="Base64 编码的 CSV 文件")


class ImportCsvResponse(BaseModel):
    """导入 CSV 响应 Schema"""
    id: str
    name: str
    row_count: int
    columns: List[str]


# ========== Debug Schemas ==========


class DebugScenarioRequest(BaseModel):
    """调试场景请求 Schema"""
    environment_id: Optional[str] = Field(None, description="环境 ID")
    dataset_id: Optional[str] = Field(None, description="数据集 ID")
    variables: Optional[Dict[str, Any]] = Field(None, description="变量覆盖")


class DebugScenarioStepResult(BaseModel):
    """调试场景步骤结果 Schema"""
    step_id: str
    status: str  # "passed" | "failed"
    duration: float
    error: Optional[str] = None


class DebugScenarioResponse(BaseModel):
    """调试场景响应 Schema"""
    execution_id: str
    report_url: str  # Allure 报告 URL
    results: List[DebugScenarioStepResult]
