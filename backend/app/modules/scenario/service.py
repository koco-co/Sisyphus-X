"""场景模块服务层

提供测试场景、步骤、数据集的业务逻辑处理。
"""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models_new.scenario import DatasetRow, Scenario, ScenarioStep, TestDataset
from app.modules.scenario.schemas import (
    DatasetRowCreate,
    DatasetRowUpdate,
    ScenarioCreate,
    ScenarioStepBatchCreate,
    ScenarioStepCreate,
    ScenarioStepReorder,
    ScenarioStepUpdate,
    ScenarioUpdate,
    TestDatasetCreate,
    TestDatasetUpdate,
)
from app.utils.exceptions import NotFoundError, ValidationError


class ScenarioService:
    """场景服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(
        self,
        project_id: str,
        search: str | None = None,
        priority: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Scenario], int]:
        """获取场景列表

        Args:
            project_id: 项目 ID
            search: 搜索关键词（匹配名称、描述）
            priority: 优先级过滤
            page: 页码
            page_size: 每页数量

        Returns:
            (场景列表, 总数)
        """
        query = select(Scenario).where(Scenario.project_id == project_id)

        # 优先级过滤
        if priority:
            query = query.where(Scenario.priority == priority.upper())

        # 搜索条件
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Scenario.name.ilike(search_pattern),
                    Scenario.description.ilike(search_pattern),
                )
            )

        # 计算总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # 分页
        query = query.order_by(Scenario.updated_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        scenarios = list(result.scalars().all())

        return scenarios, total

    async def get(self, scenario_id: str) -> Scenario:
        """获取场景详情

        Args:
            scenario_id: 场景 ID

        Returns:
            场景对象

        Raises:
            NotFoundError: 场景不存在
        """
        result = await self.session.execute(
            select(Scenario).where(Scenario.id == scenario_id)
        )
        scenario = result.scalar_one_or_none()

        if not scenario:
            raise NotFoundError("场景", scenario_id)

        return scenario

    async def create(self, project_id: str, data: ScenarioCreate) -> Scenario:
        """创建场景

        Args:
            project_id: 项目 ID
            data: 创建数据

        Returns:
            创建的场景对象
        """
        scenario = Scenario(
            project_id=project_id,
            name=data.name,
            description=data.description,
            priority=data.priority,
            tags=data.tags,
            variables=data.variables,
            pre_sql=data.pre_sql,
            post_sql=data.post_sql,
        )
        self.session.add(scenario)
        await self.session.commit()
        await self.session.refresh(scenario)

        # 如果有步骤，创建步骤
        if data.steps:
            for idx, step_data in enumerate(data.steps):
                step = ScenarioStep(
                    scenario_id=scenario.id,
                    name=step_data.name,
                    keyword_type=step_data.keyword_type,
                    keyword_method=step_data.keyword_method,
                    config=step_data.config,
                    sort_order=step_data.sort_order or idx,
                )
                self.session.add(step)
            await self.session.commit()
            await self.session.refresh(scenario)

        return scenario

    async def update(self, scenario_id: str, data: ScenarioUpdate) -> Scenario:
        """更新场景

        Args:
            scenario_id: 场景 ID
            data: 更新数据

        Returns:
            更新后的场景对象

        Raises:
            NotFoundError: 场景不存在
        """
        scenario = await self.get(scenario_id)

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(scenario, field, value)

        await self.session.commit()
        await self.session.refresh(scenario)

        return scenario

    async def delete(self, scenario_id: str) -> None:
        """删除场景

        Args:
            scenario_id: 场景 ID

        Raises:
            NotFoundError: 场景不存在
        """
        scenario = await self.get(scenario_id)
        await self.session.delete(scenario)
        await self.session.commit()

    async def duplicate(self, scenario_id: str, new_name: str) -> Scenario:
        """复制场景

        Args:
            scenario_id: 原场景 ID
            new_name: 新场景名称

        Returns:
            复制后的场景对象

        Raises:
            NotFoundError: 原场景不存在
        """
        # 获取原场景
        original = await self.get(scenario_id)

        # 创建新场景
        new_scenario = Scenario(
            project_id=original.project_id,
            name=new_name,
            description=original.description,
            priority=original.priority,
            tags=original.tags.copy() if original.tags else [],
            variables=original.variables.copy() if original.variables else {},
            pre_sql=original.pre_sql,
            post_sql=original.post_sql,
        )
        self.session.add(new_scenario)
        await self.session.commit()
        await self.session.refresh(new_scenario)

        # 复制步骤
        for step in original.steps:
            new_step = ScenarioStep(
                scenario_id=new_scenario.id,
                name=step.name,
                keyword_type=step.keyword_type,
                keyword_method=step.keyword_method,
                config=step.config.copy() if step.config else {},
                sort_order=step.sort_order,
            )
            self.session.add(new_step)

        # 复制数据集
        for dataset in original.datasets:
            new_dataset = TestDataset(
                scenario_id=new_scenario.id,
                name=dataset.name,
                headers=dataset.headers.copy() if dataset.headers else [],
            )
            self.session.add(new_dataset)
            await self.session.flush()

            # 复制数据行
            for row in dataset.rows:
                new_row = DatasetRow(
                    dataset_id=new_dataset.id,
                    row_data=row.row_data.copy() if row.row_data else {},
                    sort_order=row.sort_order,
                )
                self.session.add(new_row)

        await self.session.commit()
        await self.session.refresh(new_scenario)

        return new_scenario


class ScenarioStepService:
    """场景步骤服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, scenario_id: str) -> list[ScenarioStep]:
        """获取步骤列表

        Args:
            scenario_id: 场景 ID

        Returns:
            步骤列表
        """
        result = await self.session.execute(
            select(ScenarioStep)
            .where(ScenarioStep.scenario_id == scenario_id)
            .order_by(ScenarioStep.sort_order, ScenarioStep.created_at)
        )
        return list(result.scalars().all())

    async def get(self, step_id: str) -> ScenarioStep:
        """获取步骤详情

        Args:
            step_id: 步骤 ID

        Returns:
            步骤对象

        Raises:
            NotFoundError: 步骤不存在
        """
        result = await self.session.execute(
            select(ScenarioStep).where(ScenarioStep.id == step_id)
        )
        step = result.scalar_one_or_none()

        if not step:
            raise NotFoundError("步骤", step_id)

        return step

    async def create(self, scenario_id: str, data: ScenarioStepCreate) -> ScenarioStep:
        """创建步骤

        Args:
            scenario_id: 场景 ID
            data: 创建数据

        Returns:
            创建的步骤对象

        Raises:
            NotFoundError: 场景不存在
        """
        # 验证场景存在
        scenario = await self.session.get(Scenario, scenario_id)
        if not scenario:
            raise NotFoundError("场景", scenario_id)

        step = ScenarioStep(
            scenario_id=scenario_id,
            name=data.name,
            keyword_type=data.keyword_type,
            keyword_method=data.keyword_method,
            config=data.config,
            sort_order=data.sort_order,
        )
        self.session.add(step)
        await self.session.commit()
        await self.session.refresh(step)

        return step

    async def batch_create(
        self, scenario_id: str, data: ScenarioStepBatchCreate
    ) -> list[ScenarioStep]:
        """批量创建步骤

        Args:
            scenario_id: 场景 ID
            data: 批量创建数据

        Returns:
            创建的步骤列表

        Raises:
            NotFoundError: 场景不存在
        """
        # 验证场景存在
        scenario = await self.session.get(Scenario, scenario_id)
        if not scenario:
            raise NotFoundError("场景", scenario_id)

        steps = []
        for idx, step_data in enumerate(data.steps):
            step = ScenarioStep(
                scenario_id=scenario_id,
                name=step_data.name,
                keyword_type=step_data.keyword_type,
                keyword_method=step_data.keyword_method,
                config=step_data.config,
                sort_order=step_data.sort_order or idx,
            )
            self.session.add(step)
            steps.append(step)

        await self.session.commit()

        for step in steps:
            await self.session.refresh(step)

        return steps

    async def update(self, step_id: str, data: ScenarioStepUpdate) -> ScenarioStep:
        """更新步骤

        Args:
            step_id: 步骤 ID
            data: 更新数据

        Returns:
            更新后的步骤对象

        Raises:
            NotFoundError: 步骤不存在
        """
        step = await self.get(step_id)

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(step, field, value)

        await self.session.commit()
        await self.session.refresh(step)

        return step

    async def delete(self, step_id: str) -> None:
        """删除步骤

        Args:
            step_id: 步骤 ID

        Raises:
            NotFoundError: 步骤不存在
        """
        step = await self.get(step_id)
        await self.session.delete(step)
        await self.session.commit()

    async def reorder(self, scenario_id: str, data: ScenarioStepReorder) -> list[ScenarioStep]:
        """重排序步骤

        Args:
            scenario_id: 场景 ID
            data: 重排序数据

        Returns:
            重排序后的步骤列表

        Raises:
            NotFoundError: 场景不存在
            ValidationError: 步骤 ID 列表不完整
        """
        # 验证场景存在
        scenario = await self.session.get(Scenario, scenario_id)
        if not scenario:
            raise NotFoundError("场景", scenario_id)

        # 获取现有步骤
        existing_steps = await self.list(scenario_id)
        existing_ids = {str(step.id) for step in existing_steps}
        provided_ids = set(data.step_ids)

        # 验证 ID 列表完整性
        if existing_ids != provided_ids:
            raise ValidationError("提供的步骤 ID 列表与现有步骤不匹配")

        # 更新排序
        for idx, step_id in enumerate(data.step_ids):
            step = await self.session.get(ScenarioStep, step_id)
            if step:
                step.sort_order = idx

        await self.session.commit()

        return await self.list(scenario_id)


