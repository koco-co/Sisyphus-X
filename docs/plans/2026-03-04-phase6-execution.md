# Phase 6: 执行引擎核心模块 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现测试执行引擎，包括执行记录管理、Celery 异步任务、WebSocket 实时推送、执行控制（终止/暂停/恢复）。

**Architecture:** 后端使用 FastAPI + Celery + Redis + WebSocket，执行引擎嵌入后端服务中。支持实时进度推送和执行控制。

**Tech Stack:** FastAPI, Celery, Redis, WebSocket, SQLAlchemy 2.0 async, sisyphus-api-engine

---

## 前置条件

- Phase 1-5 已完成
- 数据库模型已定义 (Execution, ExecutionStep, Report)
- Redis 已配置
- Celery 已配置

---

## Task 1: 执行记录服务层

**Files:**
- Create: `backend/app/modules/execution/schemas.py`
- Create: `backend/app/modules/execution/service.py`

**实现 schemas.py:**

```python
# 执行状态枚举
class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"

# 执行记录 Schemas
class ExecutionCreate(BaseModel):
    plan_id: Optional[str] = None
    scenario_id: Optional[str] = None
    environment_id: str

class ExecutionResponse(BaseModel):
    id: UUID
    plan_id: Optional[UUID]
    scenario_id: Optional[UUID]
    environment_id: UUID
    status: str
    celery_task_id: Optional[str]
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int
    skipped_scenarios: int
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    created_by: Optional[UUID]
    created_at: datetime
    # 关联信息
    plan_name: Optional[str] = None
    scenario_name: Optional[str] = None
    environment_name: Optional[str] = None

class ExecutionListResponse(BaseModel):
    items: List[ExecutionBriefResponse]
    total: int

# 执行步骤 Schemas
class ExecutionStepResponse(BaseModel):
    id: UUID
    execution_id: UUID
    scenario_id: Optional[UUID]
    step_name: str
    status: str
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    request_data: Optional[dict]
    response_data: Optional[dict]
    assertions: Optional[dict]
    error_message: Optional[str]
    duration_ms: Optional[int] = None
```

**实现 service.py:**

ExecutionService 类:
- list(project_id, status, page, page_size) -> Tuple[List[Execution], int]
- get(execution_id) -> Execution
- create(project_id, data, user_id) -> Execution
- update_status(execution_id, status, **kwargs) -> Execution
- cancel_execution(execution_id) -> None (Celery revoke + Redis signal)
- pause_execution(execution_id) -> None (Redis pause signal)
- resume_execution(execution_id) -> None (Clear pause signal)
- get_steps(execution_id) -> List[ExecutionStep]
- add_step(execution_id, step_data) -> ExecutionStep

---

## Task 2: 执行路由

**Files:**
- Create: `backend/app/modules/execution/routes.py`

**实现路由 (prefix="/executions"):**

- GET / - 执行列表
- POST / - 创建执行（触发执行）
- GET /{execution_id} - 执行详情
- POST /{execution_id}/cancel - 终止执行
- POST /{execution_id}/pause - 暂停执行
- POST /{execution_id}/resume - 恢复执行
- GET /{execution_id}/steps - 步骤列表
- WS /ws/{execution_id} - WebSocket 连接

---

## Task 3: Celery 任务

**Files:**
- Create: `backend/app/modules/execution/tasks.py`

**实现 Celery 任务:**

```python
@shared_task(bind=True, max_retries=0)
def execute_plan_task(self, execution_id: str, plan_id: str, environment_id: str):
    """执行测试计划的 Celery 任务"""
    task_id = self.request.id

    # 更新执行记录
    update_execution(execution_id, celery_task_id=task_id, status="running")

    try:
        # 执行测试计划
        result = asyncio.run(run_plan(
            execution_id=execution_id,
            plan_id=plan_id,
            environment_id=environment_id,
            task_id=task_id,
            check_cancelled=lambda: is_task_cancelled(task_id),
            check_paused=lambda: is_task_paused(task_id),
            on_progress=lambda data: push_progress(execution_id, data)
        ))

        update_execution(execution_id, status="completed", **result)
        return result

    except TaskCancelledException:
        update_execution(execution_id, status="cancelled")
    except Exception as e:
        update_execution(execution_id, status="failed", error=str(e))
        raise

@shared_task(bind=True, max_retries=0)
def execute_scenario_task(self, execution_id: str, scenario_id: str, environment_id: str):
    """执行单个场景的 Celery 任务"""
    # 类似 execute_plan_task
```

---

## Task 4: WebSocket 管理

