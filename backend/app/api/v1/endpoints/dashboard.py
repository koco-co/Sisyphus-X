from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models import Interface, Project, Scenario, TestReport
from app.schemas.dashboard import (
    ActivityItem,
    DashboardAggregate,
    DashboardStats,
    RecentActivities,
    TrendData,
    TrendDataPoint,
)
from app.utils.datetime import utcnow

router = APIRouter()


@router.get("/", response_model=DashboardAggregate)
async def get_dashboard(session: AsyncSession = Depends(get_session)):
    """BE-007: 获取 Dashboard 统计聚合（项目数/接口数/场景数/执行趋势）"""
    # 项目数
    total_projects = (await session.execute(select(func.count()).select_from(Project))).scalar_one() or 0
    # 接口数
    total_interfaces = (await session.execute(select(func.count()).select_from(Interface))).scalar_one() or 0
    # 场景数
    total_scenarios = (await session.execute(select(func.count()).select_from(Scenario))).scalar_one() or 0
    # 执行趋势：最近 7 天按日期的通过/失败统计
    seven_days_ago = utcnow() - timedelta(days=7)
    trend_stmt = (
        select(
            func.date(TestReport.start_time).label("day"),
            func.sum(TestReport.success).label("pass_count"),
            func.sum(TestReport.failed).label("fail_count"),
        )
        .where(TestReport.start_time >= seven_days_ago)
        .group_by(func.date(TestReport.start_time))
        .order_by(func.date(TestReport.start_time))
    )
    rows = (await session.execute(trend_stmt)).all()
    weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    # 键统一为日期字符串（SQLite 返回 str，PostgreSQL 可能返回 date）
    trend_map = {
        (str(r.day) if hasattr(r.day, "isoformat") else r.day): (
            int(r.pass_count or 0),
            int(r.fail_count or 0),
        )
        for r in rows
    }
    execution_trend = []
    for i in range(7):
        d = (utcnow() - timedelta(days=6 - i)).date()
        key = d.isoformat()
        pass_c, fail_c = trend_map.get(key, (0, 0))
        execution_trend.append(
            TrendDataPoint(name=weekdays[i], pass_count=pass_c, fail_count=fail_c)
        )
    return DashboardAggregate(
        project_count=int(total_projects),
        interface_count=int(total_interfaces),
        scenario_count=int(total_scenarios),
        execution_trend=execution_trend,
    )


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(session: AsyncSession = Depends(get_session)):
    """获取 Dashboard 统计数据"""
    # 获取项目总数
    total_projects_stmt = select(func.count()).select_from(Project)
    total_projects = (await session.execute(total_projects_stmt)).scalar() or 0

    # 获取活跃任务数 (假设最近7天内运行过的报告)
    seven_days_ago = utcnow() - timedelta(days=7)
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
    stmt = select(TestReport).order_by(TestReport.created_at.desc()).limit(5)
    result = await session.execute(stmt)
    reports = result.scalars().all()

    activities = []
    for report in reports:
        # 计算相对时间
        time_diff = utcnow() - report.created_at
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
