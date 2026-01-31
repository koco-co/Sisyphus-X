"""
测试执行模块
"""
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

from .test_executor import TestExecutor, TestExecutionContext, TestStepExecutor


@dataclass
class PerformanceMetrics:
    """性能指标"""
    execution_time: float
    memory_usage: Optional[int] = None
    cpu_usage: Optional[float] = None


@dataclass
class StepResult:
    """测试步骤结果"""
    name: str
    status: str
    response_time: float
    error_message: Optional[str] = None
    response_data: Optional[Dict[str, Any]] = None


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
    steps: List[StepResult]
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@dataclass
class ExecutionRequest:
    """执行请求"""
    test_case_id: int
    environment: Dict[str, Any]
    variables: Optional[Dict[str, Any]] = None
    timeout: Optional[int] = None


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
