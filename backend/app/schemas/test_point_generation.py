"""
测试点生成相关Schemas - 功能测试模块
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class TestPointCategory(str, Enum):
    """测试点分类"""
    FUNCTIONAL = "functional"  # 功能测试
    PERFORMANCE = "performance"  # 性能测试
    SECURITY = "security"  # 安全测试
    COMPATIBILITY = "compatibility"  # 兼容性测试
    USABILITY = "usability"  # 易用性测试


class TestPointSubCategory(str, Enum):
    """测试点子分类"""
    NORMAL_FLOW = "正常流程"
    ERROR_FLOW = "异常流程"
    BOUNDARY = "边界值"
    DATA_VALIDATION = "数据验证"


class TestPointBase(BaseModel):
    """测试点基础Schema"""
    category: TestPointCategory = Field(..., description="测试分类")
    sub_category: Optional[str] = Field(None, description="子分类")
    title: str = Field(..., description="测试点标题")
    description: Optional[str] = Field(None, description="详细描述")
    priority: str = Field(..., description="优先级：p0/p1/p2/p3")
    risk_level: Optional[str] = Field(None, description="风险级别：high/medium/low")


class TestPointGenerate(BaseModel):
    """生成测试点请求"""
    requirement_id: int = Field(..., description="需求ID")
    requirement_text: str = Field(..., description="需求文档内容")
    categories: List[TestPointCategory] = Field(
        default=[TestPointCategory.FUNCTIONAL],
        description="要生成的测试点分类"
    )
    include_knowledge: bool = Field(
        default=True,
        description="是否使用历史用例知识库"
    )


class GeneratedTestPoints(BaseModel):
    """生成的测试点响应"""
    requirement_id: int
    test_points: List[TestPointBase]
    total_count: int
    generation_metadata: Dict[str, Any] = Field(default_factory=dict)


class TestPointGenerationResult(BaseModel):
    """测试点生成结果"""
    success: bool
    message: str
    data: Optional[GeneratedTestPoints] = None
    error: Optional[str] = None
