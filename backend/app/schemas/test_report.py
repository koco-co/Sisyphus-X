"""测试报告 Pydantic Schemas

按照 docs/数据库设计.md §3.16 定义
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TestReportBase(BaseModel):
    """测试报告基础 Schema"""
    status: str  # 'passed' / 'failed' / 'skipped'
    duration: int | None = None  # 耗时（秒）
    result: dict | None = None  # 详细结果
    allure_report_path: str | None = None  # Allure 报告路径


class TestReportCreate(TestReportBase):
    """创建测试报告 Schema"""
    execution_id: str
    scenario_id: str


class TestReportUpdate(BaseModel):
    """更新测试报告 Schema"""
    status: str | None = None
    duration: int | None = None
    result: dict | None = None
    allure_report_path: str | None = None


class TestReportResponse(TestReportBase):
    """测试报告响应 Schema"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    execution_id: str
    scenario_id: str
    created_at: datetime


class TestReportWithDetails(TestReportResponse):
    """包含详细信息的测试报告 Schema"""
    # 可以扩展包含关联的执行和场景信息
    pass
