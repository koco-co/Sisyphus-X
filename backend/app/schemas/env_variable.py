"""环境变量 Pydantic Schemas"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional


class EnvVariableBase(BaseModel):
    """环境变量基础模型"""

    name: str = Field(..., min_length=1, max_length=255, description="变量名")
    value: str = Field(..., description="变量值")
    description: Optional[str] = Field(None, description="变量描述")
    is_global: bool = Field(False, description="是否全局变量")


class EnvVariableCreate(EnvVariableBase):
    """创建环境变量时的请求模型"""

    pass


class EnvVariableUpdate(BaseModel):
    """更新环境变量时的请求模型"""

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="变量名")
    value: Optional[str] = Field(None, description="变量值")
    description: Optional[str] = Field(None, description="变量描述")
    is_global: Optional[bool] = Field(None, description="是否全局变量")

    @field_validator("name", "description")
    @classmethod
    def strip_whitespace(cls, v):
        """去除字符串首尾空格"""
        if v is not None:
            return v.strip()
        return v


class EnvVariableResponse(EnvVariableBase):
    """环境变量响应模型"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    environment_id: str
    created_at: datetime
    updated_at: datetime

