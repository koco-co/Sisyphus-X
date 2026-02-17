"""
WebSocket 接口手动测试脚本

运行方式:
cd backend
uv run python test_websocket_manual.py
"""

import asyncio
import json
import websockets
from datetime import datetime


async def test_websocket_connection():
    """测试 WebSocket 连接和消息接收"""

    # WebSocket 端点
    uri = "ws://localhost:8000/api/v1/ws/executions/test-execution-123"

    # 开发模式: 使用任意 token 或不传 token
    headers = {}

    print(f"[{datetime.now()}] 连接到 WebSocket: {uri}")

    try:
        async with websockets.connect(uri, additional_headers=headers) as websocket:
            print(f"[{datetime.now()}] ✅ WebSocket 连接成功！")

            # 接收连接成功消息
            message = await websocket.recv()
            data = json.loads(message)
            print(f"[{datetime.now()}] 收到消息: {json.dumps(data, indent=2, ensure_ascii=False)}")

            # 发送 ping 消息
            ping_msg = {"type": "ping"}
            await websocket.send(json.dumps(ping_msg))
            print(f"[{datetime.now()}] 发送 ping 消息")

            # 接收 pong 响应
            pong_message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            pong_data = json.loads(pong_message)
            print(f"[{datetime.now()}] 收到 pong 响应: {json.dumps(pong_data, indent=2, ensure_ascii=False)}")

            # 持续接收消息（心跳等）
            print(f"[{datetime.now()}] 等待心跳消息...")
            try:
                # 等待最多 35 秒以接收心跳消息（心跳间隔 30 秒）
                while True:
                    message = await asyncio.wait_for(websocket.recv(), timeout=35.0)
                    data = json.loads(message)
                    print(f"[{datetime.now()}] 收到消息: {json.dumps(data, indent=2, ensure_ascii=False)}")

                    if data.get("type") == "heartbeat":
                        print(f"[{datetime.now()}] 💓 心跳消息接收正常")

            except asyncio.TimeoutError:
                print(f"[{datetime.now()}] ⏱️ 等待超时，测试结束")

    except websockets.exceptions.InvalidStatusCode as e:
        print(f"[{datetime.now()}] ❌ WebSocket 连接失败: {e}")
        print(f"[{datetime.now()}] 状态码: {e.status_code}")
        print(f"[{datetime.now()}] 可能原因:")
        print(f"  - 后端服务未启动")
        print(f"  - CORS 配置问题")
        print(f"  - 路由未注册")
        print(f"  - JWT Token 验证失败")
    except ConnectionRefusedError:
        print(f"[{datetime.now()}] ❌ 连接被拒绝，请确认后端服务是否运行在端口 8000")
    except Exception as e:
        print(f"[{datetime.now()}] ❌ 发生错误: {type(e).__name__}: {e}")


async def test_websocket_send_progress():
    """模拟发送执行进度消息（需要服务端支持）"""

    # 注意: 这只是示例代码，实际使用时需要从服务端推送消息
    print("\n=== 测试说明 ===")
    print("要测试进度推送功能，需要:")
    print("1. 启动后端服务")
    print("2. 执行一个测试用例（通过 POST /execution/testcases/{id}/execute）")
    print("3. 使用返回的 execution_id 连接到 WebSocket")
    print("4. 观察接收到的进度更新、步骤开始/完成等消息")
    print("\n使用以下命令测试连接:")
    print('  uv run python test_websocket_manual.py')


if __name__ == "__main__":
    print("=" * 60)
    print("WebSocket 接口手动测试")
    print("=" * 60)
    print()

    # 运行连接测试
    asyncio.run(test_websocket_connection())

    # 打印说明
    asyncio.run(test_websocket_send_progress())
