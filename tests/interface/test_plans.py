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

    async def test_pause_plan_success(self, async_client: AsyncClient, db_session, sample_project, sample_user):
        """测试成功暂停测试计划"""
        # 创建一个测试计划
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            created_by=sample_user.id,
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

    async def test_resume_plan_success(self, async_client: AsyncClient, db_session, sample_project, sample_user):
        """测试成功恢复测试计划"""
        # 创建一个暂停的测试计划
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            created_by=sample_user.id,
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

    async def test_trigger_plan_success(self, async_client: AsyncClient, db_session, sample_project, sample_user):
        """测试成功触发测试计划"""
        # 创建测试计划
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            created_by=sample_user.id,
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

        # 触发执行 (使用 execute 端点)
        response = await async_client.post(f"/api/v1/plans/{plan.id}/execute")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["plan_id"] == plan.id
        assert "execution_id" in data
        assert data["status"] in ["pending", "running"]

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
                                              sample_test_plan, sample_user):
        """测试批量更新场景排序"""
        # 创建多个场景
        scenario_ids = []
        for i in range(3):
            scenario = Scenario(
                id=str(uuid.uuid4()),
                project_id=sample_test_plan.project_id,
                created_by=sample_user.id,
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


@pytest.mark.asyncio
class TestExecutePlan:
    """执行测试计划测试类"""

    async def test_execute_plan_success(self, async_client: AsyncClient, db_session, sample_project, sample_user):
        """测试成功执行测试计划"""
        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            created_by=sample_user.id,
            name="测试场景"
        )
        db_session.add(scenario)
        await db_session.commit()

        # 创建测试计划
        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="待执行的测试计划",
            status="active"
        )
        db_session.add(plan)
        await db_session.commit()

        # 创建计划场景关联
        plan_scenario = PlanScenario(
            id=str(uuid.uuid4()),
            test_plan_id=plan.id,
            scenario_id=scenario.id,
            execution_order=0
        )
        db_session.add(plan_scenario)
        await db_session.commit()
        await db_session.refresh(plan)

        # 执行测试计划
        response = await async_client.post(f"/api/v1/plans/{plan.id}/execute")
        assert response.status_code == 200
        data = response.json()
        assert "execution_id" in data
        assert data["plan_id"] == plan.id
        assert data["status"] in ["pending", "running"]
        assert "message" in data

    async def test_execute_plan_not_found(self, async_client: AsyncClient):
        """测试执行不存在的测试计划"""
        fake_id = str(uuid.uuid4())
        response = await async_client.post(f"/api/v1/plans/{fake_id}/execute")
        assert response.status_code == 404

    async def test_execute_plan_already_running(self, async_client: AsyncClient, db_session, sample_project, sample_user):
        """测试重复执行正在运行的测试计划"""
        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            created_by=sample_user.id,
            name="测试场景"
        )
        db_session.add(scenario)
        await db_session.commit()

        # 创建测试计划
        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="正在运行的测试计划"
        )
        db_session.add(plan)
        await db_session.commit()

        # 创建计划场景关联
        plan_scenario = PlanScenario(
            id=str(uuid.uuid4()),
            test_plan_id=plan.id,
            scenario_id=scenario.id,
            execution_order=0
        )
        db_session.add(plan_scenario)
        await db_session.commit()

        # 第一次执行
        response = await async_client.post(f"/api/v1/plans/{plan.id}/execute")
        assert response.status_code == 200
        execution_id = response.json()["execution_id"]

        # 等待执行开始
        import asyncio
        await asyncio.sleep(0.5)

        # 第二次执行（应该失败）
        response = await async_client.post(f"/api/v1/plans/{plan.id}/execute")
        assert response.status_code == 400
        assert "正在执行" in response.json()["detail"]


@pytest.mark.asyncio
class TestTerminatePlan:
    """终止测试计划执行测试类"""

    async def test_terminate_plan_success(self, async_client: AsyncClient, db_session, sample_project, sample_user):
        """测试成功终止正在执行的测试计划"""
        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            created_by=sample_user.id,
            name="测试场景"
        )
        db_session.add(scenario)
        await db_session.commit()

        # 创建测试计划
        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="待终止的测试计划"
        )
        db_session.add(plan)
        await db_session.commit()

        # 创建计划场景关联
        plan_scenario = PlanScenario(
            id=str(uuid.uuid4()),
            test_plan_id=plan.id,
            scenario_id=scenario.id,
            execution_order=0
        )
        db_session.add(plan_scenario)
        await db_session.commit()

        # 执行测试计划
        response = await async_client.post(f"/api/v1/plans/{plan.id}/execute")
        assert response.status_code == 200
        execution_id = response.json()["execution_id"]

        # 等待执行开始
        import asyncio
        await asyncio.sleep(0.5)

        # 终止执行
        response = await async_client.post(f"/api/v1/plans/{plan.id}/terminate")
        assert response.status_code == 200
        data = response.json()
        assert data["plan_id"] == plan.id
        assert data["terminated_count"] >= 1
        assert "message" in data

    async def test_terminate_plan_not_found(self, async_client: AsyncClient):
        """测试终止不存在的测试计划"""
        fake_id = str(uuid.uuid4())
        response = await async_client.post(f"/api/v1/plans/{fake_id}/terminate")
        # API 返回 400 因为没有找到正在执行的任务（而不是计划不存在）
        assert response.status_code == 400
        assert "没有找到" in response.json()["detail"]

    async def test_terminate_plan_no_running_task(self, async_client: AsyncClient, db_session, sample_project):
        """测试终止没有正在运行任务的测试计划"""
        # 创建测试计划（但没有执行）
        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="未执行的测试计划"
        )
        db_session.add(plan)
        await db_session.commit()
        await db_session.refresh(plan)

        # 尝试终止（应该失败）
        response = await async_client.post(f"/api/v1/plans/{plan.id}/terminate")
        assert response.status_code == 400
        assert "没有找到" in response.json()["detail"]


