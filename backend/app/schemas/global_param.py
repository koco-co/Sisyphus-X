"""全局参数 Pydantic Schemas

按照 docs/数据库设计.md §3.17 定义
Phase 1 重构: 使用 input_params/output_params 代替 parameters/return_value
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ParamDefinition(BaseModel):
    """参数定义 Schema"""

    name: str
    type: str = "str"
    description: str | None = None
    default: str | None = None


class GlobalParamBase(BaseModel):
    """全局参数基础 Schema"""

    class_name: str = Field(..., description="类名")
    method_name: str = Field(..., description="方法名")
    code: str = Field(..., description="Python 代码")
    description: str | None = Field(None, description="描述")
    input_params: list[ParamDefinition] = Field(default_factory=list, description="入参释义")
    output_params: list[ParamDefinition] = Field(default_factory=list, description="出参释义")


class GlobalParamCreate(GlobalParamBase):
    """创建全局参数 Schema"""

    pass


class GlobalParamUpdate(BaseModel):
    """更新全局参数 Schema"""

    code: str | None = None
    description: str | None = None
    input_params: list[ParamDefinition] | None = None
    output_params: list[ParamDefinition] | None = None


class GlobalParamResponse(GlobalParamBase):
    """全局参数响应 Schema"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime | None = None


class GlobalParamList(BaseModel):
    """全局参数列表 Schema"""

    total: int
    items: list[GlobalParamResponse]
