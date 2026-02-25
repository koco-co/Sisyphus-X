"""文档中心 Pydantic Schema - 用于 API 请求/响应校验"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentRead(BaseModel):
    """文档响应 Schema（从 ORM 读取）"""

    model_config = ConfigDict(from_attributes=True)

    id: int | None
    project_id: str
    title: str
    doc_type: str
    content: str
    parent_id: int | None
    order_index: int
    is_published: bool
    created_by: str | None
    created_at: datetime
    updated_at: datetime


class DocumentVersionRead(BaseModel):
    """文档版本响应 Schema"""

    model_config = ConfigDict(from_attributes=True)

    id: int | None
    document_id: int
    version: int
    content: str
    change_note: str | None
    created_by: str | None
    created_at: datetime


class DocumentCreate(BaseModel):
    """创建文档请求"""

    project_id: str
    title: str
    doc_type: str = "operation"
    content: str = ""
    parent_id: int | None = None
    order_index: int = 0
    is_published: bool = False
    created_by: str | None = None


class DocumentUpdate(BaseModel):
    """更新文档请求"""

    title: str | None = None
    doc_type: str | None = None
    content: str | None = None
    parent_id: int | None = None
    order_index: int | None = None
    is_published: bool | None = None
    change_note: str | None = None
