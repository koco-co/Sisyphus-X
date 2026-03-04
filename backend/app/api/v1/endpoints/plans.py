import asyncio
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

# WebSocket 进度推送 (BE-050)
from app.api.v1.endpoints.websocket import manager as ws_manager
from app.core.db import get_session
from app.models.report import TestReport
from app.models.scenario import Scenario, ScenarioStep
from app.models.test_plan import PlanExecutionStep, PlanScenario, TestPlan, TestPlanExecution
from app.schemas.plan import PlanCreate, PlanUpdate
from app.schemas.test_plan import (
    PlanExecutionStepResponse,
    TestPlanExecutionResponse,
)
from app.services.engine_executor import EngineExecutor
from app.utils.datetime import utcnow

router = APIRouter()


# ========== 执行管理器 ==========


class ExecutionManager:
    """测试执行管理器 - 管理后台执行任务"""

    def __init__(self):
        # 存储执行任务 (用于终止/暂停/恢复)
        self.tasks: dict[str, asyncio.Task] = {}
        # 存储执行状态: pending, running, paused, completed, failed, cancelled
        self.status: dict[str, str] = {}

    async def run_execution(
        self,
        execution_id: str,
        plan_id: str,
        session: AsyncSession,
    ):
        """后台执行测试计划的异步任务"""
        try:
            # 更新执行状态为 running
            self.status[execution_id] = "running"

            # 获取执行记录
            execution = await session.get(TestPlanExecution, execution_id)
            if not execution:
                self.status[execution_id] = "failed"
                return

            # 更新执行记录
            execution.status = "running"
            execution.started_at = utcnow()
            await session.commit()

            # 获取测试计划及其关联的场景
            result = await session.execute(
                select(PlanScenario)
                .where(PlanScenario.test_plan_id == plan_id)
                .order_by(PlanScenario.execution_order)
            )
            plan_scenarios = list(result.scalars().all())

            # 更新场景总数
            execution.total_scenarios = len(plan_scenarios)
            await session.commit()

            await ws_manager.broadcast_to_execution(
                execution_id,
                {"type": "progress", "data": {"status": "running", "total": len(plan_scenarios), "current": 0}},
            )

            # 逐个执行场景
            for idx, plan_scenario in enumerate(plan_scenarios):
                # 检查是否被取消或暂停
                current_status = self.status.get(execution_id, "running")
                if current_status == "cancelled":
                    execution.status = "cancelled"
                    execution.completed_at = utcnow()
                    await session.commit()
                    await ws_manager.broadcast_to_execution(execution_id, {"type": "completed", "data": {"status": "cancelled"}})
                    return
                elif current_status == "paused":
                    # 等待恢复
                    while self.status.get(execution_id) == "paused":
                        await asyncio.sleep(0.5)
                        # 再次检查是否被取消
                        if self.status.get(execution_id) == "cancelled":
                            execution.status = "cancelled"
                            execution.completed_at = utcnow()
                            await session.commit()
                            return

                # 创建执行步骤
                step = PlanExecutionStep(
                    id=str(uuid4()),
                    test_plan_execution_id=execution_id,
                    scenario_id=plan_scenario.scenario_id,
                    status="running",
                    started_at=utcnow(),
                )
                session.add(step)
                await session.commit()

                await ws_manager.broadcast_to_execution(
                    execution_id,
                    {"type": "step_started", "data": {"scenario_id": plan_scenario.scenario_id, "index": idx}},
                )

                # 实际执行场景：生成 YAML -> 调用 sisyphus-api-engine -> 更新步骤与报告 (BE-047, BE-052)
                scenario = await session.get(Scenario, plan_scenario.scenario_id)
                if not scenario:
                    step.status = "failed"
                    step.error_message = "场景不存在"
                    step.completed_at = utcnow()
                    execution.failed_scenarios += 1
                    await session.commit()
                    continue

                steps_result = await session.execute(
                    select(ScenarioStep)
                    .where(ScenarioStep.scenario_id == plan_scenario.scenario_id)
                    .order_by(ScenarioStep.sort_order)
                )
                steps_list = list(steps_result.scalars().all())
                if not steps_list:
                    step.status = "skipped"
                    step.completed_at = utcnow()
                    execution.skipped_scenarios += 1
                    await session.commit()
                    continue

                from app.api.v1.endpoints.scenarios import _generate_scenario_yaml

                yaml_content = _generate_scenario_yaml(
                    scenario=scenario,
                    steps=steps_list,
                    env_vars=None,
                    dataset_vars=None,
                    override_vars=None,
                )
                executor = EngineExecutor()
                try:
                    run_result = await asyncio.to_thread(
                        executor.execute, yaml_content, None, 300
                    )
                except Exception as e:
                    run_result = {"success": False, "result": {}, "error": str(e)}

                step.completed_at = utcnow()
                if run_result.get("success"):
                    step.status = "passed"
                    execution.passed_scenarios += 1
                else:
                    step.status = "failed"
                    step.error_message = run_result.get("error", "执行失败")[:500]
                    execution.failed_scenarios += 1

                # 报告自动持久化 (BE-052)
                engine_out = run_result.get("result") or {}
                summary = engine_out.get("summary") or {}
                total_steps = summary.get("total_steps", 1)
                passed_steps = summary.get("passed_steps", 1 if run_result.get("success") else 0)
                failed_steps = summary.get("failed_steps", 0 if run_result.get("success") else 1)
                duration_ms = engine_out.get("duration") or 0
                if isinstance(duration_ms, (int, float)):
                    duration_str = f"{duration_ms / 1000}s" if duration_ms >= 1000 else f"{duration_ms}ms"
                else:
                    duration_str = str(duration_ms)
                test_report = TestReport(
                    scenario_id=scenario.id,
                    name=scenario.name,
                    status="success" if run_result.get("success") else "failed",
                    total=total_steps,
                    success=passed_steps,
                    failed=failed_steps,
                    duration=duration_str,
                    start_time=step.started_at or utcnow(),
                    end_time=step.completed_at,
                )
                session.add(test_report)
                await session.commit()

                await ws_manager.broadcast_to_execution(
                    execution_id,
                    {
                        "type": "step_completed",
                        "data": {
                            "scenario_id": plan_scenario.scenario_id,
                            "index": idx,
                            "status": step.status,
                            "passed": execution.passed_scenarios,
                            "failed": execution.failed_scenarios,
                        },
                    },
                )

            # 执行完成
            execution.status = "completed"
            execution.completed_at = utcnow()
            self.status[execution_id] = "completed"
            await session.commit()
            await ws_manager.broadcast_to_execution(
                execution_id,
                {
                    "type": "completed",
                    "data": {
                        "status": "completed",
                        "passed": execution.passed_scenarios,
                        "failed": execution.failed_scenarios,
                        "total": execution.total_scenarios,
                    },
                },
            )

        except Exception as e:
            # 执行失败
            self.status[execution_id] = "failed"
            if execution:
                execution.status = "failed"
                execution.completed_at = utcnow()
                await session.commit()
                await ws_manager.broadcast_to_execution(
                    execution_id, {"type": "error", "data": {"message": str(e), "status": "failed"}}
                )
        finally:
            # 清理任务
            if execution_id in self.tasks:
                del self.tasks[execution_id]


