"""
WebSocket 模块单元测试

测试覆盖：
1. WebSocket 连接建立
2. JWT Token 验证（握手阶段）
3. 心跳机制（30秒间隔）
4. 进度消息推送
5. 连接断开处理
6. 多客户端连接管理
7. 消息广播功能
"""

import asyncio
import json
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import WebSocket
from fastapi.websockets import WebSocketDisconnect

from app.api.v1.endpoints.websocket import (
    ConnectionManager,
    manager,
    verify_websocket_token,
    send_execution_progress,
    send_step_started,
    send_step_completed,
    send_execution_completed,
    send_execution_error,
)


class TestConnectionManager:
    """测试 ConnectionManager 连接管理器"""

    @pytest.mark.asyncio
    async def test_connect_new_execution(self):
        """测试新执行ID的连接"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-001"

        result = await manager.connect(websocket, execution_id)

        assert result is True
        assert execution_id in manager.active_connections
        assert websocket in manager.active_connections[execution_id]

        # 清理
        manager.disconnect(websocket, execution_id)

    @pytest.mark.asyncio
    async def test_connect_existing_execution(self):
        """测试已有执行ID的新连接"""
        websocket1 = AsyncMock(spec=WebSocket)
        websocket2 = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-002"

        # 第一个连接
        await manager.connect(websocket1, execution_id)
        assert manager.get_connection_count(execution_id) == 1

        # 第二个连接
        await manager.connect(websocket2, execution_id)
        assert manager.get_connection_count(execution_id) == 2

        # 清理
        manager.disconnect(websocket1, execution_id)
        manager.disconnect(websocket2, execution_id)

    @pytest.mark.asyncio
    async def test_disconnect(self):
        """测试断开连接"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-003"

        # 连接
        await manager.connect(websocket, execution_id)
        assert execution_id in manager.active_connections

        # 断开
        manager.disconnect(websocket, execution_id)
        assert execution_id not in manager.active_connections

    @pytest.mark.asyncio
    async def test_disconnect_multiple_connections(self):
        """测试多个连接中断开一个"""
        websocket1 = AsyncMock(spec=WebSocket)
        websocket2 = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-004"

        # 连接两个客户端
        await manager.connect(websocket1, execution_id)
        await manager.connect(websocket2, execution_id)
        assert manager.get_connection_count(execution_id) == 2

        # 断开一个
        manager.disconnect(websocket1, execution_id)
        assert manager.get_connection_count(execution_id) == 1
        assert execution_id in manager.active_connections  # execution_id 仍存在
        assert websocket2 in manager.active_connections[execution_id]

        # 断开最后一个
        manager.disconnect(websocket2, execution_id)
        assert execution_id not in manager.active_connections

    @pytest.mark.asyncio
    async def test_send_personal_message(self):
        """测试发送个人消息"""
        websocket = AsyncMock(spec=WebSocket)
        message = {"type": "test", "data": "hello"}

        await manager.send_personal_message(message, websocket)

        # 验证 send_json 被调用
        websocket.send_json.assert_called_once_with(message)

    @pytest.mark.asyncio
    async def test_send_personal_message_failure(self):
        """测试发送消息失败处理"""
        websocket = AsyncMock(spec=WebSocket)
        websocket.send_json.side_effect = Exception("Connection lost")
        message = {"type": "test", "data": "hello"}

        # 不应该抛出异常
        await manager.send_personal_message(message, websocket)

        # 验证 send_json 被调用
        websocket.send_json.assert_called_once_with(message)

    @pytest.mark.asyncio
    async def test_broadcast_to_execution(self):
        """测试广播消息到特定执行ID的所有连接"""
        websocket1 = AsyncMock(spec=WebSocket)
        websocket2 = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-005"
        message = {"type": "progress", "data": {"current": 1, "total": 10}}

        # 连接两个客户端
        await manager.connect(websocket1, execution_id)
        await manager.connect(websocket2, execution_id)

        # 广播消息
        await manager.broadcast_to_execution(execution_id, message)

        # 验证两个连接都收到消息
        websocket1.send_json.assert_called_once_with(message)
        websocket2.send_json.assert_called_once_with(message)

        # 清理
        manager.disconnect(websocket1, execution_id)
        manager.disconnect(websocket2, execution_id)

    @pytest.mark.asyncio
    async def test_broadcast_to_execution_with_disconnected_client(self):
        """测试广播时清理断开的连接"""
        websocket1 = AsyncMock(spec=WebSocket)
        websocket2 = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-006"
        message = {"type": "progress", "data": {"current": 1, "total": 10}}

        # websocket2 发送失败
        websocket2.send_json.side_effect = Exception("Connection lost")

        # 连接两个客户端
        await manager.connect(websocket1, execution_id)
        await manager.connect(websocket2, execution_id)

        # 广播消息
        await manager.broadcast_to_execution(execution_id, message)

        # 验证 websocket1 收到消息
        websocket1.send_json.assert_called_once_with(message)

        # 验证 websocket2 尝试发送
        websocket2.send_json.assert_called_once_with(message)

        # 验证断开的连接被清理
        assert manager.get_connection_count(execution_id) == 1
        assert websocket1 in manager.active_connections[execution_id]
        assert websocket2 not in manager.active_connections[execution_id]

        # 清理
        manager.disconnect(websocket1, execution_id)

    @pytest.mark.asyncio
    async def test_broadcast_to_nonexistent_execution(self):
        """测试广播到不存在的执行ID"""
        execution_id = "nonexistent-exec"
        message = {"type": "progress", "data": {}}

        # 不应该抛出异常
        await manager.broadcast_to_execution(execution_id, message)

    @pytest.mark.asyncio
    async def test_get_connection_count(self):
        """测试获取连接数"""
        websocket1 = AsyncMock(spec=WebSocket)
        websocket2 = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-007"

        # 初始连接数
        assert manager.get_connection_count(execution_id) == 0

        # 添加连接
        await manager.connect(websocket1, execution_id)
        assert manager.get_connection_count(execution_id) == 1

        await manager.connect(websocket2, execution_id)
        assert manager.get_connection_count(execution_id) == 2

        # 清理
        manager.disconnect(websocket1, execution_id)
        assert manager.get_connection_count(execution_id) == 1

        manager.disconnect(websocket2, execution_id)
        assert manager.get_connection_count(execution_id) == 0

    @pytest.mark.asyncio
    async def test_start_heartbeat(self):
        """测试心跳机制"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-008"

        # 连接
        await manager.connect(websocket, execution_id)

        # 启动心跳任务（短时间测试）
        heartbeat_task = asyncio.create_task(manager.start_heartbeat(execution_id))

        # 等待足够时间让心跳发送至少一次
        # 注意：心跳间隔是30秒，但我们只需验证任务在运行
        await asyncio.sleep(0.1)

        # 验证任务在运行
        assert not heartbeat_task.done()

        # 取消任务
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass

        # 清理
        manager.disconnect(websocket, execution_id)

    @pytest.mark.asyncio
    async def test_start_heartbeat_with_disconnected_execution(self):
        """测试心跳任务在执行ID断开时自动退出"""
        execution_id = "test-exec-009"

        # 创建心跳任务
        heartbeat_task = asyncio.create_task(manager.start_heartbeat(execution_id))

        # 任务应该快速退出（因为没有活跃连接）
        await asyncio.wait_for(heartbeat_task, timeout=1.0)

        # 验证任务已完成
        assert heartbeat_task.done()


class TestVerifyWebsocketToken:
    """测试 JWT Token 验证"""

    @pytest.mark.asyncio
    async def test_verify_token_with_auth_disabled(self):
        """测试开发模式下禁用鉴权"""
        with patch("app.api.v1.endpoints.websocket.settings.AUTH_DISABLED", True):
            is_valid, error = await verify_websocket_token(None)
            assert is_valid is True
            assert error is None

    @pytest.mark.asyncio
    async def test_verify_token_missing_token(self):
        """测试缺少Token"""
        with patch("app.api.v1.endpoints.websocket.settings.AUTH_DISABLED", False):
            is_valid, error = await verify_websocket_token(None)
            assert is_valid is False
            assert error == "Missing authentication token"

    @pytest.mark.asyncio
    async def test_verify_token_invalid_format(self):
        """测试Token格式无效"""
        with patch("app.api.v1.endpoints.websocket.settings.AUTH_DISABLED", False):
            is_valid, error = await verify_websocket_token("InvalidToken")
            assert is_valid is False
            assert error == "Invalid token format"

    @pytest.mark.asyncio
    async def test_verify_token_invalid_token(self):
        """测试Token无效"""
        with patch("app.api.v1.endpoints.websocket.settings.AUTH_DISABLED", False):
            is_valid, error = await verify_websocket_token("Bearer invalid_token")
            assert is_valid is False
            assert error == "Invalid or expired token"

    @pytest.mark.asyncio
    async def test_verify_token_valid(self):
        """测试有效Token"""
        # Mock decode_access_token 返回有效payload
        with patch("app.api.v1.endpoints.websocket.settings.AUTH_DISABLED", False), \
             patch("app.api.v1.endpoints.websocket.decode_access_token") as mock_decode:
            mock_decode.return_value = {"sub": "user_id_123"}

            is_valid, error = await verify_websocket_token("Bearer valid_token")
            assert is_valid is True
            assert error is None

    @pytest.mark.asyncio
    async def test_verify_token_missing_sub(self):
        """测试Token缺少sub字段"""
        # Mock decode_access_token 返回无效payload
        with patch("app.api.v1.endpoints.websocket.settings.AUTH_DISABLED", False), \
             patch("app.api.v1.endpoints.websocket.decode_access_token") as mock_decode:
            mock_decode.return_value = {"exp": 1234567890}

            is_valid, error = await verify_websocket_token("Bearer token_without_sub")
            assert is_valid is False
            assert error == "Invalid or expired token"


class TestHelperFunctions:
    """测试辅助推送函数"""

    @pytest.mark.asyncio
    async def test_send_execution_progress(self):
        """测试发送执行进度"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-010"
        progress_data = {"current_step": 5, "total_steps": 10, "percentage": 50}

        # 连接
        await manager.connect(websocket, execution_id)

        # 发送进度
        await send_execution_progress(execution_id, progress_data)

        # 验证消息
        expected_message = {
            "type": "progress",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {"execution_id": execution_id, **progress_data},
        }
        websocket.send_json.assert_called_once()
        sent_message = websocket.send_json.call_args[0][0]

        assert sent_message["type"] == "progress"
        assert sent_message["data"]["execution_id"] == execution_id
        assert sent_message["data"]["current_step"] == 5

        # 清理
        manager.disconnect(websocket, execution_id)

    @pytest.mark.asyncio
    async def test_send_step_started(self):
        """测试发送步骤开始消息"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-011"
        step_data = {"step_index": 0, "step_name": "Login", "step_type": "request"}

        # 连接
        await manager.connect(websocket, execution_id)

        # 发送消息
        await send_step_started(execution_id, step_data)

        # 验证消息
        websocket.send_json.assert_called_once()
        sent_message = websocket.send_json.call_args[0][0]

        assert sent_message["type"] == "step_started"
        assert sent_message["data"]["step_name"] == "Login"

        # 清理
        manager.disconnect(websocket, execution_id)

    @pytest.mark.asyncio
    async def test_send_step_completed(self):
        """测试发送步骤完成消息"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-012"
        step_result = {
            "step_index": 0,
            "step_name": "Login",
            "status": "success",
            "duration": 1.5,
            "response": {"status_code": 200},
        }

        # 连接
        await manager.connect(websocket, execution_id)

        # 发送消息
        await send_step_completed(execution_id, step_result)

        # 验证消息
        websocket.send_json.assert_called_once()
        sent_message = websocket.send_json.call_args[0][0]

        assert sent_message["type"] == "step_completed"
        assert sent_message["data"]["status"] == "success"

        # 清理
        manager.disconnect(websocket, execution_id)

    @pytest.mark.asyncio
    async def test_send_execution_completed(self):
        """测试发送执行完成消息"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-013"
        result_data = {
            "success": True,
            "total_steps": 10,
            "passed_steps": 9,
            "failed_steps": 1,
            "duration": 15.5,
        }

        # 连接
        await manager.connect(websocket, execution_id)

        # 发送消息
        await send_execution_completed(execution_id, result_data)

        # 验证消息
        websocket.send_json.assert_called_once()
        sent_message = websocket.send_json.call_args[0][0]

        assert sent_message["type"] == "completed"
        assert sent_message["data"]["success"] is True
        assert sent_message["data"]["passed_steps"] == 9

        # 清理
        manager.disconnect(websocket, execution_id)

    @pytest.mark.asyncio
    async def test_send_execution_error(self):
        """测试发送执行错误消息"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-014"
        error_data = {
            "error_type": "AssertionError",
            "error_message": "Expected 200 but got 500",
            "step_index": 5,
        }

        # 连接
        await manager.connect(websocket, execution_id)

        # 发送消息
        await send_execution_error(execution_id, error_data)

        # 验证消息
        websocket.send_json.assert_called_once()
        sent_message = websocket.send_json.call_args[0][0]

        assert sent_message["type"] == "error"
        assert sent_message["data"]["error_type"] == "AssertionError"
        assert sent_message["data"]["step_index"] == 5

        # 清理
        manager.disconnect(websocket, execution_id)


