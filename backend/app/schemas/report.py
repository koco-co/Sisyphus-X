from datetime import datetime

from pydantic import BaseModel

# === 测试报告相关 Schema ===


class ReportDetailResponse(BaseModel):
    """报告详情响应"""

    id: str
    report_id: str
    node_id: str
    node_name: str
    status: str
    request_data: dict | None = None
    response_data: dict | None = None
    error_msg: str | None = None
    elapsed: float
    created_at: datetime


class ReportResponse(BaseModel):
    """报告响应"""

    id: str
    scenario_id: str | None = None
    name: str
    status: str
    total: int
    success: int
    failed: int
    duration: str
    start_time: datetime
    end_time: datetime | None = None
    created_at: datetime


class ReportWithDetails(ReportResponse):
    """报告及其详情"""

    details: list[ReportDetailResponse] = []
