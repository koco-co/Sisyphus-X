"""测试计划模块服务层

提供测试计划和计划场景关联的业务逻辑处理。
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models_new.plan import PlanScenario, TestPlan
from app.models_new.scenario import Scenario
from app.modules.plan.schemas import (
    PlanScenarioBatchCreate,
    PlanScenarioCreate,
    PlanScenarioReorder,
    PlanScenarioUpdate,
    TestPlanCreate,
    TestPlanUpdate,
)
from app.utils.exceptions import NotFoundError, ValidationError


class TestPlanService:
    """测试计划服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(
        self,
        project_id: str,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[TestPlan], int]:
        """获取测试计划列表

        Args:
            project_id: 项目 ID
            search: 搜索关键词（匹配名称、描述）
            page: 页码
            page_size: 每页数量

        Returns:
            (测试计划列表, 总数)
        """
        query = select(TestPlan).where(TestPlan.project_id == project_id)

        # 搜索条件
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    TestPlan.name.ilike(search_pattern),
                    TestPlan.description.ilike(search_pattern),
                )
            )

        # 计算总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # 分页
        query = query.order_by(TestPlan.updated_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        plans = list(result.scalars().all())

        return plans, total

    async def get(self, plan_id: str) -> TestPlan:
        """获取测试计划详情

        Args:
            plan_id: 计划 ID

        Returns:
            测试计划对象

        Raises:
            NotFoundError: 测试计划不存在
        """
        result = await self.session.execute(
            select(TestPlan).where(TestPlan.id == plan_id)
        )
        plan = result.scalar_one_or_none()

        if not plan:
            raise NotFoundError("测试计划", plan_id)

        return plan

    async def create(self, project_id: str, data: TestPlanCreate) -> TestPlan:
        """创建测试计划

        Args:
            project_id: 项目 ID
            data: 创建数据

        Returns:
            创建的测试计划对象
        """
        plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=project_id,
            name=data.name,
            description=data.description,
        )
        self.session.add(plan)
        await self.session.commit()
        await self.session.refresh(plan)

        # 如果有场景关联，创建关联
        if data.scenarios:
            for idx, scenario_data in enumerate(data.scenarios):
                plan_scenario = PlanScenario(
                    id=str(uuid.uuid4()),
                    plan_id=plan.id,
                    scenario_id=scenario_data.scenario_id,
                    dataset_id=scenario_data.dataset_id,
                    variables_override=scenario_data.variables_override,
                    sort_order=scenario_data.sort_order or idx,
                )
                self.session.add(plan_scenario)
            await self.session.commit()
            await self.session.refresh(plan)

        return plan

    async def update(self, plan_id: str, data: TestPlanUpdate) -> TestPlan:
        """更新测试计划

        Args:
            plan_id: 计划 ID
            data: 更新数据

        Returns:
            更新后的测试计划对象

        Raises:
            NotFoundError: 测试计划不存在
        """
        plan = await self.get(plan_id)

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(plan, field, value)

        await self.session.commit()
        await self.session.refresh(plan)

        return plan

    async def delete(self, plan_id: str) -> None:
        """删除测试计划

        Args:
            plan_id: 计划 ID

        Raises:
            NotFoundError: 测试计划不存在
        """
        plan = await self.get(plan_id)
        await self.session.delete(plan)
        await self.session.commit()

    async def duplicate(self, plan_id: str, new_name: str) -> TestPlan:
        """复制测试计划

        Args:
            plan_id: 原计划 ID
            new_name: 新计划名称

        Returns:
            复制后的测试计划对象

        Raises:
            NotFoundError: 原计划不存在
        """
        # 获取原计划
        original = await self.get(plan_id)

        # 创建新计划
        new_plan = TestPlan(
            id=str(uuid.uuid4()),
            project_id=original.project_id,
            name=new_name,
            description=original.description,
        )
        self.session.add(new_plan)
        await self.session.commit()
        await self.session.refresh(new_plan)

        # 复制场景关联
        for ps in original.plan_scenarios:
            new_ps = PlanScenario(
                id=str(uuid.uuid4()),
                plan_id=new_plan.id,
                scenario_id=ps.scenario_id,
                dataset_id=ps.dataset_id,
                variables_override=ps.variables_override.copy() if ps.variables_override else {},
                sort_order=ps.sort_order,
            )
            self.session.add(new_ps)

        await self.session.commit()
        await self.session.refresh(new_plan)

        return new_plan


