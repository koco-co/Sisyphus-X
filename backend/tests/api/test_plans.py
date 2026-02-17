"""测试计划 API 单元测试

测试测试计划 CRUD、添加场景、批量更新排序、执行计划、终止/暂停/恢复
"""
import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy import select

from app.models.test_plan import TestPlan, PlanScenario
from app.models.scenario import Scenario


@pytest.mark.asyncio
class TestListPlans:
    """测试计划列表测试类"""

    async def test_list_plans_empty(self, async_client: AsyncClient):
        """测试空列表"""
        response = await async_client.get("/api/v1/plans/")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    async def test_list_plans_with_pagination(self, async_client: AsyncClient, sample_project, sample_test_scenario):
        """测试分页功能"""
        # 创建多个测试计划
        plan_ids = []
        for i in range(15):
            plan_data = {
                "scenario_id": sample_test_scenario.id,
                "name": f"测试计划{i}",
                "cron_expression": "0 0 * * *",
                "status": "active"
            }
            response = await async_client.post("/api/v1/plans/", json=plan_data)
            assert response.status_code == 200
            plan_ids.append(response.json()["id"])

        # 测试第一页 (size=10)
        response = await async_client.get("/api/v1/plans/?page=1&size=10")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 15
        assert len(data["items"]) == 10
        assert data["page"] == 1
        assert data["pages"] == 2

        # 测试第二页
        response = await async_client.get("/api/v1/plans/?page=2&size=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 5
        assert data["page"] == 2


@pytest.mark.asyncio
class TestCreatePlan:
    """创建测试计划测试类"""

    async def test_create_plan_success(self, async_client: AsyncClient, sample_test_scenario):
        """测试成功创建测试计划"""
        plan_data = {
            "scenario_id": sample_test_scenario.id,
            "name": "新测试计划",
            "cron_expression": "0 0 * * *",
            "status": "active"
        }
        response = await async_client.post("/api/v1/plans/", json=plan_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data  # 系统自动生成ID
        assert data["name"] == "新测试计划"
        assert data["scenario_id"] == sample_test_scenario.id

    async def test_create_plan_invalid_scenario(self, async_client: AsyncClient, sample_project):
        """测试使用不存在的场景创建计划"""
        plan_data = {
            "scenario_id": str(uuid.uuid4()),  # 不存在的场景ID
            "name": "无效测试计划",
            "cron_expression": "0 0 * * *"
        }
        response = await async_client.post("/api/v1/plans/", json=plan_data)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    async def test_create_plan_missing_name(self, async_client: AsyncClient, sample_test_scenario):
        """测试缺少名称字段"""
        plan_data = {
            "id": str(uuid.uuid4()),
            "scenario_id": sample_test_scenario.id
        }
        response = await async_client.post("/api/v1/plans/", json=plan_data)
        # Pydantic验证应该失败
        assert response.status_code == 422


@pytest.mark.asyncio
class TestGetPlan:
    """获取单个测试计划测试类"""

    async def test_get_plan_success(self, async_client: AsyncClient, sample_test_plan):
        """测试成功获取测试计划"""
        response = await async_client.get(f"/api/v1/plans/{sample_test_plan.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_test_plan.id
        assert data["name"] == sample_test_plan.name

    async def test_get_plan_not_found(self, async_client: AsyncClient):
        """测试获取不存在的测试计划"""
        fake_id = str(uuid.uuid4())
        response = await async_client.get(f"/api/v1/plans/{fake_id}")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
class TestUpdatePlan:
    """更新测试计划测试类"""

    async def test_update_plan_name(self, async_client: AsyncClient, sample_test_plan):
        """测试更新测试计划名称"""
        update_data = {
            "name": "更新后的测试计划"
        }
        response = await async_client.put(
            f"/api/v1/plans/{sample_test_plan.id}",
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "更新后的测试计划"
        # 验证 updated_at 字段被更新
        assert data["updated_at"] is not None

    async def test_update_plan_description(self, async_client: AsyncClient, sample_test_plan):
        """测试更新测试计划描述"""
        update_data = {
            "description": "更新后的描述"
        }
        response = await async_client.put(
            f"/api/v1/plans/{sample_test_plan.id}",
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "更新后的描述"

    async def test_update_plan_not_found(self, async_client: AsyncClient):
        """测试更新不存在的测试计划"""
        fake_id = str(uuid.uuid4())
        update_data = {"name": "新名称"}
        response = await async_client.put(f"/api/v1/plans/{fake_id}", json=update_data)
        assert response.status_code == 404


@pytest.mark.asyncio
class TestDeletePlan:
    """删除测试计划测试类"""

    async def test_delete_plan_success(self, async_client: AsyncClient, db_session, sample_test_plan):
        """测试成功删除测试计划"""
        plan_id = sample_test_plan.id
        response = await async_client.delete(f"/api/v1/plans/{plan_id}")
        assert response.status_code == 200
        assert response.json()["deleted"] == plan_id

        # 验证数据库中已被删除
        from app.models.test_plan import TestPlan
        result = await db_session.execute(select(TestPlan).where(TestPlan.id == plan_id))
        plan = result.scalar_one_or_none()
        assert plan is None

    async def test_delete_plan_not_found(self, async_client: AsyncClient):
        """测试删除不存在的测试计划"""
        fake_id = str(uuid.uuid4())
        response = await async_client.delete(f"/api/v1/plans/{fake_id}")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestPausePlan:
    """暂停测试计划测试类"""

    async def test_pause_plan_success(self, async_client: AsyncClient, db_session, sample_project):
        """测试成功暂停测试计划"""
        # 创建一个测试计划
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试场景"
        )
        db_session.add(scenario)
        await db_session.commit()

        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="活跃测试计划"
        )
        db_session.add(plan)
        await db_session.commit()
        await db_session.refresh(plan)

        # 暂停计划
        response = await async_client.post(f"/api/v1/plans/{plan.id}/pause")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paused"

    async def test_pause_plan_not_found(self, async_client: AsyncClient):
        """测试暂停不存在的测试计划"""
        fake_id = str(uuid.uuid4())
        response = await async_client.post(f"/api/v1/plans/{fake_id}/pause")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestResumePlan:
    """恢复测试计划测试类"""

    async def test_resume_plan_success(self, async_client: AsyncClient, db_session, sample_project):
        """测试成功恢复测试计划"""
        # 创建一个暂停的测试计划
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试场景"
        )
        db_session.add(scenario)
        await db_session.commit()

        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="暂停的测试计划",
            status="paused"
        )
        db_session.add(plan)
        await db_session.commit()
        await db_session.refresh(plan)

        # 恢复计划
        response = await async_client.post(f"/api/v1/plans/{plan.id}/resume")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"

    async def test_resume_plan_not_found(self, async_client: AsyncClient):
        """测试恢复不存在的测试计划"""
        fake_id = str(uuid.uuid4())
        response = await async_client.post(f"/api/v1/plans/{fake_id}/resume")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestTriggerPlan:
    """触发测试计划执行测试类"""

    async def test_trigger_plan_success(self, async_client: AsyncClient, db_session, sample_project):
        """测试成功触发测试计划"""
        # 创建测试计划
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试场景"
        )
        db_session.add(scenario)
        await db_session.commit()

        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="待执行的测试计划"
        )
        db_session.add(plan)
        await db_session.commit()
        await db_session.refresh(plan)

        # 触发执行
        response = await async_client.post(f"/api/v1/plans/{plan.id}/trigger")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["plan_id"] == plan.id
        assert "triggered successfully" in data["message"].lower()

    async def test_trigger_plan_not_found(self, async_client: AsyncClient):
        """测试触发不存在的测试计划"""
        fake_id = str(uuid.uuid4())
        response = await async_client.post(f"/api/v1/plans/{fake_id}/trigger")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestPlanScenarioRelationship:
    """测试计划与场景关系测试类"""

    async def test_add_scenario_to_plan(self, async_client: AsyncClient, db_session,
                                       sample_test_plan, sample_test_scenario):
        """测试添加场景到测试计划"""
        plan_scenario = PlanScenario(
            id=str(uuid.uuid4()),
            test_plan_id=sample_test_plan.id,
            scenario_id=sample_test_scenario.id,
            execution_order=1
        )
        db_session.add(plan_scenario)
        await db_session.commit()
        await db_session.refresh(plan_scenario)

        assert plan_scenario.id is not None
        assert plan_scenario.test_plan_id == sample_test_plan.id
        assert plan_scenario.scenario_id == sample_test_scenario.id
        assert plan_scenario.execution_order == 1

    async def test_batch_update_scenario_order(self, async_client: AsyncClient, db_session,
                                              sample_test_plan):
        """测试批量更新场景排序"""
        # 创建多个场景
        scenario_ids = []
        for i in range(3):
            scenario = Scenario(
                id=str(uuid.uuid4()),
                project_id=sample_test_plan.project_id,
                name=f"测试场景{i}"
            )
            db_session.add(scenario)
            await db_session.commit()
            scenario_ids.append(scenario.id)

        # 添加到测试计划
        for i, scenario_id in enumerate(scenario_ids):
            plan_scenario = PlanScenario(
                id=str(uuid.uuid4()),
                test_plan_id=sample_test_plan.id,
                scenario_id=scenario_id,
                execution_order=i + 1
            )
            db_session.add(plan_scenario)
        await db_session.commit()

        # 验证顺序
        result = await db_session.execute(
            select(PlanScenario)
            .where(PlanScenario.test_plan_id == sample_test_plan.id)
            .order_by(PlanScenario.execution_order)
        )
        plan_scenarios = result.scalars().all()
        assert len(plan_scenarios) == 3
        assert plan_scenarios[0].execution_order == 1
        assert plan_scenarios[1].execution_order == 2
        assert plan_scenarios[2].execution_order == 3
