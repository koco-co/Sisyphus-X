"""测试报告接口 - TASK-025

提供测试报告的查询、统计、导出等功能
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, func, select

from app.core.db import get_session
from app.models import TestReport, TestReportDetail
from app.schemas.pagination import PageResponse
from app.schemas.report import ReportResponse, ReportWithDetails
from app.utils.rich_logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.get("/", response_model=PageResponse[ReportResponse])
async def list_reports(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(10, ge=1, le=100, description="每页数量"),
    scenario_id: int | None = Query(None, description="场景ID筛选"),
    status: str | None = Query(None, description="状态筛选: success/failed/running"),
    session: AsyncSession = Depends(get_session),
):
    """获取测试报告列表（分页）

    支持按场景ID和状态筛选，按创建时间倒序排列
    """
    try:
        skip = (page - 1) * size
        statement = select(TestReport)
        count_statement = select(func.count()).select_from(TestReport)

        # 场景ID筛选
        if scenario_id is not None:
            statement = statement.where(col(TestReport.scenario_id) == scenario_id)
            count_statement = count_statement.where(col(TestReport.scenario_id) == scenario_id)

        # 状态筛选
        if status is not None:
            statement = statement.where(col(TestReport.status) == status)
            count_statement = count_statement.where(col(TestReport.status) == status)

        # 按创建时间倒序
        statement = statement.order_by(col(TestReport.created_at).desc())

        # 执行查询
        total = int((await session.execute(count_statement)).scalar_one() or 0)
        result = await session.execute(statement.offset(skip).limit(size))
        reports = list(result.scalars().all())

        pages = (total + size - 1) // size

        logger.info(f"获取测试报告列表成功: page={page}, size={size}, total={total}")
        return PageResponse(items=reports, total=total, page=page, size=size, pages=pages)

    except Exception as e:
        logger.error(f"获取测试报告列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取报告列表失败: {str(e)}")


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    session: AsyncSession = Depends(get_session),
):
    """获取单个测试报告的概要信息"""
    try:
        report = await session.get(TestReport, report_id)
        if not report:
            raise HTTPException(status_code=404, detail=f"报告 ID {report_id} 不存在")

        logger.info(f"获取测试报告成功: id={report_id}")
        return report

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取测试报告失败: id={report_id}, error={e}")
        raise HTTPException(status_code=500, detail=f"获取报告失败: {str(e)}")


@router.get("/{report_id}/details", response_model=ReportWithDetails)
async def get_report_with_details(
    report_id: int,
    session: AsyncSession = Depends(get_session),
):
    """获取测试报告及其详细执行记录"""
    try:
        # 检查报告是否存在
        report = await session.get(TestReport, report_id)
        if not report:
            raise HTTPException(status_code=404, detail=f"报告 ID {report_id} 不存在")

        # 获取详情记录
        stmt = select(TestReportDetail).where(
            col(TestReportDetail.report_id) == report_id
        ).order_by(col(TestReportDetail.created_at).asc())
        result = await session.execute(stmt)
        details = list(result.scalars().all())

        # 组装响应
        response_data = {
            **report.model_dump(),
            "details": details,
        }

        logger.info(f"获取测试报告详情成功: id={report_id}, details_count={len(details)}")
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取测试报告详情失败: id={report_id}, error={e}")
        raise HTTPException(status_code=500, detail=f"获取报告详情失败: {str(e)}")


@router.get("/{report_id}/statistics")
async def get_report_statistics(
    report_id: int,
    session: AsyncSession = Depends(get_session),
):
    """获取测试报告的统计信息

    返回通过率、失败数、跳过数等统计数据
    """
    try:
        # 检查报告是否存在
        report = await session.get(TestReport, report_id)
        if not report:
            raise HTTPException(status_code=404, detail=f"报告 ID {report_id} 不存在")

        # 统计各状态的详情数量
        count_stmt = select(
            TestReportDetail.status,
            func.count()  # 使用 count(*) 而不是 count(id)
        ).where(
            col(TestReportDetail.report_id) == report_id
        ).group_by(TestReportDetail.status)

        result = await session.execute(count_stmt)
        status_counts = {row[0]: row[1] for row in result.all()}

        # 计算统计数据
        total = report.total or 0
        success = status_counts.get("success", 0)
        failed = status_counts.get("failed", 0)
        skipped = status_counts.get("skipped", 0)
        pass_rate = (success / total * 100) if total > 0 else 0.0

        statistics = {
            "report_id": report_id,
            "total": total,
            "success": success,
            "failed": failed,
            "skipped": skipped,
            "pass_rate": round(pass_rate, 2),
            "status_counts": status_counts,
        }

        logger.info(f"获取测试报告统计成功: id={report_id}, pass_rate={pass_rate}%")
        return statistics

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取测试报告统计失败: id={report_id}, error={e}")
        raise HTTPException(status_code=500, detail=f"获取报告统计失败: {str(e)}")


@router.get("/{report_id}/allure")
async def get_allure_report_url(
    report_id: int,
    session: AsyncSession = Depends(get_session),
):
    """获取 Allure 报告的访问 URL

    返回 Allure 报告的访问路径（如果已生成）
    """
    try:
        # 检查报告是否存在
        report = await session.get(TestReport, report_id)
        if not report:
            raise HTTPException(status_code=404, detail=f"报告 ID {report_id} 不存在")

        # TODO: 实现 Allure 报告生成逻辑
        # 当前返回占位符 URL，实际需要根据 Allure 报告生成逻辑调整
        allure_url = f"/allure-reports/report-{report_id}/index.html"

        logger.info(f"获取 Allure 报告 URL: id={report_id}, url={allure_url}")
        return {
            "report_id": report_id,
            "allure_url": allure_url,
            "note": "Allure 报告生成功能待实现",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取 Allure 报告 URL 失败: id={report_id}, error={e}")
        raise HTTPException(status_code=500, detail=f"获取 Allure 报告失败: {str(e)}")


@router.post("/{report_id}/export")
async def export_report(
    report_id: int,
    format: str = Query(..., description="导出格式: pdf/excel"),
    session: AsyncSession = Depends(get_session),
):
    """导出测试报告

    支持导出为 PDF 或 Excel 格式
    """
    try:
        # 检查报告是否存在
        report = await session.get(TestReport, report_id)
        if not report:
            raise HTTPException(status_code=404, detail=f"报告 ID {report_id} 不存在")

        # TODO: 实现报告导出逻辑
        # 当前返回占位符，实际需要实现 PDF/Excel 生成
        if format not in ["pdf", "excel"]:
            raise HTTPException(status_code=400, detail="不支持的导出格式，仅支持 pdf 或 excel")

        logger.info(f"导出测试报告: id={report_id}, format={format}")
        return {
            "report_id": report_id,
            "format": format,
            "download_url": f"/api/v1/reports/{report_id}/download?format={format}",
            "note": "报告导出功能待实现",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导出测试报告失败: id={report_id}, error={e}")
        raise HTTPException(status_code=500, detail=f"导出报告失败: {str(e)}")


@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    session: AsyncSession = Depends(get_session),
):
    """删除测试报告及其详细记录"""
    try:
        # 检查报告是否存在
        report = await session.get(TestReport, report_id)
        if not report:
            raise HTTPException(status_code=404, detail=f"报告 ID {report_id} 不存在")

        # 先删除关联的详情记录
        details_stmt = select(TestReportDetail).where(
            col(TestReportDetail.report_id) == report_id
        )
        details_result = await session.execute(details_stmt)
        details = details_result.scalars().all()

        for detail in details:
            await session.delete(detail)

        # 删除报告
        await session.delete(report)
        await session.commit()

        logger.info(f"删除测试报告成功: id={report_id}, deleted_details={len(details)}")
        return {"deleted": report_id, "deleted_details": len(details)}

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"删除测试报告失败: id={report_id}, error={e}")
        raise HTTPException(status_code=500, detail=f"删除报告失败: {str(e)}")
