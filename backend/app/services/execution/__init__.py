"""
测试执行模块
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from .test_executor import TestExecutionContext, TestExecutor, TestStepExecutor


@dataclass
class PerformanceMetrics:
    """性能指标"""

    execution_time: float
    memory_usage: int | None = None
    cpu_usage: float | None = None


@dataclass
class StepResult:
    """测试步骤结果"""

    name: str
    status: str
    response_time: float
    error_message: str | None = None
    response_data: dict[str, Any] | None = None


@dataclass
class TestCaseInfo:
    """测试用例信息"""

    id: int
    name: str
    project_id: int
    test_type: str


@dataclass
class Statistics:
    """统计信息"""

    total: int
    passed: int
    failed: int
    skipped: int
    pass_rate: float


@dataclass
class ExecutionResult:
    """执行结果"""

    test_case: TestCaseInfo
    status: str
    statistics: Statistics
    performance: PerformanceMetrics
    steps: list[StepResult]
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


@dataclass
class ExecutionRequest:
    """执行请求"""

    test_case_id: int
    environment: dict[str, Any]
    variables: dict[str, Any] | None = None
    timeout: int | None = None


@dataclass
class TestCaseForm:
    """测试用例表单"""

    id: int
    name: str
    project_id: int
    yaml_content: str


__all__ = [
    "TestExecutor",
    "TestExecutionContext",
    "TestStepExecutor",
    "ExecutionRequest",
    "ExecutionResult",
    "TestCaseInfo",
    "StepResult",
    "Statistics",
    "PerformanceMetrics",
    "TestCaseForm",
]