# 全局执行管理器实例
execution_manager = ExecutionManager()


async def get_plan_scenario_id(plan_id: str, session: AsyncSession) -> str | None:
    """获取测试计划关联的第一个场景ID"""
    result = await session.execute(
        select(PlanScenario.scenario_id)
        .where(PlanScenario.test_plan_id == plan_id)
        .order_by(PlanScenario.execution_order)
        .limit(1)
    )
    scenario_id = result.scalar_one_or_none()
    return scenario_id


async def enrich_plan_response(plan: TestPlan, session: AsyncSession) -> dict:
    """为测试计划响应添加关联信息"""
    plan_dict = {
        "id": plan.id,
        "project_id": plan.project_id,
        "name": plan.name,
        "description": plan.description,
        "cron_expression": plan.cron_expression,
        "status": plan.status,
        "next_run": plan.next_run,
        "last_run": plan.last_run,
        "scenario_id": await get_plan_scenario_id(plan.id, session),
        "created_at": plan.created_at,
        "updated_at": plan.updated_at
    }
    return plan_dict


@router.get("/")
async def list_plans(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """获取测试计划列表 (分页)"""
    skip = (page - 1) * size
    statement = select(TestPlan).order_by(TestPlan.created_at.desc())
    count_statement = select(func.count()).select_from(TestPlan)

    total = int((await session.execute(count_statement)).scalar_one() or 0)
    result = await session.execute(statement.offset(skip).limit(size))
    plans = list(result.scalars().all())

    # 丰富响应数据
    items = [await enrich_plan_response(plan, session) for plan in plans]

    pages = (total + size - 1) // size

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }


