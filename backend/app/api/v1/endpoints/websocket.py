"""
WebSocket 实时推送接口 - 测试执行进度更新
"""

import asyncio
import json
import logging
from datetime import datetime

from fastapi import APIRouter, Header, WebSocket, WebSocketDisconnect, status

from app.core.config import settings
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        # execution_id -> set of WebSocket connections
        self.active_connections: dict[str, set[WebSocket]] = {}
        # heartbeat interval in seconds
        self.heartbeat_interval = 30

    async def connect(self, websocket: WebSocket, execution_id: str) -> bool:
        """
        接受 WebSocket 连接

        注意: websocket.accept() 应该在调用此方法之前完成

        Args:
            websocket: WebSocket 连接对象（已 accept）
            execution_id: 执行ID

        Returns:
            bool: 连接是否成功
        """
        try:
            if execution_id not in self.active_connections:
                self.active_connections[execution_id] = set()
            self.active_connections[execution_id].add(websocket)
            logger.info(f"WebSocket connected for execution {execution_id}")
            return True
        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            return False

    def disconnect(self, websocket: WebSocket, execution_id: str):
        """
        断开 WebSocket 连接

        Args:
            websocket: WebSocket 连接对象
            execution_id: 执行ID
        """
        if execution_id in self.active_connections:
            self.active_connections[execution_id].discard(websocket)
            # 如果没有活跃连接，删除该 execution_id 的记录
            if not self.active_connections[execution_id]:
                del self.active_connections[execution_id]
            logger.info(f"WebSocket disconnected for execution {execution_id}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """
        发送消息给特定的 WebSocket 连接

        Args:
            message: 消息内容（字典）
            websocket: WebSocket 连接对象
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send message: {e}")

    async def broadcast_to_execution(self, execution_id: str, message: dict):
        """
        向特定执行ID的所有连接广播消息

        Args:
            execution_id: 执行ID
            message: 消息内容（字典）
        """
        if execution_id not in self.active_connections:
            return

        # 使用列表复制避免迭代时修改集合
        connections = list(self.active_connections[execution_id])
        disconnected = []

        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to connection: {e}")
                disconnected.append(connection)

        # 清理断开的连接
        for connection in disconnected:
            self.disconnect(connection, execution_id)

    async def start_heartbeat(self, execution_id: str):
        """
        启动心跳任务

        Args:
            execution_id: 执行ID
        """
        while execution_id in self.active_connections:
            try:
                heartbeat_message = {
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat(),
                    "data": {"status": "alive"},
                }
                await self.broadcast_to_execution(execution_id, heartbeat_message)
                await asyncio.sleep(self.heartbeat_interval)
            except Exception as e:
                logger.error(f"Heartbeat error for execution {execution_id}: {e}")
                break

    def get_connection_count(self, execution_id: str) -> int:
        """
        获取特定执行ID的连接数

        Args:
            execution_id: 执行ID

        Returns:
            int: 连接数
        """
        return len(self.active_connections.get(execution_id, set()))


# 全局连接管理器实例
manager = ConnectionManager()

router = APIRouter()


async def verify_websocket_token(token: str | None) -> tuple[bool, str | None]:
    """
    验证 WebSocket 握手阶段的 JWT Token

    Args:
        token: JWT Token 字符串

    Returns:
        tuple[bool, str | None]: (是否验证成功, 错误信息)
    """
    # 开发模式: 禁用鉴权
    if settings.AUTH_DISABLED:
        return True, None

    if not token:
        return False, "Missing authentication token"

    if not token.startswith("Bearer "):
        return False, "Invalid token format"

    token = token.split(" ")[1]
    payload = decode_access_token(token)

    if not payload or "sub" not in payload:
        return False, "Invalid or expired token"

    return True, None


@router.websocket("/executions/{execution_id}")
async def websocket_execution_endpoint(
    websocket: WebSocket,
    execution_id: str,
    authorization: str | None = Header(None),
):
    """
    WebSocket 端点 - 测试执行实时进度推送

    连接URL格式:
    ws://localhost:8000/api/v1/ws/executions/{execution_id}

    请求头:
    Authorization: Bearer <jwt_token> (可选，开发模式下禁用)

    消息类型:
    1. connected - 连接建立成功
    2. heartbeat - 心跳消息（每30秒）
    3. progress - 进度更新
    4. step_started - 步骤开始
    5. step_completed - 步骤完成
    6. completed - 执行完成
    7. error - 错误消息

    Args:
        websocket: WebSocket 连接对象
        execution_id: 执行ID
        authorization: Authorization 头（JWT Token）
    """
    # 1. 验证 JWT Token (在 accept 之前)
    token_valid, error_msg = await verify_websocket_token(authorization)
    if not token_valid:
        logger.warning(f"WebSocket connection rejected: {error_msg}")
        # 拒绝连接 - 抛出 HTTPException 会导致 403
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail=error_msg)

    # 2. 接受 WebSocket 连接
    await websocket.accept()

    # 3. 注册到连接管理器
    connected = await manager.connect(websocket, execution_id)
    if not connected:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Connection failed")
        return

    # 4. 发送连接成功消息
    try:
        await websocket.send_json(
            {
                "type": "connected",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "execution_id": execution_id,
                    "message": "WebSocket connection established",
                    "connection_count": manager.get_connection_count(execution_id),
                },
            }
        )
    except Exception as e:
        logger.error(f"Failed to send connected message: {e}")
        manager.disconnect(websocket, execution_id)
        return

    # 5. 启动心跳任务
    heartbeat_task = None
    try:
        heartbeat_task = asyncio.create_task(manager.start_heartbeat(execution_id))
    except Exception as e:
        logger.error(f"Failed to start heartbeat: {e}")

    # 6. 监听客户端消息和连接状态
    try:
        while True:
            # 接收客户端消息（用于保活和客户端控制）
            data = await websocket.receive_text()
            message = json.loads(data)

            # 处理客户端消息
            if message.get("type") == "ping":
                await websocket.send_json(
                    {
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": {"execution_id": execution_id},
                    }
                )
            elif message.get("type") == "disconnect":
                logger.info(f"Client requested disconnect for execution {execution_id}")
                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected normally for execution {execution_id}")
    except Exception as e:
        logger.error(f"WebSocket error for execution {execution_id}: {e}")
    finally:
        # 7. 清理资源
        if heartbeat_task:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass

        manager.disconnect(websocket, execution_id)


