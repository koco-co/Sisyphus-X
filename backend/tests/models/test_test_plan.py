"""测试计划相关模型单元测试

测试模型:
- TestPlan (测试计划表)
- PlanScenario (计划场景关联表)
- TestPlanExecution (测试执行表)
- ExecutionStep (执行步骤表)

参考文档:
- docs/数据库设计.md §3.13-§3.15
- TASK-007: 创建测试计划相关表
"""
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from datetime import datetime, timezone

from app.models.test_plan import TestPlan, PlanScenario, TestPlanExecution, PlanExecutionStep
from app.models.scenario import Scenario


# ========== TestPlan 测试 ==========


@pytest.mark.asyncio
async def test_create_test_plan_minimal(db_session):
    """测试创建最小字段测试计划"""
    import uuid

    # 创建项目
    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    # 创建测试计划 (仅必填字段)
    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()
    await db_session.refresh(plan)

    assert plan.id is not None
    assert plan.name == "测试计划1"
    assert plan.description is None
    assert plan.created_at is not None
    assert plan.updated_at is not None


@pytest.mark.asyncio
async def test_create_test_plan_all_fields(db_session):
    """测试创建完整字段测试计划"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    # 创建测试计划 (所有字段)
    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="完整测试计划",
        description="这是一个完整的测试计划描述",
    )
    db_session.add(plan)
    await db_session.commit()
    await db_session.refresh(plan)

    assert plan.name == "完整测试计划"
    assert plan.description == "这是一个完整的测试计划描述"
    assert plan.created_at is not None
    assert plan.updated_at is not None


@pytest.mark.asyncio
async def test_test_plan_relationship_with_project(db_session):
    """测试测试计划与项目的关系"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    # 创建测试计划
    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()
    await db_session.refresh(plan)

    # 验证关系
    assert plan.project_id == project.id
    assert plan.name == "测试计划1"


# ========== PlanScenario 测试 ==========


@pytest.mark.asyncio
async def test_create_plan_scenario(db_session):
    """测试创建计划场景关联"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    # 创建测试计划
    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    # 创建测试场景
    scenario = Scenario(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试场景1",
    )
    db_session.add(scenario)
    await db_session.commit()

    # 创建计划场景关联
    plan_scenario = PlanScenario(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        scenario_id=scenario.id,
        execution_order=1,
    )
    db_session.add(plan_scenario)
    await db_session.commit()
    await db_session.refresh(plan_scenario)

    assert plan_scenario.id is not None
    assert plan_scenario.test_plan_id == plan.id
    assert plan_scenario.scenario_id == scenario.id
    assert plan_scenario.execution_order == 1
    assert plan_scenario.created_at is not None


@pytest.mark.asyncio
async def test_plan_scenario_unique_constraint(db_session):
    """测试 test_plan_id + execution_order 唯一性约束"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    # 创建测试计划
    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    # 创建两个测试场景
    scenario1 = Scenario(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试场景1",
    )
    scenario2 = Scenario(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试场景2",
    )
    db_session.add_all([scenario1, scenario2])
    await db_session.commit()

    # 创建第一个计划场景关联
    plan_scenario1 = PlanScenario(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        scenario_id=scenario1.id,
        execution_order=1,
    )
    db_session.add(plan_scenario1)
    await db_session.commit()

    # 尝试创建相同 test_plan_id + execution_order 的记录 (应该失败)
    plan_scenario2 = PlanScenario(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        scenario_id=scenario2.id,
        execution_order=1,  # 相同的 execution_order
    )
    db_session.add(plan_scenario2)

    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_cascade_delete_test_plan_scenarios(db_session):
    """测试删除测试计划时级联删除场景关联"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    # 创建测试计划和场景
    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    scenario = Scenario(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试场景1",
    )
    db_session.add(scenario)
    await db_session.commit()

    # 创建计划场景关联
    plan_scenario = PlanScenario(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        scenario_id=scenario.id,
        execution_order=1,
    )
    db_session.add(plan_scenario)
    await db_session.commit()

    plan_scenario_id = plan_scenario.id

    # 删除测试计划
    await db_session.delete(plan)
    await db_session.commit()

    # 验证计划场景关联被级联删除
    result = await db_session.get(PlanScenario, plan_scenario_id)
    assert result is None


# ========== TestPlanExecution 测试 ==========


@pytest.mark.asyncio
async def test_create_test_execution(db_session):
    """测试创建测试执行记录"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    # 创建测试计划
    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    # 创建测试执行记录
    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        status="pending",
    )
    db_session.add(execution)
    await db_session.commit()
    await db_session.refresh(execution)

    assert execution.id is not None
    assert execution.test_plan_id == plan.id
    assert execution.status == "pending"
    assert execution.started_at is None
    assert execution.completed_at is None
    assert execution.total_scenarios == 0
    assert execution.passed_scenarios == 0
    assert execution.failed_scenarios == 0
    assert execution.skipped_scenarios == 0
    assert execution.created_at is not None


