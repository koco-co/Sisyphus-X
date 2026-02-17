from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, func, select

from app.core.db import get_session
from app.models.test_plan import TestPlan, PlanScenario
from app.models.scenario import Scenario
from app.schemas.pagination import PageResponse
from app.schemas.plan import PlanCreate, PlanResponse, PlanUpdate

router = APIRouter()


async def get_plan_scenario_id(plan_id: str, session: AsyncSession) -> Optional[str]:
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
    statement = select(TestPlan).order_by(col(TestPlan.created_at).desc())
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

    plan.updated_at = datetime.now(timezone.utc)
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
    plan.updated_at = datetime.now(timezone.utc)
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
    plan.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(plan)
    return await enrich_plan_response(plan, session)


@router.post("/{plan_id}/trigger")
async def trigger_plan(plan_id: str, session: AsyncSession = Depends(get_session)):
    """手动触发测试计划执行"""
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # TODO: 触发场景执行逻辑 (调用 scenarios/run 接口)
    # 这里先返回成功响应
    plan.last_run = datetime.now(timezone.utc)
    await session.commit()

    return {"message": "Plan triggered successfully", "plan_id": plan_id}
