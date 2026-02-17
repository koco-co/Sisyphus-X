"""关键字 Pydantic Schemas

参考文档: docs/数据库设计.md §3.4 关键字表 (keywords)

Schema 说明:
- KeywordBase: 基础 Schema (共享字段)
- KeywordCreate: 创建关键字请求
- KeywordUpdate: 更新关键字请求
- KeywordResponse: 关键字响应
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class KeywordBase(BaseModel):
    """关键字基础 Schema"""
    name: str
    class_name: str
    method_name: str
    description: Optional[str] = None
    code: str
    parameters: Optional[str] = None  # JSON 字符串
    return_type: Optional[str] = None
    is_built_in: bool = False
    is_enabled: bool = True


class KeywordCreate(KeywordBase):
    """创建关键字请求"""
    id: str  # UUID
    project_id: str  # 项目 ID (None 表示内置关键字)


class KeywordUpdate(BaseModel):
    """更新关键字请求"""
    name: Optional[str] = None
    class_name: Optional[str] = None
    method_name: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None
    parameters: Optional[str] = None
    return_type: Optional[str] = None
    is_enabled: Optional[bool] = None


class KeywordResponse(KeywordBase):
    """关键字响应"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
