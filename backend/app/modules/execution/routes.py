"""执行记录模块路由

提供测试执行记录的 REST API 和 WebSocket 端点。
"""

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import PagedData, success
from app.models_new.user import User
from app.modules.execution import schemas, service
from app.modules.execution.websocket import get_manager

router = APIRouter(prefix="/executions", tags=["执行管理"])


# ============ REST API ============


@router.get("", response_model=schemas.ExecutionListResponse)
async def list_executions(
    project_id: str = Query(..., description="项目ID"),
    status: str = Query(None, description="状态过滤"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取执行列表"""
    exec_service = service.ExecutionService(session)
    executions, total = await exec_service.list(
        project_id=project_id,
        status=status,
        page=page,
        page_size=page_size,
    )
    return success(
        data=PagedData(
            items=[schemas.ExecutionBriefResponse.model_validate(e) for e in executions],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size if total > 0 else 0,
        )
    )


@router.post("")
async def create_execution(
    data: schemas.ExecutionCreate,
    project_id: str = Query(..., description="项目ID"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """创建执行记录（触发执行）"""
    exec_service = service.ExecutionService(session)
    execution = await exec_service.create(
        project_id=project_id,
        data=data,
        user_id=str(current_user.id),
    )

    # TODO: 触发 Celery 任务

    return success(data=schemas.ExecutionResponse.model_validate(execution), message="执行已创建")


@router.get("/{execution_id}")
async def get_execution(
    execution_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取执行详情"""
    exec_service = service.ExecutionService(session)
    execution = await exec_service.get_with_details(execution_id)
    return success(data=schemas.ExecutionResponse.model_validate(execution))


@router.post("/{execution_id}/cancel")
async def cancel_execution(
    execution_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """终止执行"""
    exec_service = service.ExecutionService(session)
    await exec_service.cancel_execution(execution_id)

    # 广播取消事件
    manager = get_manager()
    await manager.broadcast_execution_cancelled(execution_id)

    return success(message="执行已终止")


@router.post("/{execution_id}/pause")
async def pause_execution(
    execution_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """暂停执行"""
    exec_service = service.ExecutionService(session)
    await exec_service.pause_execution(execution_id)

    # 广播暂停事件
    manager = get_manager()
    await manager.broadcast_execution_paused(execution_id)

    return success(message="执行已暂停")


@router.post("/{execution_id}/resume")
async def resume_execution(
    execution_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """恢复执行"""
    exec_service = service.ExecutionService(session)
    await exec_service.resume_execution(execution_id)

    # 广播恢复事件
    manager = get_manager()
    await manager.broadcast_execution_resumed(execution_id)

    return success(message="执行已恢复")


@router.get("/{execution_id}/steps")
async def get_execution_steps(
    execution_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取执行步骤列表"""
    exec_service = service.ExecutionService(session)
    steps = await exec_service.get_steps(execution_id)
    return success(data=[schemas.ExecutionStepResponse.model_validate(s) for s in steps])


# ============ WebSocket ============


@router.websocket("/ws/{execution_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    execution_id: str,
):
    """WebSocket 连接，用于接收执行进度"""
    manager = get_manager()
    await manager.connect(websocket, execution_id)

    try:
        while True:
            # 保持连接，等待客户端消息或断开
            data = await websocket.receive_text()
            # 可以处理客户端发送的心跳或其他消息
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, execution_id)
    except Exception:
        manager.disconnect(websocket, execution_id)