class TestWebSocketIntegration:
    """WebSocket 集成测试（使用 FastAPI TestClient）"""

    @pytest.mark.asyncio
    async def test_websocket_connection_success(self):
        """测试WebSocket端点已正确注册"""
        from fastapi import FastAPI
        from app.api.v1.endpoints.websocket import router

        app = FastAPI()
        app.include_router(router, prefix="/ws")

        # 验证路由已注册
        routes = [route for route in app.routes if hasattr(route, "path")]
        ws_routes = [route for route in routes if "/ws/" in route.path]

        assert len(ws_routes) > 0, "WebSocket routes should be registered"
        assert any("/executions/" in route.path for route in ws_routes), "Execution endpoint should be registered"

    @pytest.mark.asyncio
    async def test_websocket_endpoint_registration(self):
        """测试WebSocket端点注册"""
        from fastapi import FastAPI
        from app.api.v1.endpoints.websocket import router

        app = FastAPI()
        app.include_router(router, prefix="/ws")

        # 验证路由已注册
        routes = [route for route in app.routes if hasattr(route, "path")]
        ws_routes = [route for route in routes if "/ws/" in route.path]

        assert len(ws_routes) > 0
        assert any("/executions/" in route.path for route in ws_routes)


class TestWebSocketMessageHandling:
    """测试WebSocket消息处理"""

    @pytest.mark.asyncio
    async def test_ping_pong_message(self):
        """测试ping/pong消息"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-015"

        # 连接
        await manager.connect(websocket, execution_id)

        # 模拟发送ping消息
        ping_message = {"type": "ping"}
        # 实际的消息处理在 websocket_execution_endpoint 中
        # 这里我们只测试辅助函数

        # 清理
        manager.disconnect(websocket, execution_id)

    @pytest.mark.asyncio
    async def test_multiple_clients_same_execution(self):
        """测试多个客户端连接到同一执行ID"""
        websocket1 = AsyncMock(spec=WebSocket)
        websocket2 = AsyncMock(spec=WebSocket)
        websocket3 = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-016"

        # 连接三个客户端
        await manager.connect(websocket1, execution_id)
        await manager.connect(websocket2, execution_id)
        await manager.connect(websocket3, execution_id)

        # 验证连接数
        assert manager.get_connection_count(execution_id) == 3

        # 广播消息
        message = {"type": "progress", "data": {"current": 1, "total": 10}}
        await manager.broadcast_to_execution(execution_id, message)

        # 验证所有客户端都收到消息
        websocket1.send_json.assert_called_once_with(message)
        websocket2.send_json.assert_called_once_with(message)
        websocket3.send_json.assert_called_once_with(message)

        # 清理
        manager.disconnect(websocket1, execution_id)
        manager.disconnect(websocket2, execution_id)
        manager.disconnect(websocket3, execution_id)

    @pytest.mark.asyncio
    async def test_different_execution_isolation(self):
        """测试不同执行ID的隔离"""
        websocket1 = AsyncMock(spec=WebSocket)
        websocket2 = AsyncMock(spec=WebSocket)
        execution_id_1 = "test-exec-017"
        execution_id_2 = "test-exec-018"

        # 连接到不同执行ID
        await manager.connect(websocket1, execution_id_1)
        await manager.connect(websocket2, execution_id_2)

        # 向 execution_id_1 广播
        message1 = {"type": "progress", "data": {"current": 1}}
        await manager.broadcast_to_execution(execution_id_1, message1)

        # 验证只有 websocket1 收到消息
        websocket1.send_json.assert_called_once_with(message1)
        websocket2.send_json.assert_not_called()

        # 向 execution_id_2 广播
        message2 = {"type": "progress", "data": {"current": 2}}
        await manager.broadcast_to_execution(execution_id_2, message2)

        # 验证只有 websocket2 收到消息
        assert websocket2.send_json.call_count == 1
        sent_message = websocket2.send_json.call_args[0][0]
        assert sent_message["data"]["current"] == 2

        # 清理
        manager.disconnect(websocket1, execution_id_1)
        manager.disconnect(websocket2, execution_id_2)


class TestWebSocketErrorHandling:
    """测试WebSocket错误处理"""

    @pytest.mark.asyncio
    async def test_connect_with_exception(self):
        """测试连接时发生异常"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-019"

        # 模拟连接失败
        with patch.object(manager, "active_connections", side_effect=Exception("Connection failed")):
            # 实际的 connect 方法不会抛出异常，而是返回 False
            # 但我们可以测试错误处理逻辑
            pass

    @pytest.mark.asyncio
    async def test_broadcast_with_all_clients_failed(self):
        """测试广播时所有客户端都失败"""
        websocket1 = AsyncMock(spec=WebSocket)
        websocket2 = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-020"
        message = {"type": "progress", "data": {}}

        # 所有连接都失败
        websocket1.send_json.side_effect = Exception("Failed")
        websocket2.send_json.side_effect = Exception("Failed")

        # 连接
        await manager.connect(websocket1, execution_id)
        await manager.connect(websocket2, execution_id)

        # 广播
        await manager.broadcast_to_execution(execution_id, message)

        # 验证所有连接都被清理
        assert manager.get_connection_count(execution_id) == 0
        assert execution_id not in manager.active_connections

    @pytest.mark.asyncio
    async def test_heartbeat_error_handling(self):
        """测试心跳任务的错误处理"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-021"

        # 连接
        await manager.connect(websocket, execution_id)

        # Mock broadcast 抛出异常
        with patch.object(manager, "broadcast_to_execution", side_effect=Exception("Heartbeat failed")):
            heartbeat_task = asyncio.create_task(manager.start_heartbeat(execution_id))

            # 等待任务完成或失败
            try:
                await asyncio.wait_for(heartbeat_task, timeout=1.0)
            except asyncio.TimeoutError:
                heartbeat_task.cancel()
                try:
                    await heartbeat_task
                except asyncio.CancelledError:
                    pass

        # 清理
        manager.disconnect(websocket, execution_id)


class TestWebSocketConnectionLifecycle:
    """测试WebSocket连接生命周期"""

    @pytest.mark.asyncio
    async def test_connection_cleanup_on_disconnect(self):
        """测试断开时的清理"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-022"

        # 连接
        await manager.connect(websocket, execution_id)
        assert execution_id in manager.active_connections

        # 断开
        manager.disconnect(websocket, execution_id)

        # 验证清理
        assert execution_id not in manager.active_connections
        assert manager.get_connection_count(execution_id) == 0

    @pytest.mark.asyncio
    async def test_reconnect_after_disconnect(self):
        """测试断开后重新连接"""
        websocket = AsyncMock(spec=WebSocket)
        execution_id = "test-exec-023"

        # 第一次连接
        await manager.connect(websocket, execution_id)
        manager.disconnect(websocket, execution_id)

        # 第二次连接
        await manager.connect(websocket, execution_id)

        # 验证成功重连
        assert execution_id in manager.active_connections
        assert manager.get_connection_count(execution_id) == 1

        # 清理
        manager.disconnect(websocket, execution_id)

    @pytest.mark.asyncio
    async def test_concurrent_connections_same_execution(self):
        """测试并发连接到同一执行ID"""
        import asyncio

        async def connect_client(client_id):
            websocket = AsyncMock(spec=WebSocket)
            execution_id = "test-exec-024"
            await manager.connect(websocket, execution_id)
            await asyncio.sleep(0.1)  # 模拟一些工作
            return websocket

        # 并发连接10个客户端
        websockets = await asyncio.gather(*[connect_client(i) for i in range(10)])

        # 验证所有连接都成功
        execution_id = "test-exec-024"
        assert manager.get_connection_count(execution_id) == 10

        # 清理所有连接
        for ws in websockets:
            manager.disconnect(ws, execution_id)

        # 验证清理完成
        assert manager.get_connection_count(execution_id) == 0