@router.post("/")
async def create_plan(data: PlanCreate, session: AsyncSession = Depends(get_session)):
    """创建测试计划"""
    # 检查场景是否存在
    scenario = await session.get(Scenario, data.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # 创建测试计划
    plan_data = {
        "id": str(uuid4()),
        "project_id": scenario.project_id,
        "name": data.name,
        "cron_expression": data.cron_expression,
        "status": data.status,
        "description": None
    }
    plan = TestPlan(**plan_data)

    # 创建计划与场景的关联
    plan_scenario = PlanScenario(
        id=str(uuid4()),
        test_plan_id=plan.id,
        scenario_id=data.scenario_id,
        execution_order=0
    )

    session.add(plan)
    session.add(plan_scenario)
    await session.commit()
    await session.refresh(plan)

    return await enrich_plan_response(plan, session)


@router.get("/{plan_id}")
async def get_plan(plan_id: str, session: AsyncSession = Depends(get_session)):
    """获取单个测试计划"""
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return await enrich_plan_response(plan, session)


@router.put("/{plan_id}")
async def update_plan(plan_id: str, data: PlanUpdate, session: AsyncSession = Depends(get_session)):
    """更新测试计划"""
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # 更新字段
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plan, key, value)

    plan.updated_at = utcnow()
    await session.commit()
    await session.refresh(plan)

    return await enrich_plan_response(plan, session)


@router.delete("/{plan_id}")
async def delete_plan(plan_id: str, session: AsyncSession = Depends(get_session)):
    """删除测试计划"""
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    await session.delete(plan)
    await session.commit()
    return {"deleted": plan_id}


@router.post("/{plan_id}/pause")
async def pause_plan(plan_id: str, session: AsyncSession = Depends(get_session)):
    """暂停测试计划"""
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan.status = "paused"
    plan.updated_at = utcnow()
    await session.commit()
    await session.refresh(plan)
    return await enrich_plan_response(plan, session)


@router.post("/{plan_id}/resume")
async def resume_plan(plan_id: str, session: AsyncSession = Depends(get_session)):
    """恢复测试计划"""
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan.status = "active"
    plan.updated_at = utcnow()
    await session.commit()
    await session.refresh(plan)
    return await enrich_plan_response(plan, session)


@router.post("/{plan_id}/trigger")
async def trigger_plan(plan_id: str, session: AsyncSession = Depends(get_session)):
    """手动触发测试计划执行（已废弃，请使用 /execute）"""
    return await execute_plan(plan_id, session)


# ========== 测试执行相关接口 ==========


@router.post("/{plan_id}/execute")
async def execute_plan(
    plan_id: str,
    session: AsyncSession = Depends(get_session),
):
    """执行测试计划"""
    # 检查测试计划是否存在
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # 检查是否有正在执行的任务
    for exec_id, status in execution_manager.status.items():
        if status in ["running", "pending"]:
            # 检查这个执行是否属于当前计划
            execution = await session.get(TestPlanExecution, exec_id)
            if execution and execution.test_plan_id == plan_id:
                raise HTTPException(
                    status_code=400, detail="测试计划已有正在执行的任务"
                )

    # 创建执行记录
    execution_id = str(uuid4())
    execution = TestPlanExecution(
        id=execution_id,
        test_plan_id=plan_id,
        status="pending",
        total_scenarios=0,
        passed_scenarios=0,
        failed_scenarios=0,
        skipped_scenarios=0,
    )
    session.add(execution)

    # 更新计划的最后运行时间
    plan.last_run = utcnow()
    await session.commit()
    await session.refresh(execution)

    # 初始化执行状态
    execution_manager.status[execution_id] = "pending"

    # 创建后台任务
    task = asyncio.create_task(
        execution_manager.run_execution(execution_id, plan_id, session)
    )
    execution_manager.tasks[execution_id] = task

    return {
        "execution_id": execution_id,
        "plan_id": plan_id,
        "status": "pending",
        "message": "测试计划已开始执行",
    }


