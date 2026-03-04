"""Celery 异步任务 - 执行测试计划和场景

这个模块定义了 Celery 任务,用于异步执行测试计划和场景。
支持取消、暂停和进度推送。
"""
import asyncio
from collections.abc import Callable
from datetime import datetime

from celery import shared_task

from app.core.db import async_session_maker
from app.core.redis import get_redis
from app.modules.execution.websocket import get_manager


class TaskCancelledError(Exception):
    """任务被取消异常"""
    pass


class TaskPausedError(Exception):
    """任务被暂停异常"""
    pass


async def is_task_cancelled(task_id: str) -> bool:
    """检查任务是否被取消

    Args:
        task_id: Celery 任务 ID

    Returns:
        True 如果任务已被取消,否则 False
    """
    redis = await get_redis()
    return await redis.exists(f"task:cancel:{task_id}")


async def is_task_paused(task_id: str) -> bool:
    """检查任务是否被暂停

    Args:
        task_id: Celery 任务 ID

    Returns:
        True 如果任务已被暂停,否则 False
    """
    redis = await get_redis()
    return await redis.exists(f"task:pause:{task_id}")


async def update_execution_status(execution_id: str, status: str, **kwargs):
    """更新执行状态(数据库操作)

    Args:
        execution_id: 执行记录 ID
        status: 新状态
        **kwargs: 其他要更新的字段
    """
    from app.models_new.execution import Execution

    async with async_session_maker() as session:
        execution = await session.get(Execution, execution_id)
        if execution:
            execution.status = status
            for key, value in kwargs.items():
                if hasattr(execution, key):
                    setattr(execution, key, value)
            await session.commit()


async def push_progress(execution_id: str, data: dict):
    """推送执行进度到 WebSocket

    Args:
        execution_id: 执行记录 ID
        data: 要推送的数据
    """
    manager = get_manager()
    await manager.broadcast(execution_id, data)


async def run_plan(
    execution_id: str,
    plan_id: str,
    environment_id: str,
    task_id: str,
    check_cancelled: Callable,
    check_paused: Callable,
    on_progress: Callable,
) -> dict:
    """执行测试计划

    TODO: 这是执行引擎的核心,目前是简化版本
    后续需要集成 sisyphus-api-engine

    Args:
        execution_id: 执行记录 ID
        plan_id: 测试计划 ID
        environment_id: 环境 ID
        task_id: Celery 任务 ID
        check_cancelled: 检查是否取消的函数
        check_paused: 检查是否暂停的函数
        on_progress: 推送进度的函数

    Returns:
        执行结果字典

    Raises:
        TaskCancelledError: 任务被取消
        ValueError: 计划或环境不存在
    """
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.models_new.environment import Environment
    from app.models_new.plan import TestPlan

    async with async_session_maker() as session:
        # 获取计划
        result = await session.execute(
            select(TestPlan)
            .options(selectinload(TestPlan.plan_scenarios))
            .where(TestPlan.id == plan_id)
        )
        plan = result.scalar_one_or_none()
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")

        # 获取环境
        environment = await session.get(Environment, environment_id)
        if not environment:
            raise ValueError(f"Environment {environment_id} not found")

        total_scenarios = len(plan.plan_scenarios)
        passed = 0
        failed = 0
        skipped = 0
        started_at = datetime.utcnow()

        # 遍历场景
        for idx, plan_scenario in enumerate(plan.plan_scenarios):
            # 检查取消信号
            if await check_cancelled():
                raise TaskCancelledError()

            # 检查暂停信号
            while await check_paused():
                await asyncio.sleep(1)

            # 推送场景开始事件
            await on_progress({
                "type": "scenario_started",
                "execution_id": execution_id,
                "scenario_id": str(plan_scenario.scenario_id),
                "scenario_name": f"Scenario {idx + 1}",
                "current": idx + 1,
                "total": total_scenarios,
            })

            # TODO: 实际执行场景(调用 sisyphus-api-engine)
            # 目前模拟执行
            await asyncio.sleep(0.5)  # 模拟执行时间

            # 模拟结果
            import random
            if random.random() > 0.2:
                passed += 1
                step_status = "passed"
            else:
                failed += 1
                step_status = "failed"

            # 推送步骤完成事件
            await on_progress({
                "type": "step_completed",
                "execution_id": execution_id,
                "scenario_id": str(plan_scenario.scenario_id),
                "step_name": f"Step {idx + 1}",
                "status": step_status,
                "duration_ms": 500,
            })

        finished_at = datetime.utcnow()
        duration_ms = int((finished_at - started_at).total_seconds() * 1000)

        # 推送执行完成事件
        await on_progress({
            "type": "execution_completed",
            "execution_id": execution_id,
            "status": "completed",
            "total_scenarios": total_scenarios,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "duration_ms": duration_ms,
        })

        return {
            "total_scenarios": total_scenarios,
            "passed_scenarios": passed,
            "failed_scenarios": failed,
            "skipped_scenarios": skipped,
            "started_at": started_at,
            "finished_at": finished_at,
        }


