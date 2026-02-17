from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, func, select

from app.core.db import get_session
from app.models import Project, TestReport
from app.schemas.dashboard import (
    ActivityItem,
    DashboardStats,
    RecentActivities,
    TrendData,
    TrendDataPoint,
)

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(session: AsyncSession = Depends(get_session)):
    """获取 Dashboard 统计数据"""
    # 获取项目总数
    total_projects_stmt = select(func.count()).select_from(Project)
    total_projects = (await session.execute(total_projects_stmt)).scalar() or 0

    # 获取活跃任务数 (假设最近7天内运行过的报告)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_tasks_stmt = (
        select(func.count()).select_from(TestReport).where(TestReport.created_at >= seven_days_ago)
    )
    active_tasks = (await session.execute(active_tasks_stmt)).scalar() or 0

    # 计算测试覆盖率 (成功率)
    success_stmt = (
        select(func.count()).select_from(TestReport).where(TestReport.status == "success")
    )
    total_stmt = select(func.count()).select_from(TestReport)

    success_count = (await session.execute(success_stmt)).scalar() or 0
    total_count = (await session.execute(total_stmt)).scalar() or 1  # 避免除以0

    test_coverage = int((success_count / total_count) * 100) if total_count > 0 else 0

    # 计算平均执行时长 (这里简化处理，返回固定值)
    avg_duration = "1.2s"

    return DashboardStats(
        active_tasks=active_tasks,
        test_coverage=test_coverage,
        total_projects=total_projects,
        avg_duration=avg_duration,
    )


@router.get("/trend", response_model=TrendData)
async def get_test_trend(session: AsyncSession = Depends(get_session)):
    """获取测试执行趋势数据 (最近7天)"""
    # Mock 数据 - 实际应该从数据库统计
    # TODO: 实现从 TestReport 表按日期聚合统计
    trend_data = [
        TrendDataPoint(name="周一", pass_count=40, fail_count=24),
        TrendDataPoint(name="周二", pass_count=30, fail_count=13),
        TrendDataPoint(name="周三", pass_count=55, fail_count=18),
        TrendDataPoint(name="周四", pass_count=47, fail_count=12),
        TrendDataPoint(name="周五", pass_count=68, fail_count=15),
        TrendDataPoint(name="周六", pass_count=35, fail_count=8),
        TrendDataPoint(name="周日", pass_count=42, fail_count=10),
    ]

    return TrendData(data=trend_data)


@router.get("/activities", response_model=RecentActivities)
async def get_recent_activities(session: AsyncSession = Depends(get_session)):
    """获取最近活动记录"""
    # 获取最近5条测试报告
    stmt = select(TestReport).order_by(col(TestReport.created_at).desc()).limit(5)
    result = await session.execute(stmt)
    reports = result.scalars().all()

    activities = []
    for report in reports:
        # 计算相对时间
        time_diff = datetime.now(timezone.utc) - report.created_at
        if time_diff.seconds < 60:
            time_str = f"{time_diff.seconds} 秒前"
        elif time_diff.seconds < 3600:
            time_str = f"{time_diff.seconds // 60} 分钟前"
        else:
            time_str = f"{time_diff.seconds // 3600} 小时前"

        if report.id is None:
            continue
        activities.append(
            ActivityItem(
                id=report.id,
                name=report.name,
                status="passed" if report.status == "success" else "failed",
                time=time_str,
                trigger="自动触发",  # TODO: 从测试计划关联获取触发方式
            )
        )

    return RecentActivities(activities=activities)
