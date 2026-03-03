from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from app.core.response import PagedData


class ProjectCreate(BaseModel):
    """创建项目请求"""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class ProjectUpdate(BaseModel):
    """更新项目请求"""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None


class ProjectResponse(BaseModel):
    """项目响应"""

    id: UUID
    name: str
    description: str | None
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    """项目列表响应 - 兼容 ApiResponse[PagedData[ProjectResponse]]"""

    code: int = 0
    message: str = "success"
    data: "PagedData[ProjectResponse]"

    model_config = ConfigDict(from_attributes=True)