**Files:**
- Create: `backend/app/modules/execution/websocket.py`

**实现 ConnectionManager:**

```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, execution_id: str)
    async def disconnect(self, websocket: WebSocket, execution_id: str)
    async def broadcast(self, execution_id: str, message: dict)
    async def broadcast_step_progress(self, execution_id: str, data: dict)
```

**消息类型:**
- scenario_started
- step_completed
- execution_completed
- execution_cancelled
- execution_paused

---

## Task 5: 执行引擎核心

**Files:**
- Create: `backend/app/modules/execution/engine/runner.py`
- Create: `backend/app/modules/execution/engine/yaml_builder.py`

**实现 runner.py:**

```python
async def run_plan(
    execution_id: str,
    plan_id: str,
    environment_id: str,
    task_id: str,
    check_cancelled: Callable,
    check_paused: Callable,
    on_progress: Callable
) -> dict:
    """执行测试计划"""

    # 1. 获取计划配置
    plan = await get_plan(plan_id)
    environment = await get_environment(environment_id)

    # 2. 遍历场景
    for idx, plan_scenario in enumerate(plan.scenarios):
        # 检查取消/暂停信号
        if check_cancelled():
            raise TaskCancelledException()
        while check_paused():
            await asyncio.sleep(1)

        # 推送场景开始事件
        on_progress({
            "type": "scenario_started",
            "scenario_id": plan_scenario.scenario_id,
            "scenario_name": plan_scenario.scenario.name,
            "current": idx + 1,
            "total": len(plan.scenarios)
        })

        # 执行场景
        result = await run_scenario(...)

    # 3. 返回执行结果
    return {"total_scenarios": ..., "passed": ..., "failed": ...}
```

**实现 yaml_builder.py:**

```python
def build_yaml_from_scenario(scenario: Scenario, environment: Environment) -> dict:
    """将场景转换为 YAML 配置"""
    return {
        "config": {
            "name": scenario.name,
            "base_url": environment.base_url,
            "variables": {**environment.variables, **scenario.variables}
        },
        "teststeps": [build_step(step) for step in scenario.steps]
    }
```

---

## Task 6: 前端执行 API 和类型

**Files:**
- Create: `frontend/src/features/execution/types.ts`
- Create: `frontend/src/features/execution/api.ts`

**实现 types.ts:**

```typescript
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'

export interface Execution {
  id: string
  plan_id: string | null
  scenario_id: string | null
  environment_id: string
  status: ExecutionStatus
  celery_task_id: string | null
  total_scenarios: number
  passed_scenarios: number
  failed_scenarios: number
  skipped_scenarios: number
  started_at: string | null
  finished_at: string | null
  created_by: string | null
  created_at: string
  plan_name: string | null
  scenario_name: string | null
  environment_name: string | null
}

export interface ExecutionStep {
  id: string
  execution_id: string
  scenario_id: string | null
  step_name: string
  status: string
  started_at: string | null
  finished_at: string | null
  request_data: Record<string, unknown> | null
  response_data: Record<string, unknown> | null
  assertions: Record<string, unknown> | null
  error_message: string | null
  duration_ms: number | null
}

export interface ExecutionCreate {
  plan_id?: string
  scenario_id?: string
  environment_id: string
}
```

**实现 api.ts:**

```typescript
export const executionApi = {
  list: (params?) => get('/executions', params),
  get: (executionId: string) => get(`/executions/${executionId}`),
  create: (data: ExecutionCreate) => post('/executions', data),
  cancel: (executionId: string) => post(`/executions/${executionId}/cancel`, {}),
  pause: (executionId: string) => post(`/executions/${executionId}/pause`, {}),
  resume: (executionId: string) => post(`/executions/${executionId}/resume`, {}),
  getSteps: (executionId: string) => get(`/executions/${executionId}/steps`),
}

export function useExecutionWebSocket(executionId: string | null) {
  // WebSocket hook implementation
}
```

---

## Task 7: 集成测试与验证

**验证步骤:**
1. 验证后端路由注册
2. 验证 Celery 任务可执行
3. 验证 WebSocket 连接
4. 提交最终代码

---

## Phase 6 完成检查清单

- [ ] 执行记录服务层 (CRUD, 状态管理)
- [ ] 执行路由 (API 端点)
- [ ] Celery 任务 (异步执行)
- [ ] WebSocket 管理 (实时推送)
- [ ] 执行引擎核心 (runner, yaml_builder)
- [ ] 前端执行 API 和类型
- [ ] 集成测试验证

---

> **文档结束** — Phase 6: 执行引擎核心模块实施计划
