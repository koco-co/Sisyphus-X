# Sisyphus-X 全面重构设计文档

> **文档版本**: v1.0
> **创建日期**: 2026-03-04
> **文档性质**: 全面重构设计文档

---

## 目录

- [1. 设计背景](#1-设计背景)
- [2. 技术决策](#2-技术决策)
- [3. 架构方案](#3-架构方案)
- [4. 数据库设计](#4-数据库设计)
- [5. 执行引擎集成](#5-执行引擎集成)
- [6. 前端架构](#6-前端架构)
- [7. 后端 API 设计](#7-后端-api-设计)
- [8. UI 组件规范](#8-ui-组件规范)
- [9. 开发计划](#9-开发计划)

---

## 1. 设计背景

### 1.1 现有问题

| 问题 | 描述 |
|------|------|
| 测试报告缺失 | 执行后无法查看测试报告 |
| 执行计划失败 | 测试计划执行过程中出现异常 |
| 终止功能不可用 | 无法终止正在执行的任务 |
| 页面切换后状态丢失 | 切换页面后看不到执行过程，进程似乎终止 |
| UI 样式不一致 | 弹窗没有圆角，样式不统一 |
| 数据无效 | 自定义关键字、数据源数据无效 |

### 1.2 重构目标

- 基于需求文档全面重构，确保功能完整
- 解决执行引擎集成问题，实现稳定执行
- 实现实时报告、终止/暂停功能
- 统一 UI 组件和交互规范
- 全新数据模型，无历史包袱

---

## 2. 技术决策

### 2.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端框架** | React 18 + Vite + TypeScript | 继续使用 |
| **前端状态** | Zustand + React Query | 继续使用 |
| **UI 组件** | shadcn/ui + Tailwind CSS | 继续使用，统一修复样式 |
| **后端框架** | FastAPI + SQLAlchemy (async) | 继续使用 |
| **数据库** | PostgreSQL (生产) / SQLite (开发) | 继续使用 |
| **后台任务** | Celery + Redis | 新增，用于异步执行 |
| **实时通信** | WebSocket | 新增，用于实时推送 |
| **文件存储** | MinIO | 继续使用 |

### 2.2 执行引擎集成方案

**决策：将 sisyphus-api-engine 集成到后端服务中**

| 对比项 | 独立 CLI 调用 | 集成到后端 |
|--------|--------------|-----------|
| 实时状态推送 | 复杂 | 简单可靠 |
| 终止/暂停功能 | 困难 | 直接控制 |
| 页面切换后状态 | 进程脱离管理 | 状态持久化 |
| 临时文件管理 | 需要 YAML 中转 | 可直接传参 |

### 2.3 开发优先级

**核心链路优先 + 执行能力优先**

```
Phase 1: 基础设施 + 核心链路
Phase 2: 执行能力 (解决最痛的问题)
Phase 3: 完善 (关键字、全局参数、Dashboard)
Phase 4: 测试与优化
```

---

## 3. 架构方案

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Features: project | interface | scenario | plan |       │  │
│  │           execution | report | keyword | setting         │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │
│  │ Zustand     │  │ React Query │  │ WebSocket Client    │    │
│  │ (全局状态)   │  │ (服务器状态) │  │ (实时推送)          │    │
│  └─────────────┘  └─────────────┘  └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │ REST API        │ WebSocket       │
            ▼                 ▼                 │
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Routes (REST + WebSocket)                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Domain Modules                                          │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ project  │ │interface │ │ scenario │ │   plan   │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │execution │ │  report  │ │ keyword  │ │ setting  │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Core Layer                                              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────────┐   │  │
│  │  │ Database │ │   Auth   │ │  Execution Engine      │   │  │
│  │  │(SQLAlchemy)│(JWT)     │ │(sisyphus-api-engine)   │   │  │
│  │  └──────────┘ └──────────┘ └────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  ┌──────────┐         ┌──────────┐         ┌──────────┐
  │PostgreSQL│         │  Redis   │         │  MinIO   │
  │  主数据库 │         │Celery+WS │         │ 文件存储  │
  └──────────┘         └──────────┘         └──────────┘
```

### 3.2 模块化架构

采用 **模块化 Monolith** 架构，后端按业务域划分模块：

```
backend/app/
├── modules/
│   ├── project/           # 项目管理模块
│   ├── interface/         # 接口定义模块
│   ├── scenario/          # 场景编排模块
│   ├── plan/              # 测试计划模块
│   ├── execution/         # 执行引擎模块（核心）
│   ├── report/            # 测试报告模块
│   ├── keyword/           # 关键字配置模块
│   └── setting/           # 系统设置模块
└── core/                  # 公共核心
```

前端采用 **Feature-based** 结构：

```
frontend/src/
├── features/              # 按功能模块组织
│   ├── project/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api.ts
│   │   └── types.ts
│   ├── interface/
│   ├── scenario/
│   └── ...
├── components/ui/         # shadcn/ui 组件
└── lib/                   # 工具函数
```

---

## 4. 数据库设计

### 4.1 核心表结构

#### 用户与认证

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 项目表
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 数据库配置

```sql
-- 数据库配置表
CREATE TABLE database_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    reference_var VARCHAR(100) NOT NULL,
    db_type VARCHAR(50) NOT NULL,  -- MySQL / PostgreSQL
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    database VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,  -- 加密存储
    connection_status VARCHAR(50) DEFAULT 'unknown',
    is_enabled BOOLEAN DEFAULT TRUE,
    last_check_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 环境管理

```sql
-- 环境表
CREATE TABLE environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    base_url VARCHAR(500),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 环境变量表
CREATE TABLE environment_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID REFERENCES environments(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT,
    description TEXT
);

-- 全局变量表
CREATE TABLE global_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT,
    description TEXT
);
```

#### 接口定义

```sql
-- 接口目录表
CREATE TABLE interface_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES interface_folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 接口表
CREATE TABLE interfaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES interface_folders(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,  -- GET/POST/PUT/DELETE/PATCH
    path VARCHAR(500) NOT NULL,
    headers JSONB,
    params JSONB,
    body JSONB,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 场景编排

```sql
-- 场景表
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(10) DEFAULT 'P2',  -- P0/P1/P2/P3
    tags JSONB DEFAULT '[]',
    variables JSONB DEFAULT '{}',
    pre_sql TEXT,
    post_sql TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 场景步骤表
CREATE TABLE scenario_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    keyword_type VARCHAR(100) NOT NULL,
    keyword_method VARCHAR(100) NOT NULL,
    config JSONB DEFAULT '{}',  -- 关键字参数
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 测试数据集表
CREATE TABLE test_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    headers JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 数据集行表
CREATE TABLE dataset_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES test_datasets(id) ON DELETE CASCADE,
    row_data JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0
);
```

#### 测试计划

```sql
-- 测试计划表
CREATE TABLE test_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 计划-场景关联表
CREATE TABLE plan_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES test_plans(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    dataset_id UUID REFERENCES test_datasets(id) ON DELETE SET NULL,
    variables_override JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 执行与报告

```sql
-- 执行记录表
CREATE TABLE executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES test_plans(id) ON DELETE SET NULL,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
    environment_id UUID REFERENCES environments(id),
    status VARCHAR(50) DEFAULT 'pending',  -- pending/running/completed/failed/cancelled/paused
    celery_task_id VARCHAR(255),
    total_scenarios INTEGER DEFAULT 0,
    passed_scenarios INTEGER DEFAULT 0,
    failed_scenarios INTEGER DEFAULT 0,
    skipped_scenarios INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 执行步骤详情表
CREATE TABLE execution_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES scenarios(id),
    step_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,  -- passed/failed/skipped
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    request_data JSONB,
    response_data JSONB,
    assertions JSONB,
    error_message TEXT
);

-- 报告表
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
    report_type VARCHAR(50) DEFAULT 'platform',  -- platform/allure
    storage_path VARCHAR(500),
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 关键字与全局参数

```sql
-- 关键字表
CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    method_name VARCHAR(100) NOT NULL,
    code TEXT,
    params_schema JSONB DEFAULT '{}',
    is_builtin BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 全局参数表
CREATE TABLE global_params (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name VARCHAR(255) NOT NULL,
    method_name VARCHAR(255) NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    input_params JSONB DEFAULT '[]',
    output_params JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 关系图

```
Project 1:N DatabaseConfig
Project 1:N Environment
Project 1:N GlobalVariable
Project 1:N InterfaceFolder
Project 1:N Interface
Project 1:N Scenario
Scenario 1:N ScenarioStep
Scenario 1:N TestDataset
TestPlan N:M Scenario (via plan_scenarios)
Execution 1:N ExecutionStep
Execution 1:1 Report
```

---

## 5. 执行引擎集成

### 5.1 执行流程

```
用户点击「执行」
        │
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  FastAPI      │────▶│  创建执行记录  │────▶│  提交 Celery  │
│  API          │     │  status=pending│     │  任务         │
└───────────────┘     └───────────────┘     └───────────────┘
                                                    │
        ┌───────────────────────────────────────────┘
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Celery       │────▶│  更新状态     │────▶│  调用执行引擎  │
│  Worker       │     │  running      │     │  (Python模块)  │
└───────────────┘     └───────────────┘     └───────────────┘
                                                    │
        ┌───────────────────────────────────────────┘
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Execution    │────▶│  WebSocket    │────▶│  保存步骤结果  │
│  Engine       │     │  推送进度     │     │  到数据库     │
└───────────────┘     └───────────────┘     └───────────────┘
                                                    │
        ┌───────────────────────────────────────────┘
        ▼
┌───────────────┐     ┌───────────────┐
│  更新状态     │────▶│  生成报告     │
│  completed    │     │  (Allure等)   │
└───────────────┘     └───────────────┘
```

### 5.2 模块结构

```python
# backend/app/modules/execution/

execution/
├── __init__.py
├── routes.py              # API 路由
├── service.py             # 业务逻辑
├── tasks.py               # Celery 异步任务
├── engine/
│   ├── __init__.py
│   ├── runner.py          # 执行器核心
│   ├── yaml_builder.py    # YAML 构建（场景 → YAML）
│   ├── step_executor.py   # 步骤执行器
│   ├── assertion.py       # 断言处理
│   ├── extractor.py       # 变量提取
│   └── db_operator.py     # 数据库操作
├── websocket.py           # WebSocket 管理
├── models.py              # 数据模型
└── schemas.py             # Pydantic schemas
```

### 5.3 Celery 任务设计

```python
@shared_task(bind=True, max_retries=0)
def execute_plan(self, execution_id: str, plan_id: str, environment_id: str):
    """
    执行测试计划的 Celery 任务

    支持：
    - 通过 self.request.id 获取 task_id，用于终止
    - 通过 Redis 检查 pause 信号
    - 通过 WebSocket 推送进度
    """
    task_id = self.request.id

    # 更新执行记录，关联 celery_task_id
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
        return {"status": "cancelled"}

    except Exception as e:
        update_execution(execution_id, status="failed", error=str(e))
        raise
```

### 5.4 终止/暂停机制

```python
class ExecutionService:

    async def cancel_execution(self, execution_id: str) -> None:
        """终止执行"""
        execution = await self.get_execution(execution_id)

        if execution.status not in ["pending", "running", "paused"]:
            raise BadRequestError("当前状态不支持终止")

        # 1. 通过 Celery 终止任务
        if execution.celery_task_id:
            app.control.revoke(
                execution.celery_task_id,
                terminate=True,
                signal='SIGTERM'
            )

        # 2. 设置 Redis 取消信号
        await redis.set(f"task:cancel:{execution.celery_task_id}", "1", ex=3600)

        # 3. 更新数据库状态
        execution.status = "cancelled"
        execution.finished_at = datetime.utcnow()
        await self.session.commit()

        # 4. WebSocket 通知前端
        await broadcast_to_execution(execution_id, {
            "type": "execution_cancelled",
            "execution_id": execution_id
        })

    async def pause_execution(self, execution_id: str) -> None:
        """暂停执行"""
        # 设置 Redis 暂停信号
        await redis.set(f"task:pause:{execution.celery_task_id}", "1", ex=3600)
        execution.status = "paused"
        await self.session.commit()

    async def resume_execution(self, execution_id: str) -> None:
        """恢复执行"""
        # 清除暂停信号
        await redis.delete(f"task:pause:{execution.celery_task_id}")
        execution.status = "running"
        await self.session.commit()
```

### 5.5 WebSocket 实时推送

```python
class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, execution_id: str):
        await websocket.accept()
        if execution_id not in self.active_connections:
            self.active_connections[execution_id] = set()
        self.active_connections[execution_id].add(websocket)

    async def broadcast(self, execution_id: str, message: dict):
        """向订阅该执行的所有客户端广播消息"""
        if execution_id not in self.active_connections:
            return

        for connection in self.active_connections[execution_id]:
            try:
                await connection.send_json(message)
            except:
                # 清理断开的连接
                pass
```

### 5.6 推送消息格式

```json
// 场景开始
{
  "type": "scenario_started",
  "execution_id": "uuid",
  "scenario_id": "uuid",
  "scenario_name": "登录测试",
  "current": 1,
  "total": 5
}

// 步骤完成
{
  "type": "step_completed",
  "execution_id": "uuid",
  "scenario_id": "uuid",
  "step_name": "发送登录请求",
  "status": "passed",
  "duration_ms": 234,
  "request": { "method": "POST", "url": "/api/login" },
  "response": { "status_code": 200, "body": {} },
  "assertions": [{ "expression": "$.code == 0", "result": true }]
}

// 执行完成
{
  "type": "execution_completed",
  "execution_id": "uuid",
  "status": "completed",
  "total_scenarios": 5,
  "passed": 4,
  "failed": 1,
  "duration_ms": 5678
}
```

---

## 6. 前端架构

### 6.1 目录结构

```
frontend/src/
├── main.tsx
├── App.tsx
├── features/                   # 按业务模块组织
│   ├── auth/
│   ├── project/
│   ├── interface/
│   ├── scenario/
│   ├── plan/
│   ├── execution/
│   ├── report/
│   ├── keyword/
│   └── setting/
├── components/
│   ├── ui/                     # shadcn/ui 组件
│   ├── layout/                 # 布局组件
│   └── common/                 # 公共业务组件
├── hooks/
├── stores/                     # Zustand 状态管理
│   ├── authStore.ts
│   ├── projectStore.ts
│   ├── environmentStore.ts
│   └── tabStore.ts
├── lib/
│   ├── api-client.ts
│   ├── utils.ts
│   └── constants.ts
├── types/
└── router/
```

### 6.2 状态管理

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

// stores/projectStore.ts
interface ProjectState {
  currentProject: Project | null
  currentProjectId: string | null
  setProject: (project: Project) => void
  clearProject: () => void
}

// stores/environmentStore.ts
interface EnvironmentState {
  currentEnvironment: Environment | null
  environments: Environment[]
  setEnvironments: (envs: Environment[]) => void
  setCurrentEnvironment: (env: Environment) => void
}

// stores/tabStore.ts
interface TabState {
  tabs: Tab[]
  activeKey: string
  addTab: (tab: Tab) => void
  removeTab: (key: string) => void
  setActiveKey: (key: string) => void
  closeOtherTabs: (key: string) => void
  closeAllTabs: () => void
}
```

### 6.3 WebSocket 集成

```typescript
// hooks/useExecutionWebSocket.ts
export function useExecutionWebSocket(executionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (!executionId) return

    const ws = new WebSocket(`${WS_BASE_URL}/ws/execution/${executionId}`)
    wsRef.current = ws

    ws.onopen = () => {
      // 开始心跳
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        }
      }, 30000)
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      handleMessage(message)
    }

    ws.onclose = () => {
      // 自动重连
      setTimeout(connect, 3000)
    }
  }, [executionId])

  useEffect(() => {
    connect()
    return () => wsRef.current?.close()
  }, [connect])
}
```

---

## 7. 后端 API 设计

### 7.1 API 路由结构

```
/api/v1
├── /auth                          # 认证模块
│   ├── POST   /register
│   ├── POST   /login
│   ├── POST   /logout
│   └── GET    /me
│
├── /projects                      # 项目管理
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /{project_id}
│   ├── PUT    /{project_id}
│   └── DELETE /{project_id}
│
├── /projects/{project_id}
│   ├── /databases                 # 数据库配置
│   ├── /environments              # 环境管理
│   ├── /global-variables          # 全局变量
│   ├── /interfaces                # 接口定义
│   ├── /scenarios                 # 场景编排
│   └── /plans                     # 测试计划
│
├── /executions                    # 执行管理
│   ├── POST   /
│   ├── GET    /{execution_id}
│   ├── POST   /{execution_id}/cancel
│   ├── POST   /{execution_id}/pause
│   ├── POST   /{execution_id}/resume
│   └── WS     /ws/{execution_id}
│
├── /reports                       # 测试报告
├── /keywords                      # 关键字配置
└── /settings                      # 系统设置
```

### 7.2 统一响应格式

```typescript
// 成功响应
{
  "code": 0,
  "message": "success",
  "data": { ... }
}

// 分页响应
{
  "code": 0,
  "message": "success",
  "data": [...],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
}

// 错误响应
{
  "code": 400,
  "message": "参数验证失败",
  "detail": [...]
}
```

---

## 8. UI 组件规范

### 8.1 样式规范

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      borderRadius: {
        'DEFAULT': '0.5rem',     // 8px
        'sm': '0.25rem',         // 4px
        'md': '0.375rem',        // 6px
        'lg': '0.5rem',          // 8px - 卡片、弹窗
        'xl': '0.75rem',         // 12px
        '2xl': '1rem',           // 16px - 模态框
      },
    },
  },
}
```

### 8.2 组件规范

| 场景 | 规范 | 组件 |
|------|------|------|
| Toast 提示 | 右上角，带进度条倒计时 | `<Toaster />` |
| 删除操作 | 二次确认弹窗 | `<ConfirmDialog variant="destructive" />` |
| 表单提交 | 成功后 Toast + 关闭弹窗 | `toast.success('保存成功')` |
| 加载状态 | 按钮显示 loading 动画 | `<Button loading={isLoading}>` |
| 空状态 | 统一空状态组件 | `<EmptyState />` |
| 分页 | 底部分页组件 | `<Pagination />` |
| Key-Value | 必须使用 trimmedKey | `keyValueToArray()` |

### 8.3 圆角检查清单

```tsx
// ✅ 确保所有弹窗/抽屉有圆角
<Dialog className="rounded-lg">
<Sheet className="rounded-l-lg">
<Drawer className="rounded-t-lg">

// ✅ 确保所有输入框有统一圆角
<Input className="rounded-md" />

// ✅ 确保所有按钮有统一圆角
<Button className="rounded-md" />

// ✅ 确保所有卡片有统一圆角
<Card className="rounded-lg" />
```

---

## 9. 开发计划

### 9.1 阶段划分

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| **Phase 1** | 基础设施 | 2-3 天 |
| **Phase 2** | 认证与项目管理 | 2-3 天 |
| **Phase 3** | 接口定义 | 3-4 天 |
| **Phase 4** | 场景编排 | 4-5 天 |
| **Phase 5** | 测试计划 | 2-3 天 |
| **Phase 6** | 执行引擎（核心） | 5-7 天 |
| **Phase 7** | 测试报告 | 2-3 天 |
| **Phase 8** | 辅助模块 | 3-4 天 |
| **Phase 9** | 测试与优化 | 3-5 天 |

**总预计工期: 26-37 天**

### 9.2 里程碑

| 里程碑 | 预计完成 | 交付物 |
|--------|----------|--------|
| **M1: 基础可用** | Phase 1-2 完成 | 用户可登录、管理项目 |
| **M2: 接口定义** | Phase 3 完成 | 可定义接口、管理环境 |
| **M3: 场景编排** | Phase 4-5 完成 | 可编排场景和计划 |
| **M4: 核心执行** | Phase 6 完成 | 可执行测试、实时报告、终止/暂停 |
| **M5: 完整功能** | Phase 7-8 完成 | 报告、关键字、Dashboard |
| **M6: 生产就绪** | Phase 9 完成 | 测试覆盖、文档完善 |

### 9.3 Phase 1 详细任务

```
1.1 后端项目结构
    ├── 创建模块化目录结构
    ├── 配置 FastAPI 应用入口
    ├── 配置 CORS、异常处理中间件
    └── 配置日志系统

1.2 数据库层
    ├── 定义所有 SQLAlchemy 模型
    ├── 配置 Alembic 迁移
    ├── 创建初始迁移文件
    └── 编写种子数据脚本

1.3 前端项目结构
    ├── 创建 feature-based 目录结构
    ├── 配置 Vite + TypeScript
    ├── 配置 Tailwind CSS + shadcn/ui
    ├── 配置路由和布局组件
    └── 封装 API Client

1.4 中间件
    ├── 配置 Redis 连接
    ├── 配置 Celery Worker
    ├── 配置 MinIO 连接
    └── Docker Compose 编排
```

### 9.4 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 执行引擎集成复杂 | Phase 6 延期 | 提前验证 sisyphus-api-engine 模块化 |
| WebSocket 稳定性 | 实时报告不可用 | 实现自动重连 + 状态持久化 |
| Celery 任务管理 | 终止/暂停失效 | Redis 信号 + Worker 内部检查 |

---

> **文档结束** — Sisyphus-X 全面重构设计文档 v1.0
