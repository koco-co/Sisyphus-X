"""执行记录模块服务层

提供测试执行记录的业务逻辑处理。
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.redis import get_redis
from app.models_new.environment import Environment
from app.models_new.execution import Execution, ExecutionStep
from app.models_new.plan import TestPlan
from app.models_new.scenario import Scenario
from app.modules.execution.schemas import ExecutionCreate, ExecutionUpdate
from app.utils.exceptions import NotFoundError, ValidationError


class ExecutionService:
    """执行记录服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(
        self,
        project_id: str,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Execution], int]:
        """获取执行列表

        通过 plan 或 scenario 关联到 project 进行过滤。

        Args:
            project_id: 项目 ID
            status: 状态过滤
            page: 页码
            page_size: 每页数量

        Returns:
            (执行记录列表, 总数)
        """
        # 子查询：获取项目下的所有 plan_id
        plan_ids_subquery = select(TestPlan.id).where(TestPlan.project_id == project_id)

        # 子查询：获取项目下的所有 scenario_id
        scenario_ids_subquery = select(Scenario.id).where(Scenario.project_id == project_id)

        # 主查询：执行记录关联到项目的 plan 或 scenario
        query = select(Execution).where(
            or_(
                Execution.plan_id.in_(plan_ids_subquery),
                Execution.scenario_id.in_(scenario_ids_subquery),
            )
        )

        # 状态过滤
        if status:
            query = query.where(Execution.status == status)

        # 计算总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # 分页
        query = query.order_by(Execution.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        executions = list(result.scalars().all())

        return executions, total

    async def get(self, execution_id: str) -> Execution:
        """获取执行详情

        Args:
            execution_id: 执行记录 ID

        Returns:
            执行记录对象

        Raises:
            NotFoundError: 执行记录不存在
        """
        result = await self.session.execute(select(Execution).where(Execution.id == execution_id))
        execution = result.scalar_one_or_none()

        if not execution:
            raise NotFoundError("执行记录", execution_id)

        return execution

    async def get_with_details(self, execution_id: str) -> Execution:
        """获取执行详情（包含关联信息）

        Args:
            execution_id: 执行记录 ID

        Returns:
            执行记录对象（包含关联的 plan、environment 等信息）

        Raises:
            NotFoundError: 执行记录不存在
        """
        result = await self.session.execute(
            select(Execution)
            .options(
                joinedload(Execution.plan),
                joinedload(Execution.environment),
            )
            .where(Execution.id == execution_id)
        )
        execution = result.scalar_one_or_none()

        if not execution:
            raise NotFoundError("执行记录", execution_id)

        return execution

    async def create(
        self,
        project_id: str,
        data: ExecutionCreate,
        user_id: str,
    ) -> Execution:
        """创建执行记录

        Args:
            project_id: 项目 ID
            data: 创建数据
            user_id: 创建用户 ID

        Returns:
            创建的执行记录对象

        Raises:
            ValidationError: 参数验证失败
            NotFoundError: 资源不存在
        """
        # 验证至少指定了 plan_id 或 scenario_id 之一
        if not data.plan_id and not data.scenario_id:
            raise ValidationError("必须指定 plan_id 或 scenario_id")

        # 验证计划存在且属于项目
        if data.plan_id:
            plan = await self.session.get(TestPlan, data.plan_id)
            if not plan:
                raise NotFoundError("测试计划", data.plan_id)
            if plan.project_id != project_id:
                raise ValidationError("测试计划不属于该项目")

        # 验证场景存在且属于项目
        if data.scenario_id:
            scenario = await self.session.get(Scenario, data.scenario_id)
            if not scenario:
                raise NotFoundError("场景", data.scenario_id)
            if scenario.project_id != project_id:
                raise ValidationError("场景不属于该项目")

        # 验证环境存在且属于项目
        environment = await self.session.get(Environment, data.environment_id)
        if not environment:
            raise NotFoundError("环境", data.environment_id)
        if environment.project_id != project_id:
            raise ValidationError("环境不属于该项目")

        # 创建执行记录
        execution = Execution(
            id=str(uuid.uuid4()),
            plan_id=data.plan_id,
            scenario_id=data.scenario_id,
            environment_id=data.environment_id,
            status="pending",
            created_by=user_id,
        )
        self.session.add(execution)
        await self.session.commit()
        await self.session.refresh(execution)

        return execution

    async def update(
        self,
        execution_id: str,
        data: ExecutionUpdate,
    ) -> Execution:
        """更新执行记录

        Args:
            execution_id: 执行记录 ID
            data: 更新数据

        Returns:
            更新后的执行记录对象

        Raises:
            NotFoundError: 执行记录不存在
        """
        execution = await self.get(execution_id)

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(execution, field, value)

        await self.session.commit()
        await self.session.refresh(execution)

        return execution

    async def update_status(
        self,
        execution_id: str,
        status: str,
        **kwargs,
    ) -> Execution:
        """更新执行状态

        Args:
            execution_id: 执行记录 ID
            status: 新状态
            **kwargs: 其他需要更新的字段

        Returns:
            更新后的执行记录对象

        Raises:
            NotFoundError: 执行记录不存在
        """
        execution = await self.get(execution_id)
        execution.status = status

        for key, value in kwargs.items():
            if hasattr(execution, key):
                setattr(execution, key, value)

        await self.session.commit()
        await self.session.refresh(execution)

        return execution

    async def cancel_execution(self, execution_id: str) -> None:
        """终止执行

        Args:
            execution_id: 执行记录 ID

        Raises:
            NotFoundError: 执行记录不存在
            ValidationError: 当前状态不支持终止
        """
        execution = await self.get(execution_id)

        if execution.status not in ["pending", "running", "paused"]:
            raise ValidationError("当前状态不支持终止")

        # 1. Celery revoke
        if execution.celery_task_id:
            try:
                from app.core.celery_app import celery_app

                celery_app.control.revoke(
                    execution.celery_task_id,
                    terminate=True,
                    signal="SIGTERM",
                )
            except ImportError:
                pass  # Celery not installed, skip

        # 2. 设置 Redis 取消信号
        if execution.celery_task_id:
            redis_client = await get_redis()
            await redis_client.set(f"task:cancel:{execution.celery_task_id}", "1", ex=3600)

        # 3. 更新状态
        execution.status = "cancelled"
        execution.finished_at = datetime.utcnow()
        await self.session.commit()

    async def pause_execution(self, execution_id: str) -> None:
        """暂停执行

        Args:
            execution_id: 执行记录 ID

        Raises:
            NotFoundError: 执行记录不存在
            ValidationError: 只有运行中的执行可以暂停
        """
        execution = await self.get(execution_id)

        if execution.status != "running":
            raise ValidationError("只有运行中的执行可以暂停")

        if execution.celery_task_id:
            redis_client = await get_redis()
            await redis_client.set(f"task:pause:{execution.celery_task_id}", "1", ex=3600)

        execution.status = "paused"
        await self.session.commit()

    async def resume_execution(self, execution_id: str) -> None:
        """恢复执行

        Args:
            execution_id: 执行记录 ID

        Raises:
            NotFoundError: 执行记录不存在
            ValidationError: 只有暂停的执行可以恢复
        """
        execution = await self.get(execution_id)

        if execution.status != "paused":
            raise ValidationError("只有暂停的执行可以恢复")

        if execution.celery_task_id:
            redis_client = await get_redis()
            await redis_client.delete(f"task:pause:{execution.celery_task_id}")

        execution.status = "running"
        await self.session.commit()

    async def get_steps(self, execution_id: str) -> list[ExecutionStep]:
        """获取执行步骤列表

        Args:
            execution_id: 执行记录 ID

        Returns:
            执行步骤列表
        """
        result = await self.session.execute(
            select(ExecutionStep)
            .where(ExecutionStep.execution_id == execution_id)
            .order_by(ExecutionStep.started_at)
        )
        return list(result.scalars().all())

    async def add_step(
        self,
        execution_id: str,
        step_data: dict,
    ) -> ExecutionStep:
        """添加执行步骤

        Args:
            execution_id: 执行记录 ID
            step_data: 步骤数据

        Returns:
            创建的执行步骤对象
        """
        step = ExecutionStep(
            id=str(uuid.uuid4()),
            execution_id=execution_id,
            **step_data,
        )
        self.session.add(step)
        await self.session.commit()
        await self.session.refresh(step)

        return step

    async def get_execution_with_names(self, execution_id: str) -> dict:
        """获取执行记录及其关联名称

        Args:
            execution_id: 执行记录 ID

        Returns:
            包含执行记录和关联名称的字典
        """
        execution = await self.get(execution_id)

        result = {
            "execution": execution,
            "plan_name": None,
            "scenario_name": None,
            "environment_name": None,
        }

        if execution.plan_id:
            plan = await self.session.get(TestPlan, execution.plan_id)
            if plan:
                result["plan_name"] = plan.name

        if execution.scenario_id:
            scenario = await self.session.get(Scenario, execution.scenario_id)
            if scenario:
                result["scenario_name"] = scenario.name

        if execution.environment_id:
            environment = await self.session.get(Environment, execution.environment_id)
            if environment:
                result["environment_name"] = environment.name

        return result

    async def delete(self, execution_id: str) -> None:
        """删除执行记录

        Args:
            execution_id: 执行记录 ID

        Raises:
            NotFoundError: 执行记录不存在
            ValidationError: 运行中的执行不能删除
        """
        execution = await self.get(execution_id)

        if execution.status == "running":
            raise ValidationError("运行中的执行不能删除")

        await self.session.delete(execution)
        await self.session.commit()
