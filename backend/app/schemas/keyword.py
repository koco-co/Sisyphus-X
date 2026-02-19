"""关键字 Pydantic Schemas

参考文档: docs/数据库设计.md §3.4 关键字表 (keywords)

Schema 说明:
- KeywordBase: 基础 Schema (共享字段)
- KeywordCreate: 创建关键字请求
- KeywordUpdate: 更新关键字请求
- KeywordResponse: 关键字响应
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class KeywordBase(BaseModel):
    """关键字基础 Schema"""

    name: str
    class_name: str
    method_name: str
    description: str | None = None
    code: str
    parameters: str | None = None  # JSON 字符串
    return_type: str | None = None
    is_built_in: bool = False
    is_enabled: bool = True


class KeywordCreate(KeywordBase):
    """创建关键字请求"""

    id: str  # UUID
    project_id: str  # 项目 ID (None 表示内置关键字)


class KeywordUpdate(BaseModel):
    """更新关键字请求"""

    name: str | None = None
    class_name: str | None = None
    method_name: str | None = None
    description: str | None = None
    code: str | None = None
    parameters: str | None = None
    return_type: str | None = None
    is_enabled: bool | None = None


class KeywordResponse(KeywordBase):
    """关键字响应"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str | None = None
    created_at: datetime
    updated_at: datetime