@pytest.mark.asyncio
async def test_test_execution_status_transitions(db_session):
    """测试测试执行状态转换"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    # 创建执行记录
    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        status="pending",
    )
    db_session.add(execution)
    await db_session.commit()

    # 状态转换: pending -> running
    execution.status = "running"
    execution.started_at = datetime.now(timezone.utc)
    await db_session.commit()
    await db_session.refresh(execution)

    assert execution.status == "running"
    assert execution.started_at is not None

    # 状态转换: running -> completed
    execution.status = "completed"
    execution.completed_at = datetime.now(timezone.utc)
    execution.total_scenarios = 10
    execution.passed_scenarios = 8
    execution.failed_scenarios = 2
    await db_session.commit()
    await db_session.refresh(execution)

    assert execution.status == "completed"
    assert execution.completed_at is not None
    assert execution.total_scenarios == 10
    assert execution.passed_scenarios == 8
    assert execution.failed_scenarios == 2


@pytest.mark.asyncio
async def test_test_execution_statistics(db_session):
    """测试测试执行统计字段"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        status="completed",
        total_scenarios=20,
        passed_scenarios=15,
        failed_scenarios=3,
        skipped_scenarios=2,
    )
    db_session.add(execution)
    await db_session.commit()
    await db_session.refresh(execution)

    assert execution.total_scenarios == 20
    assert execution.passed_scenarios == 15
    assert execution.failed_scenarios == 3
    assert execution.skipped_scenarios == 2


@pytest.mark.asyncio
async def test_cascade_delete_test_plan_executions(db_session):
    """测试删除测试计划时级联删除执行记录"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        status="pending",
    )
    db_session.add(execution)
    await db_session.commit()

    execution_id = execution.id

    # 删除测试计划
    await db_session.delete(plan)
    await db_session.commit()

    # 验证执行记录被级联删除
    result = await db_session.get(TestPlanExecution, execution_id)
    assert result is None


# ========== ExecutionStep 测试 ==========


@pytest.mark.asyncio
async def test_create_execution_step(db_session):
    """测试创建执行步骤"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        status="running",
    )
    db_session.add(execution)
    await db_session.commit()

    scenario = Scenario(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试场景1",
    )
    db_session.add(scenario)
    await db_session.commit()

    # 创建执行步骤
    step = PlanExecutionStep(
        id=str(uuid.uuid4()),
        test_plan_execution_id=execution.id,
        scenario_id=scenario.id,
        status="pending",
    )
    db_session.add(step)
    await db_session.commit()
    await db_session.refresh(step)

    assert step.id is not None
    assert step.test_plan_execution_id == execution.id
    assert step.scenario_id == scenario.id
    assert step.status == "pending"
    assert step.started_at is None
    assert step.completed_at is None
    assert step.error_message is None
    assert step.created_at is not None


@pytest.mark.asyncio
async def test_execution_step_status(db_session):
    """测试执行步骤状态字段"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        status="running",
    )
    db_session.add(execution)
    await db_session.commit()

    scenario = Scenario(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试场景1",
    )
    db_session.add(scenario)
    await db_session.commit()

    step = PlanExecutionStep(
        id=str(uuid.uuid4()),
        test_plan_execution_id=execution.id,
        scenario_id=scenario.id,
        status="running",
    )
    db_session.add(step)
    await db_session.commit()
    await db_session.refresh(step)

    assert step.status == "running"

    # 状态转换: running -> passed
    step.status = "passed"
    step.completed_at = datetime.now(timezone.utc)
    await db_session.commit()
    await db_session.refresh(step)

    assert step.status == "passed"
    assert step.completed_at is not None


@pytest.mark.asyncio
async def test_execution_step_error_message(db_session):
    """测试执行步骤错误信息"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        status="running",
    )
    db_session.add(execution)
    await db_session.commit()

    scenario = Scenario(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试场景1",
    )
    db_session.add(scenario)
    await db_session.commit()

    step = PlanExecutionStep(
        id=str(uuid.uuid4()),
        test_plan_execution_id=execution.id,
        scenario_id=scenario.id,
        status="failed",
        error_message="Assertion failed: Expected 200 but got 500",
    )
    db_session.add(step)
    await db_session.commit()
    await db_session.refresh(step)

    assert step.status == "failed"
    assert step.error_message == "Assertion failed: Expected 200 but got 500"


