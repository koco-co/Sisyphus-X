"""接口模块 Pydantic Schemas"""

from datetime import datetime
from typing import TYPE_CHECKING, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from app.core.response import PagedData

# HTTP 方法类型
HttpMethod = Literal["GET", "POST", "PUT", "DELETE", "PATCH"]


# ============================================================================
# 目录 Schemas
# ============================================================================


class FolderCreate(BaseModel):
    """创建目录请求"""

    name: str = Field(..., min_length=1, max_length=255, description="目录名称")
    parent_id: str | None = Field(None, description="父目录 ID,为空表示根目录")
    sort_order: int = Field(default=0, ge=0, description="排序顺序")


class FolderUpdate(BaseModel):
    """更新目录请求"""

    name: str | None = Field(None, min_length=1, max_length=255, description="目录名称")
    parent_id: str | None = Field(None, description="父目录 ID,None 表示移动到根目录")
    sort_order: int | None = Field(None, ge=0, description="排序顺序")


class FolderResponse(BaseModel):
    """目录响应 - 支持嵌套结构"""

    id: str
    project_id: str
    parent_id: str | None = None
    name: str
    sort_order: int
    interface_count: int = Field(default=0, description="该目录下的接口数量")
    children: list["FolderResponse"] = Field(default_factory=list, description="子目录列表")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# 接口 Schemas
# ============================================================================


class InterfaceCreate(BaseModel):
    """创建接口请求"""

    name: str = Field(..., min_length=1, max_length=255, description="接口名称")
    method: HttpMethod = Field(..., description="HTTP 方法")
    path: str = Field(..., min_length=1, max_length=500, description="接口路径")
    folder_id: str | None = Field(None, description="所属目录 ID")
    headers: dict[str, Any] | None = Field(default=None, description="请求头")
    params: dict[str, Any] | None = Field(default=None, description="查询参数")
    body: dict[str, Any] | None = Field(default=None, description="请求体")
    description: str | None = Field(None, description="接口描述")
    sort_order: int = Field(default=0, ge=0, description="排序顺序")


class InterfaceUpdate(BaseModel):
    """更新接口请求"""

    name: str | None = Field(None, min_length=1, max_length=255, description="接口名称")
    method: HttpMethod | None = Field(None, description="HTTP 方法")
    path: str | None = Field(None, min_length=1, max_length=500, description="接口路径")
    folder_id: str | None = Field(None, description="所属目录 ID,None 表示移动到根目录")
    headers: dict[str, Any] | None = Field(None, description="请求头")
    params: dict[str, Any] | None = Field(None, description="查询参数")
    body: dict[str, Any] | None = Field(None, description="请求体")
    description: str | None = Field(None, description="接口描述")
    sort_order: int | None = Field(None, ge=0, description="排序顺序")


class InterfaceResponse(BaseModel):
    """接口响应"""

    id: str
    project_id: str
    folder_id: str | None = None
    name: str
    method: str
    path: str
    headers: dict[str, Any] | None = None
    params: dict[str, Any] | None = None
    body: dict[str, Any] | None = None
    description: str | None = None
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterfaceListResponse(BaseModel):
    """接口列表响应 - 兼容 ApiResponse[PagedData[InterfaceResponse]]"""

    code: int = 0
    message: str = "success"
    data: "PagedData[InterfaceResponse]"

    model_config = ConfigDict(from_attributes=True)


# 解决 Forward Reference
FolderResponse.model_rebuild()
