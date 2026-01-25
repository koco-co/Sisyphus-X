from typing import Optional, Dict, Any
from datetime import datetime
from sqlmodel import SQLModel, Field, Column, JSON

class TestReport(SQLModel, table=True):
    """测试报告主表 - 存储测试执行的总体信息"""
    __tablename__ = "testreport"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    scenario_id: Optional[int] = Field(default=None, foreign_key="testscenario.id")  # 关联的测试场景
    name: str  # 报告名称
    status: str  # 'success', 'failed', 'running'
    total: int = 0  # 总步骤数
    success: int = 0  # 成功步骤数
    failed: int = 0  # 失败步骤数
    duration: str = "0s"  # 执行时长(格式化后的字符串, 如 "12m 30s")
    start_time: datetime = Field(default_factory=datetime.utcnow)  # 开始时间
    end_time: Optional[datetime] = None  # 结束时间
    created_at: datetime = Field(default_factory=datetime.utcnow)  # 创建时间

class TestReportDetail(SQLModel, table=True):
    """测试报告详情表 - 存储每个节点的执行详情"""
    __tablename__ = "testreportdetail"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    report_id: int = Field(foreign_key="testreport.id")  # 关联的报告ID
    node_id: str  # 节点ID
    node_name: str  # 节点名称
    status: str  # 'success', 'failed', 'skipped'
    request_data: Optional[Dict] = Field(default=None, sa_column=Column(JSON))  # 请求数据
    response_data: Optional[Dict] = Field(default=None, sa_column=Column(JSON))  # 响应数据
    error_msg: Optional[str] = None  # 错误信息
    elapsed: float = 0.0  # 执行耗时(秒)
    created_at: datetime = Field(default_factory=datetime.utcnow)
