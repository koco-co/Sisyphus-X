"""数据库配置 Pydantic Schemas

参考文档: docs/接口定义.md §3.6-3.10 数据库配置管理
"""

from pydantic import BaseModel, Field, field_validator


class DatabaseConfigBase(BaseModel):
    """数据库配置基础模型"""

    name: str = Field(..., min_length=1, max_length=100, description="连接名称")
    variable_name: str | None = Field(None, max_length=100, description="引用变量名")
    db_type: str = Field(..., min_length=1, max_length=50, description="数据库类型")
    host: str = Field(..., min_length=1, max_length=255, description="主机地址")
    port: int = Field(..., gt=0, le=65535, description="端口号")
    db_name: str | None = Field(None, max_length=100, description="数据库名")
    username: str = Field(..., min_length=1, max_length=100, description="用户名")
    password: str = Field(..., min_length=1, max_length=255, description="密码（加密存储）")
    is_enabled: bool = Field(True, description="是否启用")


class DatabaseConfigCreate(DatabaseConfigBase):
    """创建数据库配置时的请求模型"""

    pass


class DatabaseConfigUpdate(BaseModel):
    """更新数据库配置时的请求模型"""

    name: str | None = Field(None, min_length=1, max_length=100, description="连接名称")
    variable_name: str | None = Field(None, max_length=100, description="引用变量名")
    db_type: str | None = Field(None, min_length=1, max_length=50, description="数据库类型")
    host: str | None = Field(None, min_length=1, max_length=255, description="主机地址")
    port: int | None = Field(None, gt=0, le=65535, description="端口号")
    db_name: str | None = Field(None, max_length=100, description="数据库名")
    username: str | None = Field(None, min_length=1, max_length=100, description="用户名")
    password: str | None = Field(None, min_length=1, max_length=255, description="密码")
    is_enabled: bool | None = Field(None, description="是否启用")
    status: str | None = Field(None, max_length=20, description="连接状态")

    @field_validator("name", "variable_name", "host", "db_name", "username", "password")
    @classmethod
    def strip_whitespace(cls, v):
        """去除字符串首尾空格"""
        if v is not None:
            return v.strip()
        return v


class DatabaseConfigResponse(BaseModel):
    """数据库配置响应模型 (BE-014: config_info 保存后自动组装 host:port/db)"""

    id: str
    project_id: str
    name: str
    variable_name: str | None = None
    db_type: str
    host: str
    port: int
    db_name: str | None = None
    username: str
    password: str = "******"  # 脱敏
    is_enabled: bool = True
    status: str = "unknown"
    last_test_at: str | None = None
    error_msg: str | None = None
    created_at: str
    updated_at: str
    config_info: str | None = Field(None, description="配置信息展示，如 host:port/db")

    model_config = {"from_attributes": True}


class DatabaseConfigTestResult(BaseModel):
    """测试数据库连接结果"""

    success: bool = Field(..., description="是否连接成功")
    status: str = Field(..., description="连接状态")
    message: str = Field(..., description="测试结果消息")
    latency_ms: int | None = Field(None, description="连接延迟毫秒数")
