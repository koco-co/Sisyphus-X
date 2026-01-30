"""
测试用例模板模型 - 功能测试模块
管理测试用例模板(快速生成用例)
"""
from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional, Dict, Any
from datetime import datetime


class TestCaseTemplate(SQLModel, table=True):
    """测试用例模板表"""
    __tablename__ = "test_case_templates"

    id: int = Field(primary_key=True)
    name: str
    description: Optional[str] = None
    category: Optional[str] = None  # form_submission/list_query/file_upload等

    # 模板内容
    template_structure: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))

    # 统计
    usage_count: int = Field(default=0)

    # 元数据
    is_system: bool = Field(default=False)  # 系统模板/用户自定义
    created_by: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        indexes = [
            "category",
        ]
