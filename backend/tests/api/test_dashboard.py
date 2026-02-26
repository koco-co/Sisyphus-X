"""Dashboard API 接口测试（BE-007）"""

import pytest
from httpx import AsyncClient

from app.models import Interface, Project, Scenario


@pytest.mark.asyncio
class TestDashboardAPI:
    """Dashboard 聚合接口测试"""

    async def test_get_dashboard_empty(self, async_client: AsyncClient, sample_user):
        """无数据时返回全 0 与 7 天趋势（需有用户以便认证通过）"""
        response = await async_client.get("/api/v1/dashboard/")
        assert response.status_code == 200
        data = response.json()
        assert data["project_count"] == 0
        assert data["interface_count"] == 0
        assert data["scenario_count"] == 0
        assert len(data["execution_trend"]) == 7
        for point in data["execution_trend"]:
            assert "name" in point
            assert "pass_count" in point
            assert "fail_count" in point

    async def test_get_dashboard_with_data(
        self,
        async_client: AsyncClient,
        db_session,
        sample_project,
        sample_user,
    ):
        """有项目/接口/场景时统计正确"""
        from app.models import Interface, InterfaceFolder, Scenario
        import uuid

        # 添加场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="场景1",
            created_by=sample_user.id,
        )
        db_session.add(scenario)
        folder = InterfaceFolder(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="根目录",
        )
        db_session.add(folder)
        await db_session.flush()
        iface = Interface(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            folder_id=folder.id,
            name="GET /users",
            method="GET",
            url="/users",
        )
        db_session.add(iface)
        await db_session.commit()

        response = await async_client.get("/api/v1/dashboard/")
        assert response.status_code == 200
        data = response.json()
        assert data["project_count"] == 1
        assert data["interface_count"] == 1
        assert data["scenario_count"] == 1
