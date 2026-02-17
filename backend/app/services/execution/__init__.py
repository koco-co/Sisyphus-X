"""
测试执行模块
"""

from typing import Any, Optional

from pydantic import BaseModel, Field

from .executor_core import TestExecutionContext, TestExecutor, TestStepExecutor


class PerformanceMetrics(BaseModel):
    """性能指标"""

    total_time: float = 0
    dns_time: Optional[float] = None
    tcp_time: Optional[float] = None
    tls_time: Optional[float] = None
    server_time: Optional[float] = None
    download_time: Optional[float] = None
    size: Optional[int] = None


class StepResult(BaseModel):
    """测试步骤结果"""

    name: str
    status: str
    start_time: str = ""
    end_time: str = ""
    duration: float = 0
    error: Optional[str] = None
    performance: Optional[PerformanceMetrics] = None
    response: dict[str, Any] | None = None


class TestCaseInfo(BaseModel):
    """测试用例信息"""

    id: Optional[int] = None
    name: str
    status: str = "unknown"
    start_time: str = ""
    end_time: str = ""
    duration: float = 0
    project_id: Optional[int] = None
    test_type: Optional[str] = None


class Statistics(BaseModel):
    """统计信息"""

    total_steps: int = 0
    passed_steps: int = 0
    failed_steps: int = 0
    skipped_steps: int = 0
    pass_rate: float = 0.0


class ExecutionResult(BaseModel):
    """执行结果"""

    success: bool
    test_case: TestCaseInfo
    steps: list[StepResult] = Field(default_factory=list)
    statistics: Statistics = Field(default_factory=Statistics)
    final_variables: dict[str, Any] = Field(default_factory=dict)
    performance_metrics: dict[str, Any] | None = None
    error: Optional[str] = None
    duration: Optional[float] = None


class ExecutionRequest(BaseModel):
    """执行请求"""

    yaml_content: str
    output_format: str = "json"
    base_url: Optional[str] = None
    variables: dict[str, Any] | None = None
    dynamic_keywords: list[str] | None = None
    timeout: Optional[int] = None


class TestCaseForm(BaseModel):
    """测试用例表单"""

    id: Optional[int] = None
    name: str
    project_id: Optional[int] = None
    yaml_content: Optional[str] = None
    description: Optional[str] = None
    variables: dict[str, Any] = Field(default_factory=dict)
    config: dict[str, Any] = Field(default_factory=dict)
    steps: list[dict[str, Any]] = Field(default_factory=list)


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
