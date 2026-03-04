"""关键字 Schemas - Pydantic 模型定义

定义关键字相关的请求和响应模型。
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

# ============ 关键字类型 ============

# 支持的关键字类型
KEYWORD_TYPES = [
    "request",  # 发送请求
    "assertion",  # 断言
    "extract",  # 提取变量
    "sql",  # 数据库操作
    "wait",  # 等待
    "custom",  # 自定义操作
]


# ============ 关键字 Schemas ============


class KeywordCreate(BaseModel):
    """创建关键字请求"""

    keyword_type: str = Field(..., min_length=1, max_length=100, description="关键字类型")
    name: str = Field(..., min_length=1, max_length=255, description="关键字名称")
    method_name: str = Field(..., min_length=1, max_length=100, description="方法名称")
    code: str | None = Field(default=None, description="代码内容")
    params_schema: dict[str, Any] | None = Field(
        default=None, description="参数 schema"
    )
    is_enabled: bool = Field(default=True, description="是否启用")


class KeywordUpdate(BaseModel):
    """更新关键字请求"""

    keyword_type: str | None = Field(
        default=None, min_length=1, max_length=100, description="关键字类型"
    )
    name: str | None = Field(
        default=None, min_length=1, max_length=255, description="关键字名称"
    )
    method_name: str | None = Field(
        default=None, min_length=1, max_length=100, description="方法名称"
    )
    code: str | None = Field(default=None, description="代码内容")
    params_schema: dict[str, Any] | None = Field(
        default=None, description="参数 schema"
    )
    is_enabled: bool | None = Field(default=None, description="是否启用")


class KeywordResponse(BaseModel):
    """关键字响应"""

    id: UUID
    keyword_type: str
    name: str
    method_name: str
    code: str | None
    params_schema: dict[str, Any] | None
    is_builtin: bool
    is_enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class KeywordBriefResponse(BaseModel):
    """关键字简要响应"""

    id: UUID
    keyword_type: str
    name: str
    method_name: str
    is_builtin: bool
    is_enabled: bool

    model_config = {"from_attributes": True}


class KeywordListResponse(BaseModel):
    """关键字列表响应"""

    items: list[KeywordResponse]
    total: int


class KeywordTypeResponse(BaseModel):
    """关键字类型响应"""

    type: str
    name: str
    description: str
