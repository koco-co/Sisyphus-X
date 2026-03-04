"""数据库配置相关的 Pydantic Schema"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DatabaseConfigCreate(BaseModel):
    """创建数据库配置请求"""

    name: str = Field(..., min_length=1, max_length=255)
    reference_var: str = Field(..., min_length=1, max_length=100)
    db_type: str = Field(..., pattern="^(MySQL|PostgreSQL)$")
    host: str = Field(..., min_length=1, max_length=255)
    port: int = Field(..., ge=1, le=65535)
    database: str = Field(..., min_length=1, max_length=255)
    username: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)


class DatabaseConfigUpdate(BaseModel):
    """更新数据库配置请求"""

    name: str | None = Field(None, min_length=1, max_length=255)
    reference_var: str | None = Field(None, min_length=1, max_length=100)
    db_type: str | None = Field(None, pattern="^(MySQL|PostgreSQL)$")
    host: str | None = Field(None, min_length=1, max_length=255)
    port: int | None = Field(None, ge=1, le=65535)
    database: str | None = Field(None, min_length=1, max_length=255)
    username: str | None = Field(None, min_length=1, max_length=255)
    password: str | None = Field(None, min_length=1, max_length=255)
    is_enabled: bool | None = None


class DatabaseConfigResponse(BaseModel):
    """数据库配置响应"""

    id: UUID
    project_id: UUID
    name: str
    reference_var: str
    db_type: str
    host: str
    port: int
    database: str
    username: str
    password: str  # 前端应显示为 ******
    connection_status: str
    is_enabled: bool
    last_check_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class ConnectionTestResult(BaseModel):
    """连接测试结果"""

    success: bool
    message: str
    tested_at: datetime
