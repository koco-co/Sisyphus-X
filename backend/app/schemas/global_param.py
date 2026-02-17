"""全局参数 Pydantic Schemas

按照 docs/数据库设计.md §3.17 定义
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class ParameterInfo(BaseModel):
    """参数信息 Schema"""
    name: str
    type: str
    description: Optional[str] = None
    required: bool = True
    default: Optional[str] = None


class ReturnValueInfo(BaseModel):
    """返回值信息 Schema"""
    type: str
    description: Optional[str] = None
    example: Optional[str] = None


class GlobalParamBase(BaseModel):
    """全局参数基础 Schema"""
    class_name: str = Field(..., description="类名")
    method_name: str = Field(..., description="方法名")
    code: str = Field(..., description="Python 代码")
    description: Optional[str] = Field(None, description="描述")
    parameters: Optional[List[ParameterInfo]] = Field(default=None, description="入参释义")
    return_value: Optional[ReturnValueInfo] = Field(default=None, description="出参释义")


class GlobalParamCreate(GlobalParamBase):
    """创建全局参数 Schema"""
    pass


class GlobalParamUpdate(BaseModel):
    """更新全局参数 Schema"""
    code: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[List[ParameterInfo]] = None
    return_value: Optional[ReturnValueInfo] = None


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
