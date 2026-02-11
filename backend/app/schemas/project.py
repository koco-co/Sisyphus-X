from pydantic import BaseModel, Field, field_validator


class ProjectBase(BaseModel):
    """项目基础模型"""

    name: str = Field(..., min_length=1, max_length=50, description="项目名称，1-50个字符")
    key: str = Field(..., min_length=1, max_length=100, description="项目标识")
    description: str | None = Field(None, max_length=200, description="项目描述，最多200个字符")
    owner: str | None = Field(None, max_length=50, description="项目负责人")


class ProjectCreate(ProjectBase):
    """创建项目时的请求模型"""

    pass


class ProjectUpdate(BaseModel):
    """更新项目时的请求模型"""

    name: str | None = Field(None, min_length=1, max_length=50, description="项目名称，1-50个字符")
    description: str | None = Field(None, max_length=200, description="项目描述，最多200个字符")

    @field_validator("name", "description")
    @classmethod
    def strip_whitespace(cls, v):
        """去除字符串首尾空格"""
        if v is not None:
            return v.strip()
        return v


class ProjectResponse(ProjectBase):
    """项目响应模型"""

    id: int

    class Config:
        from_attributes = True
