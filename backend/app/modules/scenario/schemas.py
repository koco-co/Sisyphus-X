"""场景模块 Pydantic Schemas"""

from datetime import datetime
from typing import TYPE_CHECKING, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from app.core.response import PagedData


# 优先级类型
Priority = Literal["P0", "P1", "P2", "P3"]


# ============================================================================
# 场景步骤 Schemas
# ============================================================================


class ScenarioStepCreate(BaseModel):
    """创建场景步骤请求"""

    name: str = Field(..., min_length=1, max_length=255, description="步骤名称")
    keyword_type: str = Field(..., min_length=1, max_length=100, description="关键字类型")
    keyword_method: str = Field(..., min_length=1, max_length=100, description="关键字方法")
    config: dict[str, Any] = Field(default_factory=dict, description="关键字配置参数")
    sort_order: int = Field(default=0, ge=0, description="排序顺序")


class ScenarioStepBatchCreate(BaseModel):
    """批量创建步骤请求"""

    steps: list[ScenarioStepCreate] = Field(..., min_length=1, description="步骤列表")


class ScenarioStepReorder(BaseModel):
    """步骤重排序请求"""

    step_ids: list[str] = Field(..., min_length=1, description="步骤 ID 列表（按新顺序排列）")


class ScenarioStepUpdate(BaseModel):
    """更新场景步骤请求"""

    name: str | None = Field(None, min_length=1, max_length=255, description="步骤名称")
    keyword_type: str | None = Field(None, min_length=1, max_length=100, description="关键字类型")
    keyword_method: str | None = Field(None, min_length=1, max_length=100, description="关键字方法")
    config: dict[str, Any] | None = Field(None, description="关键字配置参数")
    sort_order: int | None = Field(None, ge=0, description="排序顺序")


class ScenarioStepResponse(BaseModel):
    """场景步骤响应"""

    id: str
    scenario_id: str
    name: str
    keyword_type: str
    keyword_method: str
    config: dict[str, Any]
    sort_order: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# 数据集行 Schemas
# ============================================================================


class DatasetRowCreate(BaseModel):
    """创建数据集行请求"""

    row_data: dict[str, Any] = Field(default_factory=dict, description="行数据")
    sort_order: int = Field(default=0, ge=0, description="排序顺序")


class DatasetRowUpdate(BaseModel):
    """更新数据集行请求"""

    row_data: dict[str, Any] | None = Field(None, description="行数据")
    sort_order: int | None = Field(None, ge=0, description="排序顺序")


class DatasetRowResponse(BaseModel):
    """数据集行响应"""

    id: str
    dataset_id: str
    row_data: dict[str, Any]
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# 测试数据集 Schemas
# ============================================================================


class TestDatasetCreate(BaseModel):
    """创建测试数据集请求"""

    name: str = Field(..., min_length=1, max_length=255, description="数据集名称")
    headers: list[str] = Field(default_factory=list, description="表头列表")
    rows: list[DatasetRowCreate] = Field(default_factory=list, description="数据行列表")


class TestDatasetUpdate(BaseModel):
    """更新测试数据集请求"""

    name: str | None = Field(None, min_length=1, max_length=255, description="数据集名称")
    headers: list[str] | None = Field(None, description="表头列表")


class TestDatasetResponse(BaseModel):
    """测试数据集响应"""

    id: str
    scenario_id: str
    name: str
    headers: list[str]
    created_at: datetime
    rows: list[DatasetRowResponse] = Field(default_factory=list, description="数据行列表")

    model_config = ConfigDict(from_attributes=True)


class TestDatasetBriefResponse(BaseModel):
    """测试数据集简要响应（不含数据行）"""

    id: str
    scenario_id: str
    name: str
    headers: list[str]
    created_at: datetime
    row_count: int = Field(default=0, description="数据行数量")

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# 场景 Schemas
# ============================================================================


class ScenarioCreate(BaseModel):
    """创建场景请求"""

    name: str = Field(..., min_length=1, max_length=255, description="场景名称")
    description: str | None = Field(None, description="场景描述")
    priority: Priority = Field(default="P2", description="优先级 P0/P1/P2/P3")
    tags: list[str] = Field(default_factory=list, description="标签列表")
    variables: dict[str, Any] = Field(default_factory=dict, description="变量定义")
    pre_sql: str | None = Field(None, description="前置 SQL")
    post_sql: str | None = Field(None, description="后置 SQL")
    steps: list[ScenarioStepCreate] = Field(default_factory=list, description="步骤列表")


class ScenarioUpdate(BaseModel):
    """更新场景请求"""

    name: str | None = Field(None, min_length=1, max_length=255, description="场景名称")
    description: str | None = Field(None, description="场景描述")
    priority: Priority | None = Field(None, description="优先级 P0/P1/P2/P3")
    tags: list[str] | None = Field(None, description="标签列表")
    variables: dict[str, Any] | None = Field(None, description="变量定义")
    pre_sql: str | None = Field(None, description="前置 SQL")
    post_sql: str | None = Field(None, description="后置 SQL")


class ScenarioResponse(BaseModel):
    """场景响应（完整详情）"""

    id: str
    project_id: str
    name: str
    description: str | None
    priority: str
    tags: list[str]
    variables: dict[str, Any]
    pre_sql: str | None
    post_sql: str | None
    created_at: datetime
    updated_at: datetime
    steps: list[ScenarioStepResponse] = Field(default_factory=list, description="步骤列表")
    datasets: list[TestDatasetBriefResponse] = Field(
        default_factory=list, description="数据集列表（简要）"
    )

    model_config = ConfigDict(from_attributes=True)


class ScenarioBriefResponse(BaseModel):
    """场景简要响应（不含步骤和数据集详情）"""

    id: str
    project_id: str
    name: str
    description: str | None
    priority: str
    tags: list[str]
    created_at: datetime
    updated_at: datetime
    step_count: int = Field(default=0, description="步骤数量")

    model_config = ConfigDict(from_attributes=True)


class ScenarioListResponse(BaseModel):
    """场景列表响应 - 兼容 ApiResponse[PagedData[ScenarioBriefResponse]]"""

    code: int = 0
    message: str = "success"
    data: "PagedData[ScenarioBriefResponse]"

    model_config = ConfigDict(from_attributes=True)
