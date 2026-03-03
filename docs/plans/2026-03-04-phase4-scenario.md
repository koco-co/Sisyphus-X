# Phase 4: 场景编排模块 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现场景编排功能，包括场景管理、步骤编排、数据集管理。

**Architecture:** 后端使用 FastAPI + SQLAlchemy 2.0 async，前端使用 React + Zustand + React Query。场景包含多个步骤，步骤使用关键字驱动。

**Tech Stack:** FastAPI, Pydantic v2, SQLAlchemy 2.0, React, Zustand, React Query, shadcn/ui

---

## 前置条件

- Phase 1-3 已完成
- 数据库模型已定义 (Scenario, ScenarioStep, TestDataset, DatasetRow)

---

## Task 1: 场景服务层

**Files:**
- Create: `backend/app/modules/scenario/schemas.py`
- Create: `backend/app/modules/scenario/service.py`

**Step 1: 创建 schemas.py**

```python
# backend/app/modules/scenario/schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional, List, Dict, Any


# ============ 场景步骤 Schemas ============

class ScenarioStepCreate(BaseModel):
    """创建场景步骤请求"""
    name: str = Field(..., min_length=1, max_length=255)
    keyword_type: str = Field(..., min_length=1, max_length=100)
    keyword_method: str = Field(..., min_length=1, max_length=100)
    config: Optional[Dict[str, Any]] = None
    sort_order: int = 0


class ScenarioStepUpdate(BaseModel):
    """更新场景步骤请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    keyword_type: Optional[str] = Field(None, min_length=1, max_length=100)
    keyword_method: Optional[str] = Field(None, min_length=1, max_length=100)
    config: Optional[Dict[str, Any]] = None
    sort_order: Optional[int] = None


class ScenarioStepResponse(BaseModel):
    """场景步骤响应"""
    id: UUID
    scenario_id: UUID
    name: str
    keyword_type: str
    keyword_method: str
    config: Optional[Dict[str, Any]]
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 数据集 Schemas ============

class DatasetRowCreate(BaseModel):
    """创建数据集行请求"""
    row_data: Optional[Dict[str, Any]] = None
    sort_order: int = 0


class DatasetRowResponse(BaseModel):
    """数据集行响应"""
    id: UUID
    dataset_id: UUID
    row_data: Optional[Dict[str, Any]]
    sort_order: int

    class Config:
        from_attributes = True


class TestDatasetCreate(BaseModel):
    """创建测试数据集请求"""
    name: str = Field(..., min_length=1, max_length=255)
    headers: Optional[List[str]] = None
    rows: Optional[List[DatasetRowCreate]] = None


class TestDatasetUpdate(BaseModel):
    """更新测试数据集请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    headers: Optional[List[str]] = None


class TestDatasetResponse(BaseModel):
    """测试数据集响应"""
    id: UUID
    scenario_id: UUID
    name: str
    headers: Optional[List[str]]
    created_at: datetime
    rows: List[DatasetRowResponse] = []

    class Config:
        from_attributes = True


# ============ 场景 Schemas ============

class ScenarioCreate(BaseModel):
    """创建场景请求"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    priority: str = Field("P2", pattern="^P[0-3]$")
    tags: Optional[List[str]] = None
    variables: Optional[Dict[str, Any]] = None
    pre_sql: Optional[str] = None
    post_sql: Optional[str] = None
    steps: Optional[List[ScenarioStepCreate]] = None


class ScenarioUpdate(BaseModel):
    """更新场景请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^P[0-3]$")
    tags: Optional[List[str]] = None
    variables: Optional[Dict[str, Any]] = None
    pre_sql: Optional[str] = None
    post_sql: Optional[str] = None


class ScenarioResponse(BaseModel):
    """场景响应"""
    id: UUID
    project_id: UUID
    name: str
    description: Optional[str]
    priority: str
    tags: Optional[List[str]]
    variables: Optional[Dict[str, Any]]
    pre_sql: Optional[str]
    post_sql: Optional[str]
    created_at: datetime
    updated_at: datetime
    steps: List[ScenarioStepResponse] = []
    datasets: List[TestDatasetResponse] = []

    class Config:
        from_attributes = True


class ScenarioBriefResponse(BaseModel):
    """场景简要响应（不含步骤和数据集）"""
    id: UUID
    project_id: UUID
    name: str
    description: Optional[str]
    priority: str
    tags: Optional[List[str]]
    created_at: datetime
    updated_at: datetime
    step_count: int = 0

    class Config:
        from_attributes = True


class ScenarioListResponse(BaseModel):
    """场景列表响应"""
    items: List[ScenarioBriefResponse]
    total: int
```

