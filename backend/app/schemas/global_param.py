"""全局参数 Pydantic Schemas

按照 docs/数据库设计.md §3.17 定义
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ParameterInfo(BaseModel):
    """参数信息 Schema"""

    name: str
    type: str
    description: str | None = None
    required: bool = True
    default: str | None = None


class ReturnValueInfo(BaseModel):
    """返回值信息 Schema"""

    type: str
    description: str | None = None
    example: str | None = None


class GlobalParamBase(BaseModel):
    """全局参数基础 Schema"""

    class_name: str = Field(..., description="类名")
    method_name: str = Field(..., description="方法名")
    code: str = Field(..., description="Python 代码")
    description: str | None = Field(None, description="描述")
    parameters: list[ParameterInfo] | None = Field(default=None, description="入参释义")
    return_value: ReturnValueInfo | None = Field(default=None, description="出参释义")


class GlobalParamCreate(GlobalParamBase):
    """创建全局参数 Schema"""

    pass


class GlobalParamUpdate(BaseModel):
    """更新全局参数 Schema"""

    code: str | None = None
    description: str | None = None
    parameters: list[ParameterInfo] | None = None
    return_value: ReturnValueInfo | None = None


class GlobalParamResponse(GlobalParamBase):
    """全局参数响应 Schema"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime


class GlobalParamList(BaseModel):
    """全局参数列表 Schema"""

    total: int
    items: list[GlobalParamResponse]
