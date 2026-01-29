"""
执行器适配层 - 数据模型定义

本模块定义了执行器适配层的所有数据结构，包括：
- ExecutionRequest: 执行请求
- ExecutionResult: 执行结果
- TestCaseForm: 测试用例表单数据
- TestStep: 测试步骤
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ExecutionRequest(BaseModel):
    """执行请求"""
    yaml_content: str = Field(..., description="YAML内容")
    base_url: Optional[str] = Field(None, description="基础URL")
    variables: Dict[str, Any] = Field(default_factory=dict, description="变量")
    dynamic_keywords: List[str] = Field(default_factory=list, description="动态关键字代码列表")
    timeout: Optional[int] = Field(300, description="超时时间（秒）")
    environment: Optional[str] = Field(None, description="环境名称")
    output_format: str = Field("json", description="输出格式")


class PerformanceMetrics(BaseModel):
    """性能指标"""
    total_time: float = Field(..., description="总耗时（毫秒）")
    dns_time: Optional[float] = Field(None, description="DNS解析时间（毫秒）")
    tcp_time: Optional[float] = Field(None, description="TCP连接时间（毫秒）")
    tls_time: Optional[float] = Field(None, description="TLS握手时间（毫秒）")
    server_time: Optional[float] = Field(None, description="服务器处理时间（毫秒）")
    download_time: Optional[float] = Field(None, description="下载时间（毫秒）")
    size: Optional[int] = Field(None, description="响应大小（字节）")


class StepResult(BaseModel):
    """步骤执行结果"""
    name: str = Field(..., description="步骤名称")
    status: str = Field(..., description="状态: success/failed/skipped")
    start_time: str = Field(..., description="开始时间")
    end_time: str = Field(..., description="结束时间")
    duration: float = Field(..., description="耗时（秒）")
    error: Optional[str] = Field(None, description="错误信息")
    performance: Optional[PerformanceMetrics] = Field(None, description="性能指标")
    response: Optional[Dict[str, Any]] = Field(None, description="响应数据")


class TestCaseInfo(BaseModel):
    """测试用例信息"""
    name: str = Field(..., description="测试用例名称")
    status: str = Field(..., description="状态: passed/failed")
    start_time: str = Field(..., description="开始时间")
    end_time: str = Field(..., description="结束时间")
    duration: float = Field(..., description="总耗时（秒）")


class Statistics(BaseModel):
    """统计信息"""
    total_steps: int = Field(..., description="总步骤数")
    passed_steps: int = Field(..., description="通过步骤数")
    failed_steps: int = Field(..., description="失败步骤数")
    skipped_steps: int = Field(..., description="跳过步骤数")
    pass_rate: float = Field(..., description="通过率")


class ExecutionResult(BaseModel):
    """执行结果"""
    success: bool = Field(..., description="是否成功")
    test_case: TestCaseInfo = Field(..., description="测试用例信息")
    steps: List[StepResult] = Field(default_factory=list, description="步骤结果列表")
    statistics: Statistics = Field(..., description="统计信息")
    final_variables: Dict[str, Any] = Field(default_factory=dict, description="最终变量")
    performance_metrics: Optional[Dict[str, Any]] = Field(None, description="性能指标")
    error: Optional[str] = Field(None, description="错误信息")
    duration: Optional[float] = Field(None, description="执行耗时（秒）")

    class Config:
        """Pydantic配置"""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class TestCaseForm(BaseModel):
    """测试用例表单数据"""
    name: str = Field(..., description="测试用例名称")
    description: Optional[str] = Field(None, description="描述")
    project_id: int = Field(..., description="项目ID")
    environment_id: Optional[int] = Field(None, description="环境ID")
    steps: List[Dict[str, Any]] = Field(default_factory=list, description="测试步骤列表")
    variables: Dict[str, Any] = Field(default_factory=dict, description="变量")
    config: Dict[str, Any] = Field(default_factory=dict, description="配置")


class TestStep(BaseModel):
    """测试步骤"""
    id: str = Field(..., description="步骤ID")
    type: str = Field(..., description="步骤类型: request/database/wait/condition/keyword")
    name: str = Field(..., description="步骤名称")
    params: Dict[str, Any] = Field(default_factory=dict, description="步骤参数")
    validations: Optional[List[Dict[str, Any]]] = Field(None, description="验证规则")
    skip_if: Optional[str] = Field(None, description="跳过条件")
    only_if: Optional[str] = Field(None, description="执行条件")


class ValidationResult(BaseModel):
    """验证结果"""
    valid: bool = Field(..., description="是否有效")
    error: Optional[str] = Field(None, description="错误信息")


# 导出所有公共接口
__all__ = [
    "ExecutionRequest",
    "ExecutionResult",
    "TestCaseForm",
    "TestStep",
    "PerformanceMetrics",
    "StepResult",
    "TestCaseInfo",
    "Statistics",
    "ValidationResult",
]
