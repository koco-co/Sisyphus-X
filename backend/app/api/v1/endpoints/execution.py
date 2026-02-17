"""
执行 API - 测试执行相关端点
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.services.execution.execution_scheduler import ExecutionScheduler
from typing import Optional

router = APIRouter()
scheduler = ExecutionScheduler()


class ExecuteRequest(BaseModel):
    """执行请求"""

    environment_id: Optional[int] = None


class ExecutionResponse(BaseModel):
    """执行响应"""

    success: bool
    test_case: dict
    steps: list
    statistics: dict
    duration: Optional[float] = None
    error: Optional[str] = None


@router.post("/testcases/{test_case_id}/execute", response_model=ExecutionResponse)
async def execute_test_case(
    test_case_id: int, request: ExecuteRequest, session: AsyncSession = Depends(get_session)
):
    """
    执行测试用例

    Args:
        test_case_id: 测试用例ID
        request: 执行请求
        session: 数据库会话

    Returns:
        执行结果
    """
    try:
        result = await scheduler.execute_test_case(session, test_case_id, request.environment_id)

        return ExecutionResponse(
            success=result.success,
            test_case=result.test_case.model_dump(),
            steps=[step.model_dump() for step in result.steps],
            statistics=result.statistics.model_dump(),
            duration=result.duration,
            error=result.error,
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
