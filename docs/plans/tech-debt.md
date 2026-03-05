# 技术债清单

> 在 MVP 收尾过程中识别但暂未处理的技术债，后续迭代时逐步偿还。

## 前端

| 优先级 | 描述 | 位置 |
|--------|------|------|
| P1 | `features/keyword/api.ts` 导入了 `@/api/client` 中不存在的 `get`/`post` 等方法 | `frontend/src/features/keyword/` |
| P2 | `lib/api-client.ts` 与 `api/client.ts` 职责重叠，应合并为单一 API 层 | `frontend/src/lib/` |
| P2 | 部分组件仍使用 `Number(uuid)` 进行类型转换 | 全局搜索 `Number(` |
| P3 | 场景编辑器中数据集 CSV 解析未完成（有 TODO 注释） | `backend/app/api/v1/endpoints/scenarios.py` |

## 后端

| 优先级 | 描述 | 位置 |
|--------|------|------|
| P1 | 引擎 `run_case` 是同步调用，在 endpoint 中需要 `asyncio.to_thread()` 包装 | `services/engine_executor.py` |
| P2 | `examples/refactored_keywords.py` 作为示例保留但未实际使用 | `api/v1/endpoints/examples/` |
| P2 | 生产环境 WebSocket 鉴权：浏览器无法在握手时发送自定义 header | `api/v1/endpoints/websocket.py` |
| P2 | Allure 报告集成未完全实现（调试模式不生成报告） | `api/v1/endpoints/scenarios.py` |
| P3 | `seed_data.py` 内置关键字代码为占位符（`# 内置关键字 - 由引擎处理`） | `core/seed_data.py` |

## 工程化

| 优先级 | 描述 | 位置 |
|--------|------|------|
| P2 | `tests/auto/` 和前端 E2E 测试目录分工不够明确 | `tests/` |
| P3 | Docker Compose 中 `mysql-test` 服务未在 `sisyphus_init.sh status` 中展示 | `sisyphus_init.sh` |
