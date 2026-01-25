from typing import List, Dict, Any
from pydantic import BaseModel

# === Dashboard 统计相关 Schema ===

class DashboardStats(BaseModel):
    """Dashboard 统计数据"""
    active_tasks: int  # 活跃任务数
    test_coverage: int  # 测试覆盖率(百分比)
    total_projects: int  # 项目总数
    avg_duration: str  # 平均执行时长

class TrendDataPoint(BaseModel):
    """趋势数据点"""
    name: str  # 日期标签
    pass_count: int  # 通过数
    fail_count: int  # 失败数

class TrendData(BaseModel):
    """测试执行趋势数据"""
    data: List[TrendDataPoint]

class ActivityItem(BaseModel):
    """活动记录项"""
    id: int
    name: str  # 活动名称
    status: str  # passed/failed
    time: str  # 相对时间描述
    trigger: str  # 触发方式

class RecentActivities(BaseModel):
    """最近活动列表"""
    activities: List[ActivityItem]