class PlanScenarioService:
    """计划场景关联服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, plan_id: str) -> list[PlanScenario]:
        """获取计划下的场景列表

        Args:
            plan_id: 计划 ID

        Returns:
            场景关联列表
        """
        result = await self.session.execute(
            select(PlanScenario)
            .where(PlanScenario.plan_id == plan_id)
            .order_by(PlanScenario.sort_order, PlanScenario.created_at)
        )
        return list(result.scalars().all())

    async def get(self, plan_scenario_id: str) -> PlanScenario:
        """获取计划场景关联详情

        Args:
            plan_scenario_id: 计划场景关联 ID

        Returns:
            计划场景关联对象

        Raises:
            NotFoundError: 计划场景关联不存在
        """
        result = await self.session.execute(
            select(PlanScenario).where(PlanScenario.id == plan_scenario_id)
        )
        ps = result.scalar_one_or_none()

        if not ps:
            raise NotFoundError("计划场景关联", plan_scenario_id)

        return ps

    async def add(self, plan_id: str, data: PlanScenarioCreate) -> PlanScenario:
        """添加场景到计划

        Args:
            plan_id: 计划 ID
            data: 创建数据

        Returns:
            创建的计划场景关联对象

        Raises:
            NotFoundError: 计划或场景不存在
        """
        # 验证计划存在
        plan = await self.session.get(TestPlan, plan_id)
        if not plan:
            raise NotFoundError("测试计划", plan_id)

        # 验证场景存在
        scenario = await self.session.get(Scenario, data.scenario_id)
        if not scenario:
            raise NotFoundError("场景", data.scenario_id)

        # 如果没有指定排序，获取当前最大排序值+1
        sort_order = data.sort_order
        if sort_order is None:
            max_order_result = await self.session.execute(
                select(func.max(PlanScenario.sort_order)).where(
                    PlanScenario.plan_id == plan_id
                )
            )
            max_order = max_order_result.scalar() or -1
            sort_order = max_order + 1

        plan_scenario = PlanScenario(
            id=str(uuid.uuid4()),
            plan_id=plan_id,
            scenario_id=data.scenario_id,
            dataset_id=data.dataset_id,
            variables_override=data.variables_override,
            sort_order=sort_order,
        )
        self.session.add(plan_scenario)
        await self.session.commit()
        await self.session.refresh(plan_scenario)

        return plan_scenario

    async def batch_add(
        self, plan_id: str, data: PlanScenarioBatchCreate
    ) -> list[PlanScenario]:
        """批量添加场景到计划

        Args:
            plan_id: 计划 ID
            data: 批量创建数据

        Returns:
            创建的计划场景关联列表

        Raises:
            NotFoundError: 计划不存在
        """
        # 验证计划存在
        plan = await self.session.get(TestPlan, plan_id)
        if not plan:
            raise NotFoundError("测试计划", plan_id)

        # 获取当前最大排序值
        max_order_result = await self.session.execute(
            select(func.max(PlanScenario.sort_order)).where(
                PlanScenario.plan_id == plan_id
            )
        )
        max_order = max_order_result.scalar() or -1

        plan_scenarios = []
        for idx, scenario_data in enumerate(data.scenarios):
            ps = PlanScenario(
                id=str(uuid.uuid4()),
                plan_id=plan_id,
                scenario_id=scenario_data.scenario_id,
                dataset_id=scenario_data.dataset_id,
                variables_override=scenario_data.variables_override,
                sort_order=scenario_data.sort_order or (max_order + idx + 1),
            )
            self.session.add(ps)
            plan_scenarios.append(ps)

        await self.session.commit()

        for ps in plan_scenarios:
            await self.session.refresh(ps)

        return plan_scenarios

    async def update(self, plan_scenario_id: str, data: PlanScenarioUpdate) -> PlanScenario:
        """更新计划场景关联

        Args:
            plan_scenario_id: 计划场景关联 ID
            data: 更新数据

        Returns:
            更新后的计划场景关联对象

        Raises:
            NotFoundError: 计划场景关联不存在
        """
        ps = await self.get(plan_scenario_id)

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(ps, field, value)

        await self.session.commit()
        await self.session.refresh(ps)

        return ps

    async def remove(self, plan_scenario_id: str) -> None:
        """移除场景关联

        Args:
            plan_scenario_id: 计划场景关联 ID

        Raises:
            NotFoundError: 计划场景关联不存在
        """
        ps = await self.get(plan_scenario_id)
        await self.session.delete(ps)
        await self.session.commit()

    async def reorder(self, plan_id: str, data: PlanScenarioReorder) -> list[PlanScenario]:
        """重排序场景

        Args:
            plan_id: 计划 ID
            data: 重排序数据

        Returns:
            重排序后的场景关联列表

        Raises:
            NotFoundError: 计划不存在
            ValidationError: 场景关联 ID 列表不完整
        """
        # 验证计划存在
        plan = await self.session.get(TestPlan, plan_id)
        if not plan:
            raise NotFoundError("测试计划", plan_id)

        # 获取现有场景关联
        existing_ps = await self.list(plan_id)
        existing_ids = {str(ps.id) for ps in existing_ps}
        provided_ids = set(data.plan_scenario_ids)

        # 验证 ID 列表完整性
        if existing_ids != provided_ids:
            raise ValidationError("提供的场景关联 ID 列表与现有场景不匹配")

        # 更新排序
        for idx, ps_id in enumerate(data.plan_scenario_ids):
            ps = await self.session.get(PlanScenario, ps_id)
            if ps:
                ps.sort_order = idx

        await self.session.commit()

        return await self.list(plan_id)
