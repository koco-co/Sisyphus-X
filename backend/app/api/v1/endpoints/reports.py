from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, func, select

from app.core.db import get_session
from app.models import TestReport, TestReportDetail
from app.schemas.pagination import PageResponse
from app.schemas.report import ReportDetailResponse, ReportResponse

router = APIRouter()


@router.get("/", response_model=PageResponse[ReportResponse])
async def list_reports(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    scenario_id: int | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    """获取测试报告列表 (分页)"""
    skip = (page - 1) * size
    statement = select(TestReport)
    count_statement = select(func.count()).select_from(TestReport)

    if scenario_id is not None:
        statement = statement.where(col(TestReport.scenario_id) == scenario_id)
        count_statement = count_statement.where(col(TestReport.scenario_id) == scenario_id)

    # 按创建时间倒序
    statement = statement.order_by(col(TestReport.created_at).desc())

    total = int((await session.execute(count_statement)).scalar_one() or 0)
    result = await session.execute(statement.offset(skip).limit(size))
    reports = list(result.scalars().all())

    pages = (total + size - 1) // size

    return PageResponse(items=reports, total=total, page=page, size=size, pages=pages)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: int, session: AsyncSession = Depends(get_session)):
    """获取单个测试报告"""
    report = await session.get(TestReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{report_id}/details", response_model=list[ReportDetailResponse])
async def get_report_details(report_id: int, session: AsyncSession = Depends(get_session)):
    """获取测试报告的详细执行记录"""
    # 检查报告是否存在
    report = await session.get(TestReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # 获取详情
    stmt = select(TestReportDetail).where(col(TestReportDetail.report_id) == report_id)
    result = await session.execute(stmt)
    details = result.scalars().all()

    return details


@router.delete("/{report_id}")
async def delete_report(report_id: int, session: AsyncSession = Depends(get_session)):
    """删除测试报告"""
    report = await session.get(TestReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # 先删除关联的详情记录
    details_stmt = select(TestReportDetail).where(col(TestReportDetail.report_id) == report_id)
    details_result = await session.execute(details_stmt)
    details = details_result.scalars().all()
    for detail in details:
        await session.delete(detail)

    # 删除报告
    await session.delete(report)
    await session.commit()

    return {"deleted": report_id}