@pytest.mark.asyncio
class TestPausePlanExecution:
    """暂停测试计划执行测试类

    注意: API 中 /pause 端点实际调用的是 pause_plan（修改计划状态），
    而不是 pause_plan_execution（控制执行）
    """

    async def test_pause_plan_execution_success(self, async_client: AsyncClient, db_session, sample_project, sample_user):
        """测试成功暂停测试计划（修改计划状态）"""
        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            created_by=sample_user.id,
            name="测试场景"
        )
        db_session.add(scenario)
        await db_session.commit()

        # 创建活跃状态的测试计划
        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="待暂停的测试计划",
            status="active"
        )
        db_session.add(plan)
        await db_session.commit()

        # 创建计划场景关联
        plan_scenario = PlanScenario(
            id=str(uuid.uuid4()),
            test_plan_id=plan.id,
            scenario_id=scenario.id,
            execution_order=0
        )
        db_session.add(plan_scenario)
        await db_session.commit()
        await db_session.refresh(plan)

        # 暂停计划（修改状态）
        response = await async_client.post(f"/api/v1/plans/{plan.id}/pause")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paused"
        assert data["id"] == plan.id

    async def test_pause_plan_execution_not_found(self, async_client: AsyncClient):
        """测试暂停不存在的测试计划"""
        fake_id = str(uuid.uuid4())
        response = await async_client.post(f"/api/v1/plans/{fake_id}/pause")
        # API 返回 404 因为计划不存在
        assert response.status_code == 404

    async def test_pause_plan_execution_already_paused(self, async_client: AsyncClient, db_session, sample_project):
        """测试暂停已经暂停的测试计划"""
        # 创建已经暂停的测试计划
        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="已暂停的测试计划",
            status="paused"
        )
        db_session.add(plan)
        await db_session.commit()
        await db_session.refresh(plan)

        # 再次暂停（应该成功，幂等操作）
        response = await async_client.post(f"/api/v1/plans/{plan.id}/pause")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paused"


@pytest.mark.asyncio
class TestResumePlanExecution:
    """恢复测试计划执行测试类

    注意: API 中 /resume 端点实际调用的是 resume_plan（修改计划状态），
    而不是 resume_plan_execution（控制执行）
    """

    async def test_resume_plan_execution_success(self, async_client: AsyncClient, db_session, sample_project, sample_user):
        """测试成功恢复已暂停的测试计划（修改计划状态）"""
        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            created_by=sample_user.id,
            name="测试场景"
        )
        db_session.add(scenario)
        await db_session.commit()

        # 创建暂停状态的测试计划
        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="待恢复的测试计划",
            status="paused"
        )
        db_session.add(plan)
        await db_session.commit()

        # 创建计划场景关联
        plan_scenario = PlanScenario(
            id=str(uuid.uuid4()),
            test_plan_id=plan.id,
            scenario_id=scenario.id,
            execution_order=0
        )
        db_session.add(plan_scenario)
        await db_session.commit()
        await db_session.refresh(plan)

        # 恢复计划（修改状态为 active）
        response = await async_client.post(f"/api/v1/plans/{plan.id}/resume")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"
        assert data["id"] == plan.id

    async def test_resume_plan_execution_not_found(self, async_client: AsyncClient):
        """测试恢复不存在的测试计划"""
        fake_id = str(uuid.uuid4())
        response = await async_client.post(f"/api/v1/plans/{fake_id}/resume")
        # API 返回 404 因为计划不存在
        assert response.status_code == 404

    async def test_resume_plan_execution_already_active(self, async_client: AsyncClient, db_session, sample_project):
        """测试恢复已经活跃的测试计划"""
        # 创建活跃状态的测试计划
        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="活跃的测试计划",
            status="active"
        )
        db_session.add(plan)
        await db_session.commit()
        await db_session.refresh(plan)

        # 再次恢复（应该成功，幂等操作）
        response = await async_client.post(f"/api/v1/plans/{plan.id}/resume")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"