# 辅助函数：用于其他模块推送执行进度


async def send_execution_progress(execution_id: str, progress_data: dict):
    """
    发送执行进度更新

    Args:
        execution_id: 执行ID
        progress_data: 进度数据
            - current_step: 当前步骤索引
            - total_steps: 总步骤数
            - percentage: 完成百分比
    """
    message = {
        "type": "progress",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {"execution_id": execution_id, **progress_data},
    }
    await manager.broadcast_to_execution(execution_id, message)


async def send_step_started(execution_id: str, step_data: dict):
    """
    发送步骤开始消息

    Args:
        execution_id: 执行ID
        step_data: 步骤数据
            - step_index: 步骤索引
            - step_name: 步骤名称
            - step_type: 步骤类型
    """
    message = {
        "type": "step_started",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {"execution_id": execution_id, **step_data},
    }
    await manager.broadcast_to_execution(execution_id, message)


async def send_step_completed(execution_id: str, step_result: dict):
    """
    发送步骤完成消息

    Args:
        execution_id: 执行ID
        step_result: 步骤结果
            - step_index: 步骤索引
            - step_name: 步骤名称
            - status: 状态 (success/failed/skipped)
            - duration: 执行时长
            - error: 错误信息（如果有）
            - response: 响应数据
    """
    message = {
        "type": "step_completed",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {"execution_id": execution_id, **step_result},
    }
    await manager.broadcast_to_execution(execution_id, message)


async def send_execution_completed(execution_id: str, result_data: dict):
    """
    发送执行完成消息

    Args:
        execution_id: 执行ID
        result_data: 结果数据
            - success: 是否成功
            - total_steps: 总步骤数
            - passed_steps: 通过步骤数
            - failed_steps: 失败步骤数
            - duration: 总执行时长
            - error: 错误信息（如果有）
    """
    message = {
        "type": "completed",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {"execution_id": execution_id, **result_data},
    }
    await manager.broadcast_to_execution(execution_id, message)


async def send_execution_error(execution_id: str, error_data: dict):
    """
    发送执行错误消息

    Args:
        execution_id: 执行ID
        error_data: 错误数据
            - error_type: 错误类型
            - error_message: 错误消息
            - step_index: 发生错误的步骤索引（如果有）
    """
    message = {
        "type": "error",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {"execution_id": execution_id, **error_data},
    }
    await manager.broadcast_to_execution(execution_id, message)


__all__ = [
    "manager",
    "router",
    "send_execution_progress",
    "send_step_started",
    "send_step_completed",
    "send_execution_completed",
    "send_execution_error",
]