@router.post("/{plan_id}/terminate")
async def terminate_plan(plan_id: str, session: AsyncSession = Depends(get_session)):
    """终止正在执行的测试计划"""
    # 查找该计划正在执行的任务
    terminated_count = 0
    for exec_id, status in list(execution_manager.status.items()):
        if status in ["pending", "running"]:
            execution = await session.get(TestPlanExecution, exec_id)
            if execution and execution.test_plan_id == plan_id:
                # 取消执行
                execution_manager.status[exec_id] = "cancelled"

                # 取消任务
                if exec_id in execution_manager.tasks:
                    task = execution_manager.tasks[exec_id]
                    if not task.done():
                        task.cancel()
                    del execution_manager.tasks[exec_id]

                # 更新执行记录
                execution.status = "cancelled"
                execution.completed_at = utcnow()
                await session.commit()

                terminated_count += 1

    if terminated_count == 0:
        raise HTTPException(
            status_code=400, detail="没有找到正在执行的任务"
        )

    return {
        "plan_id": plan_id,
        "terminated_count": terminated_count,
        "message": f"已终止 {terminated_count} 个执行任务"
    }


@router.post("/{plan_id}/pause")
async def pause_plan_execution(plan_id: str, session: AsyncSession = Depends(get_session)):
    """暂停正在执行的测试计划"""
    paused_count = 0
    for exec_id, status in list(execution_manager.status.items()):
        if status == "running":
            execution = await session.get(TestPlanExecution, exec_id)
            if execution and execution.test_plan_id == plan_id:
                execution_manager.status[exec_id] = "paused"
                paused_count += 1

    if paused_count == 0:
        raise HTTPException(
            status_code=400, detail="没有找到正在运行的任务"
        )

    return {
        "plan_id": plan_id,
        "paused_count": paused_count,
        "message": f"已暂停 {paused_count} 个执行任务"
    }


@router.post("/{plan_id}/resume")
async def resume_plan_execution(plan_id: str, session: AsyncSession = Depends(get_session)):
    """恢复已暂停的测试计划"""
    resumed_count = 0
    for exec_id, status in list(execution_manager.status.items()):
        if status == "paused":
            execution = await session.get(TestPlanExecution, exec_id)
            if execution and execution.test_plan_id == plan_id:
                execution_manager.status[exec_id] = "running"
                resumed_count += 1

    if resumed_count == 0:
        raise HTTPException(
            status_code=400, detail="没有找到已暂停的任务"
        )

    return {
        "plan_id": plan_id,
        "resumed_count": resumed_count,
        "message": f"已恢复 {resumed_count} 个执行任务"
    }


@router.get("/{plan_id}/executions")
async def list_plan_executions(
    plan_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """获取测试计划的执行记录列表（分页）"""
    # 检查测试计划是否存在
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    skip = (page - 1) * size

    # 查询执行记录
    statement = (
        select(TestPlanExecution)
        .where(TestPlanExecution.test_plan_id == plan_id)
        .order_by(TestPlanExecution.created_at.desc())
    )
    count_statement = select(func.count()).select_from(TestPlanExecution).where(
        TestPlanExecution.test_plan_id == plan_id
    )

    total = int((await session.execute(count_statement)).scalar_one() or 0)
    result = await session.execute(statement.offset(skip).limit(size))
    executions = list(result.scalars().all())

    # 转换为响应格式
    items = [TestPlanExecutionResponse.model_validate(exec) for exec in executions]

    pages = (total + size - 1) // size

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.get("/executions/{execution_id}")
async def get_execution(
    execution_id: str,
    session: AsyncSession = Depends(get_session),
):
    """获取执行记录详情"""
    execution = await session.get(TestPlanExecution, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    # 获取执行步骤
    result = await session.execute(
        select(PlanExecutionStep)
        .where(PlanExecutionStep.test_plan_execution_id == execution_id)
        .order_by(PlanExecutionStep.created_at)
    )
    steps = list(result.scalars().all())

    # 构建响应
    execution_response = TestPlanExecutionResponse.model_validate(execution)
    steps_response = [PlanExecutionStepResponse.model_validate(step) for step in steps]

    return {
        "execution": execution_response,
        "steps": steps_response,
        "current_status": execution_manager.status.get(execution_id, execution.status),
    }
