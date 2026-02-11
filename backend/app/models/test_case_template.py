"""
测试用例模板模型 - 功能测试模块
管理测试用例模板(快速生成用例)
"""

from datetime import datetime
from typing import Any

from sqlmodel import JSON, Column, Field, SQLModel


class TestCaseTemplate(SQLModel, table=True):
    """测试用例模板表"""

    __tablename__ = "test_case_templates"

    id: int = Field(primary_key=True)
    name: str
    description: str | None = None
    category: str | None = None  # form_submission/list_query/file_upload等

    # 模板内容
    template_structure: dict[str, Any] = Field(default={}, sa_column=Column(JSON))

    # 统计
    usage_count: int = Field(default=0)

    # 元数据
    is_system: bool = Field(default=False)  # 系统模板/用户自定义
    created_by: int | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        indexes = [
            "category",
        ]
