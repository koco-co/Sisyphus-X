"""TestReport 模型单元测试

按照 docs/数据库设计.md §3.16 定义
"""
import uuid
import pytest
from datetime import datetime
from sqlalchemy import select

from app.models.test_report import TestReport
from app.models.test_plan import TestPlan, TestPlanExecution
from app.models.scenario import Scenario


@pytest.mark.asyncio
async def test_create_test_report(db_session, sample_test_plan, sample_test_scenario):
    """测试创建测试报告"""
    # 创建测试执行
    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=sample_test_plan.id,
        status="running",
    )
    db_session.add(execution)
    await db_session.commit()

    # 创建测试报告
    report = TestReport(
        id=str(uuid.uuid4()),
        execution_id=execution.id,
        scenario_id=sample_test_scenario.id,
        status="passed",
        duration=120,
        result='{"total_steps": 10, "passed_steps": 10}',
        allure_report_path="/path/to/report",
    )
    db_session.add(report)
    await db_session.commit()
    await db_session.refresh(report)

    assert report.id is not None
    assert report.status == "passed"
    assert report.duration == 120
    assert report.created_at is not None


@pytest.mark.asyncio
async def test_report_status_enum(db_session, sample_test_plan, sample_test_scenario):
    """测试报告状态枚举"""
    # 创建测试执行
    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=sample_test_plan.id,
    )
    db_session.add(execution)
    await db_session.commit()

    # 测试各种状态
    statuses = ["passed", "failed", "skipped"]
    for status in statuses:
        report = TestReport(
            id=str(uuid.uuid4()),
            execution_id=execution.id,
            scenario_id=sample_test_scenario.id,
            status=status,
        )
        db_session.add(report)
        await db_session.commit()

        assert report.status == status


@pytest.mark.asyncio
async def test_report_timestamps(db_session, sample_test_plan, sample_test_scenario):
    """测试时间戳"""
    # 创建测试执行
    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=sample_test_plan.id,
    )
    db_session.add(execution)
    await db_session.commit()

    report = TestReport(
        id=str(uuid.uuid4()),
        execution_id=execution.id,
        scenario_id=sample_test_scenario.id,
        status="passed",
    )
    db_session.add(report)
    await db_session.commit()
    await db_session.refresh(report)

    assert report.created_at is not None
    assert isinstance(report.created_at, datetime)
