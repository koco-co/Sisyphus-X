"""全局参数 Schemas - Pydantic 模型定义

全局参数用于定义测试执行中的辅助函数。
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ParamDefinition(BaseModel):
    """参数定义"""

    name: str = Field(..., description="参数名称")
    type: str = Field(default="str", description="参数类型")
    description: str | None = Field(default=None, description="参数描述")
    default: Any | None = Field(default=None, description="默认值")


class GlobalParamCreate(BaseModel):
    """创建全局参数请求"""

    class_name: str = Field(..., min_length=1, max_length=255, description="类名")
    method_name: str = Field(..., min_length=1, max_length=255, description="方法名")
    code: str = Field(..., min_length=1, description="代码内容")
    description: str | None = Field(default=None, description="描述")
    input_params: list[ParamDefinition] = Field(default_factory=list, description="输入参数")
    output_params: list[ParamDefinition] = Field(
        default_factory=list, description="输出参数"
    )


class GlobalParamUpdate(BaseModel):
    """更新全局参数请求"""

    class_name: str | None = Field(
        default=None, min_length=1, max_length=255, description="类名"
    )
    method_name: str | None = Field(
        default=None, min_length=1, max_length=255, description="方法名"
    )
    code: str | None = Field(default=None, min_length=1, description="代码内容")
    description: str | None = Field(default=None, description="描述")
    input_params: list[ParamDefinition] | None = Field(
        default=None, description="输入参数"
    )
    output_params: list[ParamDefinition] | None = Field(
        default=None, description="输出参数"
    )


class GlobalParamResponse(BaseModel):
    """全局参数响应"""

    id: UUID
    class_name: str
    method_name: str
    code: str
    description: str | None
    input_params: list[dict[str, Any]]
    output_params: list[dict[str, Any]]
    created_at: datetime

    model_config = {"from_attributes": True}


class GlobalParamBriefResponse(BaseModel):
    """全局参数简要响应"""

    id: UUID
    class_name: str
    method_name: str
    description: str | None

    model_config = {"from_attributes": True}


class GlobalParamListResponse(BaseModel):
    """全局参数列表响应"""

    items: list[GlobalParamResponse]
    total: int
