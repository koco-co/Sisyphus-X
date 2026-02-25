
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.test_case import TestCase
from app.schemas.pagination import PageResponse

router = APIRouter()


class TestCaseCreate(BaseModel):
    interface_id: str | None = None
    title: str
    priority: str = "P1"
    pre_conditions: str | None = None
    steps_data: list = []
    engine_type: str = "api"
    tags: list = []


class TestCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    interface_id: str | None = None
    title: str = ""
    priority: str = "P1"
    pre_conditions: str | None = None
    steps_data: list = []
    engine_type: str = "api"
    tags: list = []


@router.get("/", response_model=PageResponse[TestCaseResponse])
async def list_testcases(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    interface_id: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    skip = (page - 1) * size
    statement = select(TestCase)
    count_statement = select(func.count()).select_from(TestCase)

    if interface_id is not None:
        statement = statement.where(TestCase.interface_id == interface_id)
        count_statement = count_statement.where(TestCase.interface_id == interface_id)

    total = int((await session.execute(count_statement)).scalar_one() or 0)
    result = await session.execute(statement.offset(skip).limit(size))
    rows = result.scalars().all()
    items = [TestCaseResponse.model_validate(r) for r in rows]
    pages = (total + size - 1) // size

    return PageResponse(items=items, total=total, page=page, size=size, pages=pages)


@router.post("/", response_model=TestCaseResponse)
async def create_testcase(data: TestCaseCreate, session: AsyncSession = Depends(get_session)):
    testcase = TestCase(**data.model_dump())
    session.add(testcase)
    await session.commit()
    await session.refresh(testcase)
    return TestCaseResponse.model_validate(testcase)


@router.get("/{testcase_id}", response_model=TestCaseResponse)
async def get_testcase(testcase_id: int, session: AsyncSession = Depends(get_session)):
    testcase = await session.get(TestCase, testcase_id)
    if not testcase:
        raise HTTPException(status_code=404, detail="TestCase not found")
    return TestCaseResponse.model_validate(testcase)


@router.put("/{testcase_id}", response_model=TestCaseResponse)
async def update_testcase(
    testcase_id: int, data: TestCaseCreate, session: AsyncSession = Depends(get_session)
):
    testcase = await session.get(TestCase, testcase_id)
    if not testcase:
        raise HTTPException(status_code=404, detail="TestCase not found")
    for key, value in data.model_dump().items():
        setattr(testcase, key, value)
    await session.commit()
    await session.refresh(testcase)
    return TestCaseResponse.model_validate(testcase)


@router.delete("/{testcase_id}")
async def delete_testcase(testcase_id: int, session: AsyncSession = Depends(get_session)):
    testcase = await session.get(TestCase, testcase_id)
    if not testcase:
        raise HTTPException(status_code=404, detail="TestCase not found")
    await session.delete(testcase)
    await session.commit()
    return {"deleted": testcase_id}