async def run_scenario(
    execution_id: str,
    scenario_id: str,
    environment_id: str,
    task_id: str,
    check_cancelled: Callable,
    check_paused: Callable,
    on_progress: Callable,
) -> dict:
    """执行单个场景

    TODO: 这是执行引擎的核心,目前是简化版本
    后续需要集成 sisyphus-api-engine

    Args:
        execution_id: 执行记录 ID
        scenario_id: 场景 ID
        environment_id: 环境 ID
        task_id: Celery 任务 ID
        check_cancelled: 检查是否取消的函数
        check_paused: 检查是否暂停的函数
        on_progress: 推送进度的函数

    Returns:
        执行结果字典

    Raises:
        TaskCancelledError: 任务被取消
        ValueError: 场景或环境不存在
    """
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.models.scenario import Scenario
    from app.models_new.environment import Environment

    async with async_session_maker() as session:
        # 获取场景
        result = await session.execute(
            select(Scenario)
            .options(selectinload(Scenario.steps))
            .where(Scenario.id == scenario_id)
        )
        scenario = result.scalar_one_or_none()
        if not scenario:
            raise ValueError(f"Scenario {scenario_id} not found")

        # 获取环境
        environment = await session.get(Environment, environment_id)
        if not environment:
            raise ValueError(f"Environment {environment_id} not found")

        passed = 0
        failed = 0
        skipped = 0
        started_at = datetime.utcnow()

        # 推送场景开始事件
        await on_progress({
            "type": "scenario_started",
            "execution_id": execution_id,
            "scenario_id": str(scenario_id),
            "scenario_name": scenario.name,
            "current": 1,
            "total": 1,
        })

        # 检查取消信号
        if await check_cancelled():
            raise TaskCancelledError()

        # 检查暂停信号
        while await check_paused():
            await asyncio.sleep(1)

        # TODO: 实际执行场景(调用 sisyphus-api-engine)
        # 目前模拟执行
        await asyncio.sleep(0.5)  # 模拟执行时间

        # 模拟结果
        import random
        if random.random() > 0.2:
            passed += 1
            step_status = "passed"
        else:
            failed += 1
            step_status = "failed"

        # 推送步骤完成事件
        await on_progress({
            "type": "step_completed",
            "execution_id": execution_id,
            "scenario_id": str(scenario_id),
            "step_name": scenario.name,
            "status": step_status,
            "duration_ms": 500,
        })

        finished_at = datetime.utcnow()
        duration_ms = int((finished_at - started_at).total_seconds() * 1000)

        # 推送执行完成事件
        await on_progress({
            "type": "execution_completed",
            "execution_id": execution_id,
            "status": "completed",
            "total_scenarios": 1,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "duration_ms": duration_ms,
        })

        return {
            "total_scenarios": 1,
            "passed_scenarios": passed,
            "failed_scenarios": failed,
            "skipped_scenarios": skipped,
            "started_at": started_at,
            "finished_at": finished_at,
        }


@shared_task(bind=True, max_retries=0)
def execute_plan_task(self, execution_id: str, plan_id: str, environment_id: str):
    """执行测试计划的 Celery 任务

    Args:
        execution_id: 执行记录 ID
        plan_id: 测试计划 ID
        environment_id: 环境 ID

    Returns:
        执行结果字典
    """
    task_id = self.request.id

    # 更新执行记录
    asyncio.run(update_execution_status(
        execution_id,
        status="running",
        celery_task_id=task_id,
        started_at=datetime.utcnow(),
    ))

    try:
        # 执行测试计划
        result = asyncio.run(run_plan(
            execution_id=execution_id,
            plan_id=plan_id,
            environment_id=environment_id,
            task_id=task_id,
            check_cancelled=lambda: is_task_cancelled(task_id),
            check_paused=lambda: is_task_paused(task_id),
            on_progress=lambda data: push_progress(execution_id, data),
        ))

        # 更新完成状态
        asyncio.run(update_execution_status(
            execution_id,
            status="completed",
            **result
        ))

        return result

    except TaskCancelledError:
        asyncio.run(update_execution_status(
            execution_id,
            status="cancelled",
            finished_at=datetime.utcnow(),
        ))
        return {"status": "cancelled"}

    except Exception as e:
        asyncio.run(update_execution_status(
            execution_id,
            status="failed",
            error_message=str(e),
            finished_at=datetime.utcnow(),
        ))
        raise


@shared_task(bind=True, max_retries=0)
def execute_scenario_task(self, execution_id: str, scenario_id: str, environment_id: str):
    """执行单个场景的 Celery 任务

    Args:
        execution_id: 执行记录 ID
        scenario_id: 场景 ID
        environment_id: 环境 ID

    Returns:
        执行结果字典
    """
    task_id = self.request.id

    # 更新执行记录
    asyncio.run(update_execution_status(
        execution_id,
        status="running",
        celery_task_id=task_id,
        started_at=datetime.utcnow(),
    ))

    try:
        # 执行场景
        result = asyncio.run(run_scenario(
            execution_id=execution_id,
            scenario_id=scenario_id,
            environment_id=environment_id,
            task_id=task_id,
            check_cancelled=lambda: is_task_cancelled(task_id),
            check_paused=lambda: is_task_paused(task_id),
            on_progress=lambda data: push_progress(execution_id, data),
        ))

        # 更新完成状态
        asyncio.run(update_execution_status(
            execution_id,
            status="completed",
            **result
        ))

        return result

    except TaskCancelledError:
        asyncio.run(update_execution_status(
            execution_id,
            status="cancelled",
            finished_at=datetime.utcnow(),
        ))
        return {"status": "cancelled"}

    except Exception as e:
        asyncio.run(update_execution_status(
            execution_id,
            status="failed",
            error_message=str(e),
            finished_at=datetime.utcnow(),
        ))
        raise
