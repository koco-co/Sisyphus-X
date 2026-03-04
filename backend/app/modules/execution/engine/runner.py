"""
执行引擎核心 - runner.py

负责协调场景执行的各个组件
"""
import asyncio
import random
from collections.abc import Callable
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import selectinload


class TaskCancelledError(Exception):
    """任务被取消"""
    pass


class TaskPausedError(Exception):
    """任务被暂停"""
    pass


async def check_task_signals(task_id: str) -> tuple[bool, bool]:
    """检查任务的取消和暂停信号

    Returns:
        (is_cancelled, is_paused)
    """
    from app.core.redis import get_redis

    redis = await get_redis()
    is_cancelled = await redis.exists(f"task:cancel:{task_id}")
    is_paused = await redis.exists(f"task:pause:{task_id}")
    return bool(is_cancelled), bool(is_paused)


async def wait_while_paused(task_id: str, check_interval: float = 1.0):
    """等待暂停解除"""
    while True:
        _, is_paused = await check_task_signals(task_id)
        if not is_paused:
            break
        await asyncio.sleep(check_interval)


async def run_scenario_with_engine(
    execution_id: str,
    scenario_id: str,
    environment_id: str,
    task_id: str,
    on_step_complete: Callable,
    variables: dict[str, Any] | None = None,
    dataset_row: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """使用 sisyphus-api-engine 执行单个场景

    TODO: 当前是简化版本，需要集成 sisyphus-api-engine

    Args:
        execution_id: 执行记录 ID
        scenario_id: 场景 ID
        environment_id: 环境 ID
        task_id: Celery 任务 ID
        on_step_complete: 步骤完成回调
        variables: 变量覆盖
        dataset_row: 数据集行数据

    Returns:
        执行结果字典
    """
    from app.core.db import async_session_maker
    from app.models_new.environment import Environment
    from app.models_new.execution import ExecutionStep
    from app.models_new.scenario import Scenario

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

        # 准备执行
        started_at = datetime.utcnow()
        passed_steps = 0
        failed_steps = 0
        total_steps = len(scenario.steps)

        # 遍历步骤
        for idx, step in enumerate(scenario.steps):
            # 检查取消/暂停信号
            is_cancelled, is_paused = await check_task_signals(task_id)
            if is_cancelled:
                raise TaskCancelledError()
            if is_paused:
                await wait_while_paused(task_id)

            step_started = datetime.utcnow()

            # TODO: 实际调用 sisyphus-api-engine 执行步骤
            # 目前模拟执行
            await asyncio.sleep(0.1)

            step_finished = datetime.utcnow()
            duration_ms = int((step_finished - step_started).total_seconds() * 1000)

            # 模拟结果
            step_status = "passed" if random.random() > 0.1 else "failed"

            if step_status == "passed":
                passed_steps += 1
            else:
                failed_steps += 1

            # 创建执行步骤记录
            exec_step = ExecutionStep(
                execution_id=execution_id,
                scenario_id=scenario_id,
                step_name=step.name,
                status=step_status,
                started_at=step_started,
                finished_at=step_finished,
                request_data={"method": step.keyword_method, "config": step.config},
                response_data=None,
                assertions=None,
            )
            session.add(exec_step)
            await session.commit()
            await session.refresh(exec_step)

            # 回调通知
            await on_step_complete({
                "type": "step_completed",
                "execution_id": execution_id,
                "scenario_id": str(scenario_id),
                "step_id": str(exec_step.id),
                "step_name": step.name,
                "status": step_status,
                "duration_ms": duration_ms,
                "current": idx + 1,
                "total": total_steps,
            })

        finished_at = datetime.utcnow()
        total_duration_ms = int((finished_at - started_at).total_seconds() * 1000)

        return {
            "scenario_id": str(scenario_id),
            "status": "passed" if failed_steps == 0 else "failed",
            "total_steps": total_steps,
            "passed_steps": passed_steps,
            "failed_steps": failed_steps,
            "started_at": started_at,
            "finished_at": finished_at,
            "duration_ms": total_duration_ms,
        }
