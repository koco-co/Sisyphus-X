"""
测试执行模块
"""

from typing import Any

from pydantic import BaseModel, Field

from .executor_core import TestExecutionContext, TestExecutor, TestStepExecutor


class PerformanceMetrics(BaseModel):
    """性能指标"""

    total_time: float = 0
    dns_time: float | None = None
    tcp_time: float | None = None
    tls_time: float | None = None
    server_time: float | None = None
    download_time: float | None = None
    size: int | None = None


class StepResult(BaseModel):
    """测试步骤结果"""

    name: str
    status: str
    start_time: str = ""
    end_time: str = ""
    duration: float = 0
    error: str | None = None
    performance: PerformanceMetrics | None = None
    response: dict[str, Any] | None = None


class TestCaseInfo(BaseModel):
    """测试用例信息"""

    id: int | None = None
    name: str
    status: str = "unknown"
    start_time: str = ""
    end_time: str = ""
    duration: float = 0
    project_id: int | None = None
    test_type: str | None = None


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
    error: str | None = None
    duration: float | None = None


class ExecutionRequest(BaseModel):
    """执行请求"""

    yaml_content: str
    output_format: str = "json"
    base_url: str | None = None
    variables: dict[str, Any] | None = None
    dynamic_keywords: list[str] | None = None
    timeout: int | None = None


class TestCaseForm(BaseModel):
    """测试用例表单"""

    id: int | None = None
    name: str
    project_id: int | None = None
    yaml_content: str | None = None
    description: str | None = None
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