**Step 2: 创建 service.py**

实现以下服务类:

1. ScenarioService:
   - list(project_id, search, priority, page, page_size) -> Tuple[List[Scenario], int]
   - get(scenario_id, with_details=True) -> Scenario
   - create(project_id, data) -> Scenario
   - update(scenario_id, data) -> Scenario
   - delete(scenario_id) -> None
   - duplicate(scenario_id, new_name) -> Scenario

2. ScenarioStepService:
   - list_by_scenario(scenario_id) -> List[ScenarioStep]
   - create(scenario_id, data) -> ScenarioStep
   - update(step_id, data) -> ScenarioStep
   - delete(step_id) -> None
   - reorder(scenario_id, step_ids) -> List[ScenarioStep]
   - batch_create(scenario_id, steps) -> List[ScenarioStep]

3. TestDatasetService:
   - list_by_scenario(scenario_id) -> List[TestDataset]
   - get(dataset_id) -> TestDataset
   - create(scenario_id, data) -> TestDataset
   - update(dataset_id, data) -> TestDataset
   - delete(dataset_id) -> None
   - add_row(dataset_id, data) -> DatasetRow
   - update_row(row_id, data) -> DatasetRow
   - delete_row(row_id) -> None
   - import_csv(dataset_id, csv_content) -> TestDataset

**Step 3: Commit**

```bash
git add backend/app/modules/scenario/
git commit -m "feat(backend): add scenario service with steps and datasets"
```

---

## Task 2: 场景路由

**Files:**
- Create: `backend/app/modules/scenario/routes.py`
- Modify: `backend/app/main.py`

**实现路由 (prefix="/projects/{project_id}/scenarios"):**

**场景管理:**
- GET / - 场景列表
- POST / - 创建场景
- GET /{scenario_id} - 场景详情
- PUT /{scenario_id} - 更新场景
- DELETE /{scenario_id} - 删除场景
- POST /{scenario_id}/duplicate - 复制场景

**步骤管理:**
- GET /{scenario_id}/steps - 步骤列表
- POST /{scenario_id}/steps - 创建步骤
- POST /{scenario_id}/steps/batch - 批量创建步骤
- PUT /steps/{step_id} - 更新步骤
- DELETE /steps/{step_id} - 删除步骤
- POST /{scenario_id}/steps/reorder - 重排序步骤

**数据集管理:**
- GET /{scenario_id}/datasets - 数据集列表
- POST /{scenario_id}/datasets - 创建数据集
- GET /datasets/{dataset_id} - 数据集详情
- PUT /datasets/{dataset_id} - 更新数据集
- DELETE /datasets/{dataset_id} - 删除数据集
- POST /datasets/{dataset_id}/rows - 添加数据行
- PUT /datasets/rows/{row_id} - 更新数据行
- DELETE /datasets/rows/{row_id} - 删除数据行
- POST /datasets/{dataset_id}/import - 导入 CSV

**Step 4: Commit**

```bash
git add backend/app/modules/scenario/routes.py backend/app/main.py
git commit -m "feat(backend): add scenario routes with steps and datasets"
```

---

## Task 3: 前端场景 API 和类型

**Files:**
- Create: `frontend/src/features/scenario/types.ts`
- Create: `frontend/src/features/scenario/api.ts`

