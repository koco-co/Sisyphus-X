"""报告路由 - REST API 端点

提供报告的查询、导出等 API 接口。
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import PagedData, success
from app.models_new.user import User
from app.modules.report import schemas, service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["报告管理"])


@router.get("")
async def list_reports(
    project_id: str | None = Query(None, description="项目 ID"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取报告列表"""
    report_service = service.ReportService(session)
    items, total = await report_service.list(
        project_id=project_id,
        page=page,
        page_size=page_size,
    )

    return success(
        data=PagedData(
            items=[item.model_dump() for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取报告详情"""
    report_service = service.ReportService(session)
    report = await report_service.get(report_id)

    if not report:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="报告不存在")

    return success(data=report.model_dump())


@router.get("/execution/{execution_id}")
async def get_report_by_execution(
    execution_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """根据执行 ID 获取报告"""
    report_service = service.ReportService(session)
    report = await report_service.get_by_execution(execution_id)

    if not report:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="报告不存在")

    return success(data=report.model_dump())


@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除报告"""
    report_service = service.ReportService(session)
    deleted = await report_service.delete(report_id)

    if not deleted:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="报告不存在")

    return success(message="报告已删除")


@router.get("/{report_id}/export")
async def export_report(
    report_id: str,
    format: str = Query("json", pattern="^(json|html)$", description="导出格式"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """导出报告"""
    report_service = service.ReportService(session)
    report = await report_service.get(report_id)

    if not report:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="报告不存在")

    if format == "json":
        # 返回 JSON 格式
        from fastapi.responses import JSONResponse

        return JSONResponse(
            content=report.model_dump(),
            headers={
                "Content-Disposition": f"attachment; filename=report_{report_id}.json"
            },
        )
    else:
        # 返回 HTML 格式
        html_content = _generate_html_report(report)

        from fastapi.responses import HTMLResponse

        return HTMLResponse(
            content=html_content,
            headers={
                "Content-Disposition": f"attachment; filename=report_{report_id}.html"
            },
        )


def _generate_html_report(report: schemas.ReportDetailResponse) -> str:
    """生成 HTML 格式的报告

    Args:
        report: 报告详情

    Returns:
        HTML 字符串
    """
    # 统计数据
    stats = report.statistics

    # 状态颜色映射
    status_colors = {
        "passed": "#10B981",
        "failed": "#EF4444",
        "skipped": "#F59E0B",
        "pending": "#6B7280",
        "running": "#3B82F6",
    }

    # 场景结果 HTML
    scenarios_html = ""
    for idx, scenario in enumerate(report.scenarios, 1):
        status_color = status_colors.get(scenario.status, "#6B7280")
        steps_html = ""

        for step in scenario.steps:
            step_status_color = status_colors.get(step.status, "#6B7280")
            duration = f"{step.duration_ms}ms" if step.duration_ms else "-"

            steps_html += f"""
                <div class="step" style="border-left: 3px solid {step_status_color};">
                    <div class="step-header">
                        <span class="step-name">{step.step_name}</span>
                        <span class="step-status" style="color: {step_status_color};">{step.status.upper()}</span>
                        <span class="step-duration">{duration}</span>
                    </div>
                    {f'<div class="step-error">{step.error_message}</div>' if step.error_message else ''}
                </div>
            """

        scenarios_html += f"""
            <div class="scenario">
                <div class="scenario-header" style="border-left: 4px solid {status_color};">
                    <span class="scenario-name">{idx}. {scenario.scenario_name}</span>
                    <span class="scenario-status" style="color: {status_color};">{scenario.status.upper()}</span>
                    <span class="scenario-duration">{scenario.duration_ms}ms</span>
                </div>
                <div class="steps">
                    {steps_html}
                </div>
            </div>
        """

    # 完整 HTML
    html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试报告 - {report.plan_name or report.scenario_name or 'Sisyphus'}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0F172A; color: #E2E8F0; padding: 24px; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        .header {{ background: #1E293B; border-radius: 12px; padding: 24px; margin-bottom: 24px; }}
        .header h1 {{ font-size: 24px; font-weight: 600; margin-bottom: 16px; }}
        .header-info {{ display: flex; gap: 24px; flex-wrap: wrap; }}
        .header-info div {{ font-size: 14px; color: #94A3B8; }}
        .header-info span {{ color: #E2E8F0; margin-left: 8px; }}

        .statistics {{ background: #1E293B; border-radius: 12px; padding: 24px; margin-bottom: 24px; }}
        .statistics h2 {{ font-size: 18px; font-weight: 600; margin-bottom: 16px; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }}
        .stat-item {{ background: #334155; border-radius: 8px; padding: 16px; text-align: center; }}
        .stat-value {{ font-size: 28px; font-weight: 700; }}
        .stat-label {{ font-size: 12px; color: #94A3B8; margin-top: 4px; }}
        .stat-passed .stat-value {{ color: #10B981; }}
        .stat-failed .stat-value {{ color: #EF4444; }}
        .stat-skipped .stat-value {{ color: #F59E0B; }}
        .stat-total .stat-value {{ color: #3B82F6; }}
        .stat-rate .stat-value {{ color: #8B5CF6; }}

        .scenarios {{ background: #1E293B; border-radius: 12px; padding: 24px; }}
        .scenarios h2 {{ font-size: 18px; font-weight: 600; margin-bottom: 16px; }}
        .scenario {{ margin-bottom: 16px; }}
        .scenario:last-child {{ margin-bottom: 0; }}
        .scenario-header {{ background: #334155; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }}
        .scenario-name {{ font-weight: 500; flex: 1; }}
        .scenario-status {{ font-size: 12px; font-weight: 600; }}
        .scenario-duration {{ font-size: 12px; color: #94A3B8; }}
        .steps {{ padding-left: 16px; }}
        .step {{ background: #1E293B; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; }}
        .step-header {{ display: flex; align-items: center; gap: 12px; }}
        .step-name {{ flex: 1; font-size: 14px; }}
        .step-status {{ font-size: 11px; font-weight: 600; }}
        .step-duration {{ font-size: 11px; color: #94A3B8; }}
        .step-error {{ margin-top: 8px; font-size: 12px; color: #EF4444; background: rgba(239, 68, 68, 0.1); padding: 8px; border-radius: 4px; }}

        .footer {{ text-align: center; margin-top: 24px; color: #64748B; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>测试报告</h1>
            <div class="header-info">
                <div>计划: <span>{report.plan_name or '-'}</span></div>
                <div>场景: <span>{report.scenario_name or '-'}</span></div>
                <div>环境: <span>{report.environment_name or '-'}</span></div>
                <div>执行时间: <span>{report.started_at or '-'}</span></div>
                <div>完成时间: <span>{report.finished_at or '-'}</span></div>
            </div>
        </div>

        <div class="statistics">
            <h2>执行统计</h2>
            <div class="stats-grid">
                <div class="stat-item stat-total">
                    <div class="stat-value">{stats.total_scenarios}</div>
                    <div class="stat-label">场景总数</div>
                </div>
                <div class="stat-item stat-passed">
                    <div class="stat-value">{stats.passed_scenarios}</div>
                    <div class="stat-label">通过场景</div>
                </div>
                <div class="stat-item stat-failed">
                    <div class="stat-value">{stats.failed_scenarios}</div>
                    <div class="stat-label">失败场景</div>
                </div>
                <div class="stat-item stat-skipped">
                    <div class="stat-value">{stats.skipped_scenarios}</div>
                    <div class="stat-label">跳过场景</div>
                </div>
                <div class="stat-item stat-rate">
                    <div class="stat-value">{stats.pass_rate}%</div>
                    <div class="stat-label">通过率</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{stats.duration_ms}ms</div>
                    <div class="stat-label">执行耗时</div>
                </div>
            </div>
        </div>

        <div class="scenarios">
            <h2>场景详情</h2>
            {scenarios_html}
        </div>

        <div class="footer">
            Generated by Sisyphus-X at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
        </div>
    </div>
</body>
</html>
    """

    return html
