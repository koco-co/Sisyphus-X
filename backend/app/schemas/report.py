from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

# === 测试报告相关 Schema ===

class ReportDetailResponse(BaseModel):
    """报告详情响应"""
    id: int
    report_id: int
    node_id: str
    node_name: str
    status: str
    request_data: Optional[Dict] = None
    response_data: Optional[Dict] = None
    error_msg: Optional[str] = None
    elapsed: float
    created_at: datetime

class ReportResponse(BaseModel):
    """报告响应"""
    id: int
    scenario_id: Optional[int] = None
    name: str
    status: str
    total: int
    success: int
    failed: int
    duration: str
    start_time: datetime
    end_time: Optional[datetime] = None
    created_at: datetime

class ReportWithDetails(ReportResponse):
    """报告及其详情"""
    details: List[ReportDetailResponse] = []