class TestDatasetService:
    """测试数据集服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, scenario_id: str) -> list[TestDataset]:
        """获取数据集列表

        Args:
            scenario_id: 场景 ID

        Returns:
            数据集列表
        """
        result = await self.session.execute(
            select(TestDataset)
            .where(TestDataset.scenario_id == scenario_id)
            .order_by(TestDataset.created_at)
        )
        return list(result.scalars().all())

    async def get(self, dataset_id: str) -> TestDataset:
        """获取数据集详情

        Args:
            dataset_id: 数据集 ID

        Returns:
            数据集对象

        Raises:
            NotFoundError: 数据集不存在
        """
        result = await self.session.execute(
            select(TestDataset).where(TestDataset.id == dataset_id)
        )
        dataset = result.scalar_one_or_none()

        if not dataset:
            raise NotFoundError("数据集", dataset_id)

        return dataset

    async def create(self, scenario_id: str, data: TestDatasetCreate) -> TestDataset:
        """创建数据集

        Args:
            scenario_id: 场景 ID
            data: 创建数据

        Returns:
            创建的数据集对象

        Raises:
            NotFoundError: 场景不存在
        """
        # 验证场景存在
        scenario = await self.session.get(Scenario, scenario_id)
        if not scenario:
            raise NotFoundError("场景", scenario_id)

        dataset = TestDataset(
            scenario_id=scenario_id,
            name=data.name,
            headers=data.headers,
        )
        self.session.add(dataset)
        await self.session.commit()
        await self.session.refresh(dataset)

        # 如果有数据行，创建数据行
        if data.rows:
            for idx, row_data in enumerate(data.rows):
                row = DatasetRow(
                    dataset_id=dataset.id,
                    row_data=row_data.row_data,
                    sort_order=row_data.sort_order or idx,
                )
                self.session.add(row)
            await self.session.commit()
            await self.session.refresh(dataset)

        return dataset

    async def update(self, dataset_id: str, data: TestDatasetUpdate) -> TestDataset:
        """更新数据集

        Args:
            dataset_id: 数据集 ID
            data: 更新数据

        Returns:
            更新后的数据集对象

        Raises:
            NotFoundError: 数据集不存在
        """
        dataset = await self.get(dataset_id)

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(dataset, field, value)

        await self.session.commit()
        await self.session.refresh(dataset)

        return dataset

    async def delete(self, dataset_id: str) -> None:
        """删除数据集

        Args:
            dataset_id: 数据集 ID

        Raises:
            NotFoundError: 数据集不存在
        """
        dataset = await self.get(dataset_id)
        await self.session.delete(dataset)
        await self.session.commit()

    async def add_row(self, dataset_id: str, data: DatasetRowCreate) -> DatasetRow:
        """添加数据行

        Args:
            dataset_id: 数据集 ID
            data: 创建数据

        Returns:
            创建的数据行对象

        Raises:
            NotFoundError: 数据集不存在
        """
        # 验证数据集存在（会抛出 NotFoundError 如果不存在）
        await self.get(dataset_id)

        row = DatasetRow(
            dataset_id=dataset_id,
            row_data=data.row_data,
            sort_order=data.sort_order,
        )
        self.session.add(row)
        await self.session.commit()
        await self.session.refresh(row)

        return row

    async def update_row(self, row_id: str, data: DatasetRowUpdate) -> DatasetRow:
        """更新数据行

        Args:
            row_id: 数据行 ID
            data: 更新数据

        Returns:
            更新后的数据行对象

        Raises:
            NotFoundError: 数据行不存在
        """
        result = await self.session.execute(
            select(DatasetRow).where(DatasetRow.id == row_id)
        )
        row = result.scalar_one_or_none()

        if not row:
            raise NotFoundError("数据行", row_id)

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(row, field, value)

        await self.session.commit()
        await self.session.refresh(row)

        return row

    async def delete_row(self, row_id: str) -> None:
        """删除数据行

        Args:
            row_id: 数据行 ID

        Raises:
            NotFoundError: 数据行不存在
        """
        result = await self.session.execute(
            select(DatasetRow).where(DatasetRow.id == row_id)
        )
        row = result.scalar_one_or_none()

        if not row:
            raise NotFoundError("数据行", row_id)

        await self.session.delete(row)
        await self.session.commit()
