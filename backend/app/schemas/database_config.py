"""数据库配置 Pydantic Schemas"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional


class DatabaseConfigBase(BaseModel):
    """数据库配置基础模型"""

    name: str = Field(..., min_length=1, max_length=255, description="连接名称")
    variable_name: Optional[str] = Field(None, max_length=255, description="引用变量名")
    db_type: str = Field(..., min_length=1, max_length=50, description="数据库类型")
    host: str = Field(..., min_length=1, max_length=255, description="主机地址")
    port: int = Field(..., gt=0, le=65535, description="端口号")
    initial_database: Optional[str] = Field(None, max_length=255, description="初始数据库名")
    username: str = Field(..., min_length=1, max_length=255, description="用户名")
    password: str = Field(..., min_length=1, max_length=255, description="密码（加密存储）")
    is_enabled: bool = Field(True, description="是否启用")


class DatabaseConfigCreate(DatabaseConfigBase):
    """创建数据库配置时的请求模型"""

    pass


class DatabaseConfigUpdate(BaseModel):
    """更新数据库配置时的请求模型"""

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="连接名称")
    variable_name: Optional[str] = Field(None, max_length=255, description="引用变量名")
    db_type: Optional[str] = Field(None, min_length=1, max_length=50, description="数据库类型")
    host: Optional[str] = Field(None, min_length=1, max_length=255, description="主机地址")
    port: Optional[int] = Field(None, gt=0, le=65535, description="端口号")
    initial_database: Optional[str] = Field(None, max_length=255, description="初始数据库名")
    username: Optional[str] = Field(None, min_length=1, max_length=255, description="用户名")
    password: Optional[str] = Field(None, min_length=1, max_length=255, description="密码")
    is_enabled: Optional[bool] = Field(None, description="是否启用")
    connection_status: Optional[str] = Field(None, max_length=50, description="连接状态")

    @field_validator("name", "variable_name", "host", "initial_database", "username", "password")
    @classmethod
    def strip_whitespace(cls, v):
        """去除字符串首尾空格"""
        if v is not None:
            return v.strip()
        return v


class DatabaseConfigResponse(DatabaseConfigBase):
    """数据库配置响应模型"""

    id: str
    project_id: str
    connection_status: str = "unknown"
    last_tested_at: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class DatabaseConfigTestResult(BaseModel):
    """测试数据库连接结果"""

    success: bool = Field(..., description="是否连接成功")
    connection_status: str = Field(..., description="连接状态")
    message: str = Field(..., description="测试结果消息")
    error: Optional[str] = Field(None, description="错误信息（如果失败）")
