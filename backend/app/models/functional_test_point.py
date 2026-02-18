"""
测试点模型 - 功能测试模块
管理测试点（测试用例的抽象描述）
"""

from datetime import datetime

from sqlmodel import Field, SQLModel
from typing import Optional, Dict, Any, List


class TestPoint(SQLModel, table=True):
    """测试点表"""

    __tablename__ = "test_points"  # pyright: ignore[reportAssignmentType]

    id: Optional[int] = Field(default=None, primary_key=True)
    requirement_id: int = Field(index=True)  # 关联需求
    category: str  # functional/performance/security/compatibility/usability
    sub_category: Optional[str] = None  # 正常流程/异常流程/边界值

    title: str
    description: Optional[str] = None
    priority: str  # p0/p1/p2/p3
    risk_level: Optional[str] = None  # high/medium/low

    # AI生成信息
    is_ai_generated: bool = Field(default=True)
    confidence_score: Optional[float] = None  # 0.00-1.00

    # 状态
    status: str = Field(default="draft")  # draft/approved/rejected

    created_at: datetime = Field(default_factory=datetime.utcnow())
    updated_at: datetime = Field(default_factory=datetime.utcnow())

    class Config:
        indexes = [
            ["requirement_id", "category", "priority"],
        ]
