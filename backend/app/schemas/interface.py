"""接口相关 Schema"""
from datetime import datetime
from typing import Any, Optional, List

from pydantic import BaseModel, Field


class InterfaceSendRequest(BaseModel):
    """发送接口请求"""
    url: str
    method: str
    headers: dict[str, str] | None = {}
    params: dict[str, Any] | None = {}
    body: Any | None = None
    files: dict[str, str] | None = {}  # key: filename, value: object_name
    timeout: int = 10

    model_config = {
        "json_schema_extra": {
            "example": {
                "url": "https://httpbin.org/post",
                "method": "POST",
                "headers": {"Content-Type": "application/json"},
                "body": {"foo": "bar"},
            }
        }
    }


class InterfaceSendResponse(BaseModel):
    """接口发送响应"""
    status_code: int
    headers: dict[str, str]
    body: Any
    elapsed: float  # seconds


class EngineExecuteRequest(BaseModel):
    """通过引擎执行测试用例的请求"""
    interface_id: Optional[str] = Field(None, description="接口 ID (可选)")
    environment_id: Optional[str] = Field(None, description="环境 ID (可选)")
    yaml_content: Optional[str] = Field(None, description="YAML 内容 (可选)")
    variables: dict[str, Any] = Field(default_factory=dict, description="额外变量")
    timeout: int = Field(default=300, description="执行超时时间(秒)")


class EngineExecuteResponse(BaseModel):
    """引擎执行响应"""
    success: bool
    result: dict[str, Any] | None = None
    error: Optional[str] = None


class CurlParseRequest(BaseModel):
    """解析 cURL 命令的请求"""
    curl_command: str = Field(..., description="cURL 命令")


class CurlParseResponse(BaseModel):
    """cURL 解析响应"""
    method: str
    url: str
    headers: dict[str, str]
    params: dict[str, str]
    body: Any
    body_type: str
    auth: dict[str, Any]


# ============================================
# Interface CRUD Schemas
# ============================================


class InterfaceBase(BaseModel):
    """接口基础模型"""
    name: str = Field(..., min_length=1, max_length=255, description="接口名称")
    url: str = Field(..., min_length=1, max_length=2048, description="接口路径")
    method: str = Field(
        ..., pattern="^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$", description="HTTP 方法"
    )
    status: str = Field(default="draft", description="状态: draft/stable/deprecated")
    description: Optional[str] = Field(None, description="接口描述")
    headers: dict[str, str] = Field(default_factory=dict, description="请求头")
    params: dict[str, Any] = Field(default_factory=dict, description="Query 参数")
    body: Any = Field(default_factory=dict, description="请求体")
    body_type: str = Field(default="json", description="请求体类型")
    cookies: dict[str, str] = Field(default_factory=dict, description="Cookies")
    auth_config: dict[str, Any] = Field(default_factory=dict, description="认证配置")


class InterfaceCreate(InterfaceBase):
    """创建接口请求"""
    project_id: str = Field(..., description="所属项目 ID")
    folder_id: Optional[str] = Field(None, description="所属文件夹 ID")
    order: int = Field(default=0, description="排序序号")


class InterfaceUpdate(BaseModel):
    """更新接口请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="接口名称")
    url: Optional[str] = Field(None, min_length=1, max_length=2048, description="接口路径")
    method: Optional[str] = Field(
        None, pattern="^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$", description="HTTP 方法"
    )
    status: Optional[str] = Field(None, description="状态: draft/stable/deprecated")
    description: Optional[str] = Field(None, description="接口描述")
    headers: dict[str, str] | None = Field(None, description="请求头")
    params: dict[str, Any] | None = Field(None, description="Query 参数")
    body: Any | None = Field(None, description="请求体")
    body_type: Optional[str] = Field(None, description="请求体类型")
    cookies: dict[str, str] | None = Field(None, description="Cookies")
    folder_id: Optional[str] = Field(None, description="所属文件夹 ID")
    order: Optional[int] = Field(None, description="排序序号")
    auth_config: dict[str, Any] | None = Field(None, description="认证配置")


class InterfaceResponse(InterfaceBase):
    """接口响应"""
    id: str
    project_id: str
    folder_id: Optional[str]
    order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ============================================
# Folder Schemas
# ============================================


class FolderCreate(BaseModel):
    """Create folder request."""

    project_id: Optional[str] = None  # UUID (从URL路径获取，可选)
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[str] = None  # UUID
    order: int = 0


class FolderResponse(BaseModel):
    """Folder response."""

    id: str
    project_id: str
    name: str
    parent_id: Optional[str]
    order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class FolderMoveRequest(BaseModel):
    """Move folder request."""

    target_parent_id: Optional[str] = None
    target_order: Optional[int] = None


# ============================================
# Interface Move/Copy Schemas
# ============================================


class InterfaceMoveRequest(BaseModel):
    """Move interface request."""

    target_folder_id: Optional[int] = None


class InterfaceCopyRequest(BaseModel):
    """Copy interface request."""

    name: str = Field(..., min_length=1, max_length=255)
    target_folder_id: Optional[int] = None


class ImportFromCurlRequest(BaseModel):
    """从cURL导入接口请求"""

    curl_command: str = Field(..., description="cURL 命令字符串")
    folder_id: Optional[str] = Field(None, description="所属文件夹 ID")
    name: Optional[str] = Field(None, description="接口名称")
