"""
测试用例模型 - 功能测试模块
管理详细的测试用例（包含步骤和预期结果）
"""

from datetime import datetime, timezone

from sqlmodel import JSON, Column, Field, SQLModel
from typing import Optional, Dict, Any, List


class FunctionalTestCase(SQLModel, table=True):
    """测试用例表 (功能测试模块)"""

    __tablename__ = "test_cases"  # pyright: ignore[reportAssignmentType]
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: str = Field(unique=True, index=True)  # TC-2025-001-001

    # 关联
    requirement_id: int = Field(index=True)
    test_suite_id: Optional[int] = None
    test_point_id: Optional[int] = None

    # 基础信息
    module_name: str
    page_name: str
    title: str
    priority: str  # p0/p1/p2/p3
    case_type: str  # functional/performance/security/compatibility

    # 用例内容
    preconditions: List[str] = Field(default=list, sa_column=Column(JSON))  # 前置条件
    steps: List[Dict[str, Any]] = Field(default=list, sa_column=Column(JSON))  # 测试步骤
    tags: List[str] = Field(default=list, sa_column=Column(JSON))  # 标签数组

    # 元数据
    is_automated: bool = Field(default=False)
    complexity: Optional[str] = None  # low/medium/high
    estimated_time: int = Field(default=0)  # 预估执行时间(分钟)

    # AI生成信息
    is_ai_generated: bool = Field(default=False)
    ai_model: Optional[str] = None

    # 状态
    status: str = Field(default="draft")  # draft/review/approved/cancelled

    # 创建信息
    created_by: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: int = Field(default=1)

    class Config:
        indexes = [
            "case_id",
            ["requirement_id", "module_name", "page_name"],
            "priority",
        ]
