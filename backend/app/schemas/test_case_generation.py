"""
测试用例生成相关Schemas - 功能测试模块
"""

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class CaseType(str, Enum):  # noqa: UP042
    """用例类型"""

    FUNCTIONAL = "functional"
    PERFORMANCE = "performance"
    SECURITY = "security"
    COMPATIBILITY = "compatibility"


class Complexity(str, Enum):  # noqa: UP042
    """复杂度"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TestStep(BaseModel):
    """测试步骤"""

    step_number: int = Field(..., description="步骤序号")
    action: str = Field(..., description="操作动作")
    expected_result: str = Field(..., description="预期结果")


class TestCaseGenerate(BaseModel):
    """生成测试用例请求"""

    requirement_id: int = Field(..., description="需求ID")
    test_point_ids: list[int] = Field(..., description="测试点ID列表")
    module_name: str = Field(..., description="模块名称")
    page_name: str = Field(..., description="页面名称")
    case_type: CaseType = Field(default=CaseType.FUNCTIONAL, description="用例类型")
    include_knowledge: bool = Field(default=True, description="是否使用知识库")


class GeneratedTestCase(BaseModel):
    """生成的测试用例"""

    module_name: str
    page_name: str
    title: str
    priority: str
    case_type: str
    preconditions: list[str]
    steps: list[TestStep]
    tags: list[str]
    estimated_time: int = Field(description="预估执行时间(分钟)")
    complexity: Optional[str] = None


class GeneratedTestCases(BaseModel):
    """生成的测试用例集合"""

    requirement_id: int
    test_cases: list[GeneratedTestCase]
    total_count: int
    generation_metadata: dict[str, Any] = Field(default_factory=dict)


class TestCaseGenerationResult(BaseModel):
    """测试用例生成结果"""

    success: bool
    message: str
    data: Optional[GeneratedTestCases] = None
    error: Optional[str] = None
