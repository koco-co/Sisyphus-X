from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ProjectBase(BaseModel):
    """项目基础模型"""

    name: str = Field(..., min_length=1, max_length=255, description="项目名称，1-255个字符")
    key: str = Field(..., min_length=1, max_length=100, description="项目唯一标识，如 PROJ-001")
    description: str | None = Field(None, description="项目描述")


class ProjectCreate(BaseModel):
    """创建项目时的请求模型"""

    name: str = Field(..., min_length=1, max_length=255, description="项目名称，1-255个字符")
    description: str | None = Field(None, description="项目描述")


class ProjectUpdate(BaseModel):
    """更新项目时的请求模型"""

    name: str | None = Field(None, min_length=1, max_length=255, description="项目名称")
    key: str | None = Field(None, min_length=1, max_length=100, description="项目唯一标识")
    description: str | None = Field(None, description="项目描述")
    owner: str | None = Field(None, description="项目负责人ID")

    @field_validator("name", "key", "description", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str | None) -> str | None:
        """去除字符串首尾空格"""
        if v is not None:
            return v.strip()
        return v


class ProjectResponse(ProjectBase):
    """项目响应模型"""

    id: str
    created_by: str
    owner: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