@pytest.mark.asyncio
async def test_execution_step_relationship(db_session):
    """测试执行步骤与执行记录的关系"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        status="running",
    )
    db_session.add(execution)
    await db_session.commit()

    scenario = Scenario(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试场景1",
    )
    db_session.add(scenario)
    await db_session.commit()

    step = PlanExecutionStep(
        id=str(uuid.uuid4()),
        test_plan_execution_id=execution.id,
        scenario_id=scenario.id,
        status="pending",
    )
    db_session.add(step)
    await db_session.commit()
    await db_session.refresh(step)

    # 验证关系
    assert step.test_plan_execution_id == execution.id
    assert step.scenario_id == scenario.id
    assert step.status == "pending"


# ========== 综合测试 ==========


@pytest.mark.asyncio
async def test_full_test_plan_workflow(db_session):
    """测试完整测试计划工作流"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    # 1. 创建测试计划
    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="完整测试计划",
        description="包含多个场景的测试计划",
    )
    db_session.add(plan)
    await db_session.commit()

    # 2. 创建测试场景
    scenario1 = Scenario(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="场景1",
    )
    scenario2 = Scenario(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="场景2",
    )
    db_session.add_all([scenario1, scenario2])
    await db_session.commit()

    # 3. 添加场景到测试计划
    plan_scenario1 = PlanScenario(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        scenario_id=scenario1.id,
        execution_order=1,
    )
    plan_scenario2 = PlanScenario(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        scenario_id=scenario2.id,
        execution_order=2,
    )
    db_session.add_all([plan_scenario1, plan_scenario2])
    await db_session.commit()

    # 4. 创建测试执行记录
    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        status="running",
        total_scenarios=2,
    )
    db_session.add(execution)
    await db_session.commit()

    # 5. 创建执行步骤
    step1 = PlanExecutionStep(
        id=str(uuid.uuid4()),
        test_plan_execution_id=execution.id,
        scenario_id=scenario1.id,
        status="passed",
    )
    step2 = PlanExecutionStep(
        id=str(uuid.uuid4()),
        test_plan_execution_id=execution.id,
        scenario_id=scenario2.id,
        status="running",
    )
    db_session.add_all([step1, step2])
    await db_session.commit()

    # 验证整个工作流 (不访问关系以避免 greenlet 错误)
    # 测试计划有 2 个场景
    plan_scenarios_result = await db_session.execute(
        select(PlanScenario).where(PlanScenario.test_plan_id == plan.id)
    )
    plan_scenarios = plan_scenarios_result.scalars().all()
    assert len(plan_scenarios) == 2

    # 执行记录有 2 个场景
    assert execution.total_scenarios == 2


@pytest.mark.asyncio
async def test_execution_with_multiple_steps(db_session):
    """测试多步骤执行"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        status="running",
        total_scenarios=3,
    )
    db_session.add(execution)
    await db_session.commit()

    # 创建 3 个场景
    scenarios = []
    for i in range(1, 4):
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name=f"场景{i}",
        )
        db_session.add(scenario)
        scenarios.append(scenario)
    await db_session.commit()

    # 创建 3 个执行步骤
    steps = []
    for i, scenario in enumerate(scenarios, 1):
        step = PlanExecutionStep(
            id=str(uuid.uuid4()),
            test_plan_execution_id=execution.id,
            scenario_id=scenario.id,
            status="passed" if i < 3 else "running",
        )
        db_session.add(step)
        steps.append(step)
    await db_session.commit()

    # 验证有 3 个执行步骤 (使用查询而不是关系访问)
    from sqlalchemy import select
    steps_result = await db_session.execute(
        select(PlanExecutionStep).where(PlanExecutionStep.test_plan_execution_id == execution.id)
    )
    execution_steps = steps_result.scalars().all()
    assert len(execution_steps) == 3


@pytest.mark.asyncio
async def test_statistics_calculation(db_session):
    """测试统计计算"""
    import uuid

    from app.models.project import Project
    from app.models.user import User

    user = User(id=str(uuid.uuid4()), username="testuser", email="test@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()

    project = Project(
        id=str(uuid.uuid4()),
        name="测试项目",
        created_by=user.id,
    )
    db_session.add(project)
    await db_session.commit()

    plan = TestPlan(
        id=str(uuid.uuid4()),
        project_id=project.id,
        name="测试计划1",
    )
    db_session.add(plan)
    await db_session.commit()

    # 模拟执行统计
    execution = TestPlanExecution(
        id=str(uuid.uuid4()),
        test_plan_id=plan.id,
        status="completed",
        total_scenarios=10,
        passed_scenarios=7,
        failed_scenarios=2,
        skipped_scenarios=1,
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
    )
    db_session.add(execution)
    await db_session.commit()
    await db_session.refresh(execution)

    # 验证统计字段
    assert execution.total_scenarios == 10
    assert execution.passed_scenarios == 7
    assert execution.failed_scenarios == 2
    assert execution.skipped_scenarios == 1
    assert execution.status == "completed"
    assert execution.started_at is not None
    assert execution.completed_at is not None
