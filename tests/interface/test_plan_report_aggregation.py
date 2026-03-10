"""计划级聚合报告接口测试。"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.api.v1.endpoints.plans import execution_manager
from app.models import TestReport, TestReportDetail
from app.models.project import Interface
from app.models.scenario import Scenario, ScenarioStep
from app.models.test_plan import PlanScenario, TestPlan


def _fake_engine_success(*_args, **_kwargs):
    return {
        "success": True,
        "result": {
            "summary": {
                "total_steps": 1,
                "passed_steps": 1,
                "failed_steps": 0,
            },
            "duration": 120,
            "steps": [
                {
                    "name": "步骤执行成功",
                    "success": True,
                    "duration": 120,
                    "request_detail": {
                        "method": "GET",
                        "url": "/users",
                        "headers": {"Accept": "application/json"},
                    },
                    "response_detail": {
                        "status_code": 200,
                        "body": {"ok": True},
                    },
                }
            ],
        },
        "error": None,
    }


async def _count_reports(db_session) -> int:
    result = await db_session.execute(select(TestReport))
    return len(result.scalars().all())


async def _create_request_scenario(db_session, project_id: str, user_id: str, name: str) -> Scenario:
    scenario = Scenario(
        id=str(uuid.uuid4()),
        project_id=project_id,
        created_by=user_id,
        name=name,
        description=f"{name}描述",
    )
    db_session.add(scenario)
    await db_session.commit()

    step = ScenarioStep(
        id=str(uuid.uuid4()),
        scenario_id=scenario.id,
        description=f"{name}-请求步骤",
        keyword_type="request",
        keyword_name="http_request",
        sort_order=0,
        parameters={
            "config": {
                "method": "GET",
                "url": "/users",
                "headers": [{"key": "Accept", "value": "application/json"}],
            }
        },
    )
    db_session.add(step)
    await db_session.commit()
    await db_session.refresh(scenario)
    return scenario


@pytest.mark.asyncio
class TestPlanReportAggregation:
    """验证报告只由计划执行产生，并按计划聚合。"""

    async def test_debug_scenario_does_not_create_report(
        self,
        async_client: AsyncClient,
        db_session,
        sample_project,
        sample_user,
        monkeypatch,
    ):
        """场景调试结果仅临时展示，不写入测试报告。"""
        monkeypatch.setattr(
            "app.services.engine_executor.EngineExecutor.execute",
            _fake_engine_success,
        )
        scenario = await _create_request_scenario(
            db_session,
            sample_project.id,
            sample_user.id,
            "场景调试-不入报告",
        )

        before = await _count_reports(db_session)
        response = await async_client.post(f"/api/v1/scenarios/{scenario.id}/debug", json={})
        after = await _count_reports(db_session)

        assert response.status_code == 200
        assert response.json()["report_url"] is None
        assert after == before

    async def test_interface_debug_does_not_create_report(
        self,
        async_client: AsyncClient,
        db_session,
        sample_project,
        monkeypatch,
    ):
        """接口调试结果仅临时展示，不写入测试报告。"""
        monkeypatch.setattr(
            "app.services.engine_executor.EngineExecutor.execute",
            _fake_engine_success,
        )
        interface = Interface(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="接口调试-不入报告",
            url="/users",
            method="GET",
            status="draft",
            description="接口调试",
        )
        db_session.add(interface)
        await db_session.commit()

        before = await _count_reports(db_session)
        response = await async_client.post(
            "/api/v1/interfaces/debug/execute-engine",
            json={"interface_id": interface.id, "timeout": 3},
        )
        after = await _count_reports(db_session)

        assert response.status_code == 200
        assert response.json()["success"] is True
        assert after == before

    async def test_execute_plan_creates_single_aggregated_report(
        self,
        async_client: AsyncClient,
        async_engine,
        db_session,
        sample_project,
        sample_user,
        monkeypatch,
    ):
        """一次测试计划执行只应产生一条聚合报告，详情覆盖多个场景的接口步骤。"""
        monkeypatch.setattr(
            "app.services.engine_executor.EngineExecutor.execute",
            _fake_engine_success,
        )
        test_session_maker = async_sessionmaker(async_engine, expire_on_commit=False)
        monkeypatch.setattr("app.api.v1.endpoints.plans.async_session_maker", test_session_maker)

        scenario_one = await _create_request_scenario(
            db_session,
            sample_project.id,
            sample_user.id,
            "聚合场景一",
        )
        scenario_two = await _create_request_scenario(
            db_session,
            sample_project.id,
            sample_user.id,
            "聚合场景二",
        )

        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="聚合报告计划",
            status="active",
        )
        db_session.add(plan)
        await db_session.commit()

        db_session.add_all(
            [
                PlanScenario(
                    id=str(uuid.uuid4()),
                    test_plan_id=plan.id,
                    scenario_id=scenario_one.id,
                    execution_order=0,
                ),
                PlanScenario(
                    id=str(uuid.uuid4()),
                    test_plan_id=plan.id,
                    scenario_id=scenario_two.id,
                    execution_order=1,
                ),
            ]
        )
        await db_session.commit()

        response = await async_client.post(f"/api/v1/plans/{plan.id}/execute")
        assert response.status_code == 200

        execution_id = response.json()["execution_id"]
        task = execution_manager.tasks[execution_id]
        await task
        await db_session.refresh(plan)

        reports = (
            await db_session.execute(select(TestReport).order_by(TestReport.created_at.asc()))
        ).scalars().all()
        details = (await db_session.execute(select(TestReportDetail))).scalars().all()

        execution_manager.tasks.pop(execution_id, None)
        execution_manager.status.pop(execution_id, None)

        assert len(reports) == 1
        assert reports[0].status == "success"
        assert len(details) == 2
        assert {detail.node_name for detail in details} == {
            "聚合场景一-请求步骤",
            "聚合场景二-请求步骤",
        }