**实现 types.ts:**

```typescript
// 场景相关类型
export type Priority = 'P0' | 'P1' | 'P2' | 'P3'

export interface ScenarioStep {
  id: string
  scenario_id: string
  name: string
  keyword_type: string
  keyword_method: string
  config: Record<string, unknown> | null
  sort_order: number
  created_at: string
}

export interface DatasetRow {
  id: string
  dataset_id: string
  row_data: Record<string, unknown> | null
  sort_order: number
}

export interface TestDataset {
  id: string
  scenario_id: string
  name: string
  headers: string[] | null
  created_at: string
  rows: DatasetRow[]
}

export interface Scenario {
  id: string
  project_id: string
  name: string
  description: string | null
  priority: Priority
  tags: string[] | null
  variables: Record<string, unknown> | null
  pre_sql: string | null
  post_sql: string | null
  created_at: string
  updated_at: string
  steps: ScenarioStep[]
  datasets: TestDataset[]
}

export interface ScenarioBrief {
  id: string
  project_id: string
  name: string
  description: string | null
  priority: Priority
  tags: string[] | null
  created_at: string
  updated_at: string
  step_count: number
}

// Create/Update 类型...
```

**实现 api.ts:**

```typescript
export const scenarioApi = {
  // 场景管理
  list: (projectId: string, params?) => get(...),
  get: (projectId: string, scenarioId: string) => get(...),
  create: (projectId: string, data) => post(...),
  update: (projectId: string, scenarioId: string, data) => put(...),
  delete: (projectId: string, scenarioId: string) => del(...),
  duplicate: (projectId: string, scenarioId: string, newName: string) => post(...),

  // 步骤管理
  listSteps: (projectId: string, scenarioId: string) => get(...),
  createStep: (projectId: string, scenarioId: string, data) => post(...),
  batchCreateSteps: (projectId: string, scenarioId: string, steps) => post(...),
  updateStep: (projectId: string, stepId: string, data) => put(...),
  deleteStep: (projectId: string, stepId: string) => del(...),
  reorderSteps: (projectId: string, scenarioId: string, stepIds) => post(...),

  // 数据集管理
  listDatasets: (projectId: string, scenarioId: string) => get(...),
  // ...
}

export const datasetApi = {
  get: (projectId: string, datasetId: string) => get(...),
  create: (projectId: string, scenarioId: string, data) => post(...),
  update: (projectId: string, datasetId: string, data) => put(...),
  delete: (projectId: string, datasetId: string) => del(...),
  addRow: (projectId: string, datasetId: string, data) => post(...),
  updateRow: (projectId: string, rowId: string, data) => put(...),
  deleteRow: (projectId: string, rowId: string) => del(...),
  importCsv: (projectId: string, datasetId: string, csvContent: string) => post(...),
}
```

**Step 5: Commit**

```bash
git add frontend/src/features/scenario/
git commit -m "feat(frontend): add scenario API client and types"
```

---

## Task 4: 集成测试与验证

**Step 1: 验证后端路由**

```bash
cd backend && uv run python -c "from app.main import app; print(f'Total routes: {len(app.routes)}')"
```

**Step 2: 验证场景路由注册**

```bash
cd backend && uv run python -c "
from app.main import app
scenario_routes = [r for r in app.routes if hasattr(r, 'path') and '/scenarios' in r.path]
print(f'Scenario routes: {len(scenario_routes)}')
"
```

**Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete Phase 4 scenario orchestration module"
```

---

## Phase 4 完成检查清单

- [ ] 场景服务层 (CRUD, 复制)
- [ ] 场景步骤服务层 (CRUD, 重排序, 批量创建)
- [ ] 数据集服务层 (CRUD, 数据行, CSV导入)
- [ ] 场景路由 (场景 + 步骤 + 数据集)
- [ ] 前端场景 API 和类型
- [ ] 集成测试验证

---

> **文档结束** — Phase 4: 场景编排模块实施计划
