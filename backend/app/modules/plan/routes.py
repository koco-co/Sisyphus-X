"""测试计划模块路由

提供测试计划、计划场景关联的 API 端点。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import PagedData, success
from app.models_new.user import User
from app.modules.plan.schemas import (
    PlanScenarioBatchCreate,
    PlanScenarioCreate,
    PlanScenarioReorder,
    PlanScenarioResponse,
    PlanScenarioUpdate,
    TestPlanBriefResponse,
    TestPlanCreate,
    TestPlanResponse,
    TestPlanUpdate,
)
from app.modules.plan.service import PlanScenarioService, TestPlanService

router = APIRouter(prefix="/projects/{project_id}/plans", tags=["TestPlans"])


# ============================================================================
# 测试计划管理
# ============================================================================


@router.get("", summary="获取测试计划列表")
async def list_plans(
    project_id: str,
    search: str | None = Query(None, description="搜索关键词，匹配名称和描述"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """获取测试计划列表

    支持搜索关键词，支持分页。
    """
    service = TestPlanService(session)
    plans, total = await service.list(
        project_id=project_id,
        search=search,
        page=page,
        page_size=page_size,
    )

    # 计算总页数
    total_pages = (total + page_size - 1) // page_size

    # 构建简要响应
    items = []
    for plan in plans:
        items.append(
            TestPlanBriefResponse(
                id=plan.id,
                project_id=plan.project_id,
                name=plan.name,
                description=plan.description,
                created_at=plan.created_at,
                updated_at=plan.updated_at,
                scenario_count=len(plan.plan_scenarios) if plan.plan_scenarios else 0,
            )
        )

    # 构建分页数据
    paged_data = PagedData[TestPlanBriefResponse](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

    return success(paged_data)


@router.post("", summary="创建测试计划")
async def create_plan(
    project_id: str,
    data: TestPlanCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """创建新测试计划

    可以同时创建计划下的场景关联。
    """
    service = TestPlanService(session)
    plan = await service.create(project_id, data)

    # 构建响应
    response = _build_plan_response(plan)

    return success(response)


@router.get("/{plan_id}", summary="获取测试计划详情")
async def get_plan(
    project_id: str,
    plan_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """获取单个测试计划的详细信息，包含场景关联列表"""
    service = TestPlanService(session)
    plan = await service.get(plan_id)

    # 构建响应
    response = _build_plan_response(plan)

    return success(response)


@router.put("/{plan_id}", summary="更新测试计划")
async def update_plan(
    project_id: str,
    plan_id: str,
    data: TestPlanUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """更新测试计划信息

    可以更新名称、描述等。
    """
    service = TestPlanService(session)
    plan = await service.update(plan_id, data)

    # 构建响应
    response = _build_plan_response(plan)

    return success(response)


@router.delete("/{plan_id}", summary="删除测试计划")
async def delete_plan(
    project_id: str,
    plan_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """删除测试计划及其所有场景关联"""
    service = TestPlanService(session)
    await service.delete(plan_id)
    return success()


@router.post("/{plan_id}/duplicate", summary="复制测试计划")
async def duplicate_plan(
    project_id: str,
    plan_id: str,
    new_name: str = Query(..., description="新计划名称"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """复制测试计划

    复制计划及其所有场景关联。
    """
    service = TestPlanService(session)
    plan = await service.duplicate(plan_id, new_name)

    # 构建响应
    response = _build_plan_response(plan)

    return success(response)


# ============================================================================
# 计划场景管理
# ============================================================================


@router.get("/{plan_id}/scenarios", summary="获取计划场景列表")
async def list_plan_scenarios(
    project_id: str,
    plan_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """获取计划下的场景关联列表"""
    service = PlanScenarioService(session)
    scenarios = await service.list(plan_id)
    return success([_build_plan_scenario_response(ps) for ps in scenarios])


@router.post("/{plan_id}/scenarios", summary="添加场景到计划")
async def add_plan_scenario(
    project_id: str,
    plan_id: str,
    data: PlanScenarioCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """添加场景到计划"""
    service = PlanScenarioService(session)
    ps = await service.add(plan_id, data)
    return success(_build_plan_scenario_response(ps))


@router.post("/{plan_id}/scenarios/batch", summary="批量添加场景")
async def batch_add_plan_scenarios(
    project_id: str,
    plan_id: str,
    data: PlanScenarioBatchCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """批量添加场景到计划"""
    service = PlanScenarioService(session)
    scenarios = await service.batch_add(plan_id, data)
    return success([_build_plan_scenario_response(ps) for ps in scenarios])


@router.put("/scenarios/{plan_scenario_id}", summary="更新场景配置")
async def update_plan_scenario(
    project_id: str,
    plan_id: str,
    plan_scenario_id: str,
    data: PlanScenarioUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """更新计划场景关联配置"""
    service = PlanScenarioService(session)
    ps = await service.update(plan_scenario_id, data)
    return success(_build_plan_scenario_response(ps))


@router.delete("/scenarios/{plan_scenario_id}", summary="移除场景")
async def remove_plan_scenario(
    project_id: str,
    plan_id: str,
    plan_scenario_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """从计划中移除场景"""
    service = PlanScenarioService(session)
    await service.remove(plan_scenario_id)
    return success()


@router.post("/{plan_id}/scenarios/reorder", summary="重排序场景")
async def reorder_plan_scenarios(
    project_id: str,
    plan_id: str,
    data: PlanScenarioReorder,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """重排序场景

    传入按新顺序排列的计划场景关联 ID 列表。
    """
    service = PlanScenarioService(session)
    scenarios = await service.reorder(plan_id, data)
    return success([_build_plan_scenario_response(ps) for ps in scenarios])


# ============================================================================
# 辅助函数
# ============================================================================


def _build_plan_response(plan) -> TestPlanResponse:
    """构建测试计划响应"""
    scenarios = []
    for ps in (plan.plan_scenarios or []):
        scenarios.append(_build_plan_scenario_response(ps))

    return TestPlanResponse(
        id=plan.id,
        project_id=plan.project_id,
        name=plan.name,
        description=plan.description,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        scenarios=scenarios,
    )


def _build_plan_scenario_response(ps) -> PlanScenarioResponse:
    """构建计划场景关联响应"""
    return PlanScenarioResponse(
        id=ps.id,
        plan_id=ps.plan_id,
        scenario_id=ps.scenario_id,
        dataset_id=ps.dataset_id,
        variables_override=ps.variables_override or {},
        sort_order=ps.sort_order,
        created_at=ps.created_at,
        scenario_name=ps.scenario.name if ps.scenario else None,
        dataset_name=ps.dataset.name if ps.dataset else None,
    )
