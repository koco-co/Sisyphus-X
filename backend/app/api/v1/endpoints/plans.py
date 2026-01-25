from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func
from datetime import datetime
from app.core.db import get_session
from app.models import TestPlan, TestScenario
from app.schemas.plan import PlanCreate, PlanUpdate, PlanResponse
from app.schemas.pagination import PageResponse

router = APIRouter()

@router.get("/", response_model=PageResponse[PlanResponse])
async def list_plans(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_session)
):
    """获取测试计划列表 (分页)"""
    skip = (page - 1) * size
    statement = select(TestPlan).order_by(TestPlan.created_at.desc())
    count_statement = select(func.count()).select_from(TestPlan)
    
    total = (await session.execute(count_statement)).scalar()
    result = await session.execute(statement.offset(skip).limit(size))
    plans = result.scalars().all()
    
    pages = (total + size - 1) // size
    
    return PageResponse(
        items=plans,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("/", response_model=PlanResponse)
async def create_plan(
    data: PlanCreate,
    session: AsyncSession = Depends(get_session)
):
    """创建测试计划"""
    # 检查场景是否存在
    scenario = await session.get(TestScenario, data.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    plan = TestPlan(**data.model_dump())
    session.add(plan)
    await session.commit()
    await session.refresh(plan)
    return plan

@router.get("/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: int,
    session: AsyncSession = Depends(get_session)
):
    """获取单个测试计划"""
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan

@router.put("/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: int,
    data: PlanUpdate,
    session: AsyncSession = Depends(get_session)
):
    """更新测试计划"""
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # 更新字段
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plan, key, value)
    
    plan.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(plan)
    return plan

@router.delete("/{plan_id}")
async def delete_plan(
    plan_id: int,
    session: AsyncSession = Depends(get_session)
):
    """删除测试计划"""
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    await session.delete(plan)
    await session.commit()
    return {"deleted": plan_id}

@router.post("/{plan_id}/pause")
async def pause_plan(
    plan_id: int,
    session: AsyncSession = Depends(get_session)
):
    """暂停测试计划"""
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    plan.status = "paused"
    plan.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(plan)
    return plan

@router.post("/{plan_id}/resume")
async def resume_plan(
    plan_id: int,
    session: AsyncSession = Depends(get_session)
):
    """恢复测试计划"""
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    plan.status = "active"
    plan.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(plan)
    return plan

@router.post("/{plan_id}/trigger")
async def trigger_plan(
    plan_id: int,
    session: AsyncSession = Depends(get_session)
):
    """手动触发测试计划执行"""
    plan = await session.get(TestPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # TODO: 触发场景执行逻辑 (调用 scenarios/run 接口)
    # 这里先返回成功响应
    plan.last_run = datetime.utcnow()
    await session.commit()
    
    return {"message": "Plan triggered successfully", "plan_id": plan_id}
