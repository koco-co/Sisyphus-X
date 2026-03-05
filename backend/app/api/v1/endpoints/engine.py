"""
Engine API - 调用内嵌核心执行器
"""

import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.engine_executor import EngineExecutor

router = APIRouter()


class RunRequest(BaseModel):
    yaml_content: str
    base_url: str | None = None
    timeout: int | None = None


class RunResponse(BaseModel):
    success: bool
    result: dict
    error: str | None = None


@router.post("/run", response_model=RunResponse)
async def run_engine(request: RunRequest):
    """执行 api-engine 测试（通过内嵌引擎）"""
    try:
        executor = EngineExecutor()
        result = await asyncio.to_thread(
            executor.execute,
            request.yaml_content,
            request.base_url,
            request.timeout or 300,
        )
        return RunResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_yaml(request: RunRequest):
    """验证 YAML 格式"""
    try:
        executor = EngineExecutor()
        result = executor.validate(request.yaml_content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
