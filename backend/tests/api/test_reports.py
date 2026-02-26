"""测试报告 API 接口测试（含 BE-058 历史报告按场景名查询）"""

from datetime import datetime
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models import Scenario
from app.models.report import TestReport


@pytest.fixture
async def scenario_with_reports(db_session, sample_project, sample_user):
    """创建带两条报告的场景（使用 report.TestReport，表 testreport）"""
    scenario = Scenario(
        id=str(uuid.uuid4()),
        project_id=sample_project.id,
        name="登录流程",
        created_by=sample_user.id,
    )
    db_session.add(scenario)
    await db_session.commit()
    await db_session.refresh(scenario)

    r1 = TestReport(
        scenario_id=scenario.id,
        name="登录流程-执行1",
        status="success",
        total=5,
        success=5,
        failed=0,
        duration="2s",
        start_time=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    r2 = TestReport(
        scenario_id=scenario.id,
        name="登录流程-执行2",
        status="failed",
        total=5,
        success=3,
        failed=2,
        duration="3s",
        start_time=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db_session.add(r1)
    db_session.add(r2)
    await db_session.commit()
    await db_session.refresh(scenario)
    return scenario


@pytest.mark.asyncio
class TestReportsHistoryAPI:
    """BE-058 按场景名称查询历史报告"""

    async def test_history_empty_scenario_name(self, async_client: AsyncClient):
        """不存在的场景名返回空列表"""
        response = await async_client.get(
            "/api/v1/reports/history/不存在的场景名"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1

    async def test_history_by_scenario_name(
        self,
        async_client: AsyncClient,
        scenario_with_reports,
    ):
        """按场景名称查询到该场景下的报告"""
        response = await async_client.get(
            "/api/v1/reports/history/登录流程"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2
        names = {i["name"] for i in data["items"]}
        assert "登录流程-执行1" in names
        assert "登录流程-执行2" in names

    async def test_history_pagination(
        self,
        async_client: AsyncClient,
        scenario_with_reports,
    ):
        """历史报告分页"""
        response = await async_client.get(
            "/api/v1/reports/history/登录流程?page=1&size=1"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert data["page"] == 1
        assert data["size"] == 1
        assert len(data["items"]) == 1
        assert data["pages"] == 2
