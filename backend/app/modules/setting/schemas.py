"""全局变量 Schemas"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GlobalVariableCreate(BaseModel):
    """创建全局变量请求"""

    key: str = Field(..., min_length=1, max_length=255, description="变量键名")
    value: Optional[str] = Field(None, description="变量值")
    description: Optional[str] = Field(None, description="变量描述")


class GlobalVariableUpdate(BaseModel):
    """更新全局变量请求"""

    key: Optional[str] = Field(None, min_length=1, max_length=255, description="变量键名")
    value: Optional[str] = Field(None, description="变量值")
    description: Optional[str] = Field(None, description="变量描述")


class GlobalVariableResponse(BaseModel):
    """全局变量响应"""

    id: UUID
    project_id: UUID
    key: str
    value: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class GlobalVariableListResponse(BaseModel):
    """全局变量列表响应"""

    code: int = 0
    message: str = "success"
    data: List[GlobalVariableResponse]

    model_config = ConfigDict(from_attributes=True)
