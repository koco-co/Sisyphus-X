"""场景模块路由

提供测试场景、步骤、数据集的 API 端点。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import PagedData, success
from app.models_new.user import User
from app.modules.scenario.schemas import (
    DatasetRowCreate,
    DatasetRowResponse,
    DatasetRowUpdate,
    ScenarioBriefResponse,
    ScenarioCreate,
    ScenarioResponse,
    ScenarioStepBatchCreate,
    ScenarioStepCreate,
    ScenarioStepReorder,
    ScenarioStepResponse,
    ScenarioStepUpdate,
    ScenarioUpdate,
    TestDatasetBriefResponse,
    TestDatasetCreate,
    TestDatasetResponse,
    TestDatasetUpdate,
)
from app.modules.scenario.service import (
    ScenarioService,
    ScenarioStepService,
    TestDatasetService,
)

router = APIRouter(prefix="/projects/{project_id}/scenarios", tags=["Scenarios"])


# ============================================================================
# 场景管理
# ============================================================================


@router.get("", summary="获取场景列表")
async def list_scenarios(
    project_id: str,
    search: str | None = Query(None, description="搜索关键词，匹配名称和描述"),
    priority: str | None = Query(None, description="优先级过滤: P0/P1/P2/P3"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """获取场景列表

    支持按优先级过滤和搜索关键词，支持分页。
    """
    service = ScenarioService(session)
    scenarios, total = await service.list(
        project_id=project_id,
        search=search,
        priority=priority,
        page=page,
        page_size=page_size,
    )

    # 计算总页数
    total_pages = (total + page_size - 1) // page_size

    # 构建简要响应
    items = []
    for scenario in scenarios:
        items.append(
            ScenarioBriefResponse(
                id=scenario.id,
                project_id=scenario.project_id,
                name=scenario.name,
                description=scenario.description,
                priority=scenario.priority,
                tags=scenario.tags or [],
                created_at=scenario.created_at,
                updated_at=scenario.updated_at,
                step_count=len(scenario.steps) if scenario.steps else 0,
            )
        )

    # 构建分页数据
    paged_data = PagedData[ScenarioBriefResponse](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

    return success(paged_data)


@router.post("", summary="创建场景")
async def create_scenario(
    project_id: str,
    data: ScenarioCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """创建新场景

    可以同时创建场景下的步骤。
    """
    service = ScenarioService(session)
    scenario = await service.create(project_id, data)

    # 构建响应
    response = ScenarioResponse(
        id=scenario.id,
        project_id=scenario.project_id,
        name=scenario.name,
        description=scenario.description,
        priority=scenario.priority,
        tags=scenario.tags or [],
        variables=scenario.variables or {},
        pre_sql=scenario.pre_sql,
        post_sql=scenario.post_sql,
        created_at=scenario.created_at,
        updated_at=scenario.updated_at,
        steps=[
            ScenarioStepResponse.model_validate(step) for step in (scenario.steps or [])
        ],
        datasets=[
            TestDatasetBriefResponse(
                id=ds.id,
                scenario_id=ds.scenario_id,
                name=ds.name,
                headers=ds.headers or [],
                created_at=ds.created_at,
                row_count=len(ds.rows) if ds.rows else 0,
            )
            for ds in (scenario.datasets or [])
        ],
    )

    return success(response)


@router.get("/{scenario_id}", summary="获取场景详情")
async def get_scenario(
    project_id: str,
    scenario_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """获取单个场景的详细信息，包含步骤和数据集"""
    service = ScenarioService(session)
    scenario = await service.get(scenario_id)

    # 构建响应
    response = ScenarioResponse(
        id=scenario.id,
        project_id=scenario.project_id,
        name=scenario.name,
        description=scenario.description,
        priority=scenario.priority,
        tags=scenario.tags or [],
        variables=scenario.variables or {},
        pre_sql=scenario.pre_sql,
        post_sql=scenario.post_sql,
        created_at=scenario.created_at,
        updated_at=scenario.updated_at,
        steps=[
            ScenarioStepResponse.model_validate(step) for step in (scenario.steps or [])
        ],
        datasets=[
            TestDatasetBriefResponse(
                id=ds.id,
                scenario_id=ds.scenario_id,
                name=ds.name,
                headers=ds.headers or [],
                created_at=ds.created_at,
                row_count=len(ds.rows) if ds.rows else 0,
            )
            for ds in (scenario.datasets or [])
        ],
    )

    return success(response)


@router.put("/{scenario_id}", summary="更新场景")
async def update_scenario(
    project_id: str,
    scenario_id: str,
    data: ScenarioUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """更新场景信息

    可以更新名称、描述、优先级、标签、变量等。
    """
    service = ScenarioService(session)
    scenario = await service.update(scenario_id, data)

    # 构建响应
    response = ScenarioResponse(
        id=scenario.id,
        project_id=scenario.project_id,
        name=scenario.name,
        description=scenario.description,
        priority=scenario.priority,
        tags=scenario.tags or [],
        variables=scenario.variables or {},
        pre_sql=scenario.pre_sql,
        post_sql=scenario.post_sql,
        created_at=scenario.created_at,
        updated_at=scenario.updated_at,
        steps=[
            ScenarioStepResponse.model_validate(step) for step in (scenario.steps or [])
        ],
        datasets=[
            TestDatasetBriefResponse(
                id=ds.id,
                scenario_id=ds.scenario_id,
                name=ds.name,
                headers=ds.headers or [],
                created_at=ds.created_at,
                row_count=len(ds.rows) if ds.rows else 0,
            )
            for ds in (scenario.datasets or [])
        ],
    )

    return success(response)


@router.delete("/{scenario_id}", summary="删除场景")
async def delete_scenario(
    project_id: str,
    scenario_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """删除场景及其所有步骤和数据集"""
    service = ScenarioService(session)
    await service.delete(scenario_id)
    return success()


@router.post("/{scenario_id}/duplicate", summary="复制场景")
async def duplicate_scenario(
    project_id: str,
    scenario_id: str,
    new_name: str = Query(..., description="新场景名称"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """复制场景

    复制场景及其所有步骤和数据集。
    """
    service = ScenarioService(session)
    scenario = await service.duplicate(scenario_id, new_name)

    # 构建响应
    response = ScenarioResponse(
        id=scenario.id,
        project_id=scenario.project_id,
        name=scenario.name,
        description=scenario.description,
        priority=scenario.priority,
        tags=scenario.tags or [],
        variables=scenario.variables or {},
        pre_sql=scenario.pre_sql,
        post_sql=scenario.post_sql,
        created_at=scenario.created_at,
        updated_at=scenario.updated_at,
        steps=[
            ScenarioStepResponse.model_validate(step) for step in (scenario.steps or [])
        ],
        datasets=[
            TestDatasetBriefResponse(
                id=ds.id,
                scenario_id=ds.scenario_id,
                name=ds.name,
                headers=ds.headers or [],
                created_at=ds.created_at,
                row_count=len(ds.rows) if ds.rows else 0,
            )
            for ds in (scenario.datasets or [])
        ],
    )

    return success(response)


# ============================================================================
# 步骤管理
# ============================================================================


@router.get("/{scenario_id}/steps", summary="获取步骤列表")
async def list_steps(
    project_id: str,
    scenario_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """获取场景下的步骤列表"""
    service = ScenarioStepService(session)
    steps = await service.list(scenario_id)
    return success([ScenarioStepResponse.model_validate(step) for step in steps])


@router.post("/{scenario_id}/steps", summary="创建步骤")
async def create_step(
    project_id: str,
    scenario_id: str,
    data: ScenarioStepCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """创建新步骤"""
    service = ScenarioStepService(session)
    step = await service.create(scenario_id, data)
    return success(ScenarioStepResponse.model_validate(step))


@router.post("/{scenario_id}/steps/batch", summary="批量创建步骤")
async def batch_create_steps(
    project_id: str,
    scenario_id: str,
    data: ScenarioStepBatchCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """批量创建步骤"""
    service = ScenarioStepService(session)
    steps = await service.batch_create(scenario_id, data)
    return success([ScenarioStepResponse.model_validate(step) for step in steps])


@router.put("/steps/{step_id}", summary="更新步骤")
async def update_step(
    project_id: str,
    scenario_id: str,
    step_id: str,
    data: ScenarioStepUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """更新步骤信息"""
    service = ScenarioStepService(session)
    step = await service.update(step_id, data)
    return success(ScenarioStepResponse.model_validate(step))


@router.delete("/steps/{step_id}", summary="删除步骤")
async def delete_step(
    project_id: str,
    scenario_id: str,
    step_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """删除步骤"""
    service = ScenarioStepService(session)
    await service.delete(step_id)
    return success()


@router.post("/{scenario_id}/steps/reorder", summary="重排序步骤")
async def reorder_steps(
    project_id: str,
    scenario_id: str,
    data: ScenarioStepReorder,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """重排序步骤

    传入按新顺序排列的步骤 ID 列表。
    """
    service = ScenarioStepService(session)
    steps = await service.reorder(scenario_id, data)
    return success([ScenarioStepResponse.model_validate(step) for step in steps])


# ============================================================================
# 数据集管理
# ============================================================================


@router.get("/{scenario_id}/datasets", summary="获取数据集列表")
async def list_datasets(
    project_id: str,
    scenario_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """获取场景下的数据集列表"""
    service = TestDatasetService(session)
    datasets = await service.list(scenario_id)

    # 构建简要响应
    items = [
        TestDatasetBriefResponse(
            id=ds.id,
            scenario_id=ds.scenario_id,
            name=ds.name,
            headers=ds.headers or [],
            created_at=ds.created_at,
            row_count=len(ds.rows) if ds.rows else 0,
        )
        for ds in datasets
    ]

    return success(items)


@router.post("/{scenario_id}/datasets", summary="创建数据集")
async def create_dataset(
    project_id: str,
    scenario_id: str,
    data: TestDatasetCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """创建新数据集"""
    service = TestDatasetService(session)
    dataset = await service.create(scenario_id, data)
    return success(TestDatasetResponse.model_validate(dataset))


@router.get("/datasets/{dataset_id}", summary="获取数据集详情")
async def get_dataset(
    project_id: str,
    scenario_id: str,
    dataset_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """获取数据集详情，包含数据行"""
    service = TestDatasetService(session)
    dataset = await service.get(dataset_id)
    return success(TestDatasetResponse.model_validate(dataset))


@router.put("/datasets/{dataset_id}", summary="更新数据集")
async def update_dataset(
    project_id: str,
    scenario_id: str,
    dataset_id: str,
    data: TestDatasetUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """更新数据集信息"""
    service = TestDatasetService(session)
    dataset = await service.update(dataset_id, data)
    return success(TestDatasetResponse.model_validate(dataset))


@router.delete("/datasets/{dataset_id}", summary="删除数据集")
async def delete_dataset(
    project_id: str,
    scenario_id: str,
    dataset_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """删除数据集及其所有数据行"""
    service = TestDatasetService(session)
    await service.delete(dataset_id)
    return success()


@router.post("/datasets/{dataset_id}/rows", summary="添加数据行")
async def add_dataset_row(
    project_id: str,
    scenario_id: str,
    dataset_id: str,
    data: DatasetRowCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """向数据集添加数据行"""
    service = TestDatasetService(session)
    row = await service.add_row(dataset_id, data)
    return success(DatasetRowResponse.model_validate(row))


@router.put("/datasets/rows/{row_id}", summary="更新数据行")
async def update_dataset_row(
    project_id: str,
    scenario_id: str,
    dataset_id: str,
    row_id: str,
    data: DatasetRowUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """更新数据行"""
    service = TestDatasetService(session)
    row = await service.update_row(row_id, data)
    return success(DatasetRowResponse.model_validate(row))


@router.delete("/datasets/rows/{row_id}", summary="删除数据行")
async def delete_dataset_row(
    project_id: str,
    scenario_id: str,
    dataset_id: str,
    row_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """删除数据行"""
    service = TestDatasetService(session)
    await service.delete_row(row_id)
    return success()
