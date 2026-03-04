import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket 连接管理器

    管理多个执行 ID 的 WebSocket 连接，
    支持向特定执行的所有订阅者广播消息。
    """

    def __init__(self):
        # execution_id -> Set[WebSocket]
        self.active_connections: dict[str, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, execution_id: str):
        """接受新的 WebSocket 连接"""
        await websocket.accept()
        if execution_id not in self.active_connections:
            self.active_connections[execution_id] = set()
        self.active_connections[execution_id].add(websocket)
        logger.info(f"WebSocket connected for execution {execution_id}, total: {len(self.active_connections[execution_id])}")

    def disconnect(self, websocket: WebSocket, execution_id: str):
        """断开 WebSocket 连接"""
        if execution_id in self.active_connections:
            self.active_connections[execution_id].discard(websocket)
            if not self.active_connections[execution_id]:
                del self.active_connections[execution_id]
        logger.info(f"WebSocket disconnected for execution {execution_id}")

    async def broadcast(self, execution_id: str, message: dict):
        """向订阅该执行的所有客户端广播消息"""
        if execution_id not in self.active_connections:
            return

        disconnected = set()
        for connection in self.active_connections[execution_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send message: {e}")
                disconnected.add(connection)

        # 清理断开的连接
        for conn in disconnected:
            self.disconnect(conn, execution_id)

    async def broadcast_scenario_started(
        self,
        execution_id: str,
        scenario_id: str,
        scenario_name: str,
        current: int,
        total: int,
    ):
        """广播场景开始事件"""
        await self.broadcast(execution_id, {
            "type": "scenario_started",
            "execution_id": execution_id,
            "scenario_id": scenario_id,
            "scenario_name": scenario_name,
            "current": current,
            "total": total,
        })

    async def broadcast_step_completed(
        self,
        execution_id: str,
        scenario_id: str,
        step_name: str,
        status: str,
        duration_ms: int,
        request_data: dict = None,
        response_data: dict = None,
        assertions: list = None,
        error_message: str = None,
    ):
        """广播步骤完成事件"""
        message = {
            "type": "step_completed",
            "execution_id": execution_id,
            "scenario_id": scenario_id,
            "step_name": step_name,
            "status": status,
            "duration_ms": duration_ms,
        }
        if request_data:
            message["request"] = request_data
        if response_data:
            message["response"] = response_data
        if assertions:
            message["assertions"] = assertions
        if error_message:
            message["error_message"] = error_message

        await self.broadcast(execution_id, message)

    async def broadcast_execution_completed(
        self,
        execution_id: str,
        status: str,
        total_scenarios: int,
        passed: int,
        failed: int,
        skipped: int,
        duration_ms: int,
    ):
        """广播执行完成事件"""
        await self.broadcast(execution_id, {
            "type": "execution_completed",
            "execution_id": execution_id,
            "status": status,
            "total_scenarios": total_scenarios,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "duration_ms": duration_ms,
        })

    async def broadcast_execution_cancelled(self, execution_id: str):
        """广播执行取消事件"""
        await self.broadcast(execution_id, {
            "type": "execution_cancelled",
            "execution_id": execution_id,
        })

    async def broadcast_execution_paused(self, execution_id: str):
        """广播执行暂停事件"""
        await self.broadcast(execution_id, {
            "type": "execution_paused",
            "execution_id": execution_id,
        })

    async def broadcast_execution_resumed(self, execution_id: str):
        """广播执行恢复事件"""
        await self.broadcast(execution_id, {
            "type": "execution_resumed",
            "execution_id": execution_id,
        })

    def get_connection_count(self, execution_id: str) -> int:
        """获取特定执行的连接数"""
        return len(self.active_connections.get(execution_id, set()))


# 全局单例
manager = ConnectionManager()


def get_manager() -> ConnectionManager:
    """获取 WebSocket 管理器实例"""
    return manager