@pytest.mark.asyncio
class TestListPlanExecutions:
    """获取测试计划执行记录列表测试类"""

    async def test_list_executions_empty(self, async_client: AsyncClient, sample_test_plan):
        """测试空列表"""
        response = await async_client.get(f"/api/v1/plans/{sample_test_plan.id}/executions")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    async def test_list_executions_with_data(self, async_client: AsyncClient, db_session, sample_test_plan):
        """测试获取执行记录列表"""
        from app.models.test_plan import TestPlanExecution

        # 创建多个执行记录
        for i in range(3):
            execution = TestPlanExecution(
                id=str(uuid.uuid4()),
                test_plan_id=sample_test_plan.id,
                status="completed",
                total_scenarios=5,
                passed_scenarios=4,
                failed_scenarios=1,
                skipped_scenarios=0
            )
            db_session.add(execution)
        await db_session.commit()

        # 获取执行记录列表
        response = await async_client.get(f"/api/v1/plans/{sample_test_plan.id}/executions")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3
        assert "page" in data
        assert "pages" in data

    async def test_list_executions_with_pagination(self, async_client: AsyncClient, db_session, sample_test_plan):
        """测试分页功能"""
        from app.models.test_plan import TestPlanExecution

        # 创建多个执行记录
        for i in range(15):
            execution = TestPlanExecution(
                id=str(uuid.uuid4()),
                test_plan_id=sample_test_plan.id,
                status="completed",
                total_scenarios=5,
                passed_scenarios=5,
                failed_scenarios=0,
                skipped_scenarios=0
            )
            db_session.add(execution)
        await db_session.commit()

        # 测试第一页 (size=10)
        response = await async_client.get(f"/api/v1/plans/{sample_test_plan.id}/executions?page=1&size=10")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 15
        assert len(data["items"]) == 10
        assert data["page"] == 1
        assert data["pages"] == 2

        # 测试第二页
        response = await async_client.get(f"/api/v1/plans/{sample_test_plan.id}/executions?page=2&size=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 5
        assert data["page"] == 2

    async def test_list_executions_plan_not_found(self, async_client: AsyncClient):
        """测试获取不存在计划的执行记录"""
        fake_id = str(uuid.uuid4())
        response = await async_client.get(f"/api/v1/plans/{fake_id}/executions")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestGetExecution:
    """获取执行记录详情测试类"""

    async def test_get_execution_success(self, async_client: AsyncClient, db_session, sample_test_plan):
        """测试成功获取执行记录详情"""
        from app.models.test_plan import TestPlanExecution, PlanExecutionStep

        # 创建执行记录
        execution = TestPlanExecution(
            id=str(uuid.uuid4()),
            test_plan_id=sample_test_plan.id,
            status="running",
            total_scenarios=2,
            passed_scenarios=1,
            failed_scenarios=0,
            skipped_scenarios=0
        )
        db_session.add(execution)
        await db_session.commit()
        await db_session.refresh(execution)

        # 创建执行步骤
        step = PlanExecutionStep(
            id=str(uuid.uuid4()),
            test_plan_execution_id=execution.id,
            scenario_id=str(uuid.uuid4()),
            status="passed"
        )
        db_session.add(step)
        await db_session.commit()

        # 获取执行详情
        response = await async_client.get(f"/api/v1/plans/executions/{execution.id}")
        assert response.status_code == 200
        data = response.json()
        assert "execution" in data
        assert "steps" in data
        assert "current_status" in data
        assert data["execution"]["id"] == execution.id
        assert len(data["steps"]) == 1

    async def test_get_execution_not_found(self, async_client: AsyncClient):
        """测试获取不存在的执行记录"""
        fake_id = str(uuid.uuid4())
        response = await async_client.get(f"/api/v1/plans/executions/{fake_id}")
        assert response.status_code == 404

    async def test_get_execution_with_steps(self, async_client: AsyncClient, db_session, sample_test_plan):
        """测试获取包含多个步骤的执行记录"""
        from app.models.test_plan import TestPlanExecution, PlanExecutionStep

        # 创建执行记录
        execution = TestPlanExecution(
            id=str(uuid.uuid4()),
            test_plan_id=sample_test_plan.id,
            status="completed",
            total_scenarios=3,
            passed_scenarios=2,
            failed_scenarios=1,
            skipped_scenarios=0
        )
        db_session.add(execution)
        await db_session.commit()
        await db_session.refresh(execution)

        # 创建多个执行步骤
        for i in range(3):
            step = PlanExecutionStep(
                id=str(uuid.uuid4()),
                test_plan_execution_id=execution.id,
                scenario_id=str(uuid.uuid4()),
                status="passed" if i < 2 else "failed",
                error_message="Step failed" if i == 2 else None
            )
            db_session.add(step)
        await db_session.commit()

        # 获取执行详情
        response = await async_client.get(f"/api/v1/plans/executions/{execution.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["execution"]["total_scenarios"] == 3
        assert data["execution"]["passed_scenarios"] == 2
        assert data["execution"]["failed_scenarios"] == 1
        assert len(data["steps"]) == 3
        # 验证失败的步骤有错误信息
        failed_steps = [s for s in data["steps"] if s["status"] == "failed"]
        assert len(failed_steps) == 1
        assert failed_steps[0]["error_message"] == "Step failed"
