# Phase 7: 测试报告模块 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现测试报告功能，包括报告列表、报告详情、报告生成、报告导出。

**Architecture:** 后端使用 FastAPI + SQLAlchemy 2.0 async，报告数据从 Execution 和 ExecutionStep 聚合生成。支持平台报告和 Allure 格式。

**Tech Stack:** FastAPI, Pydantic v2, SQLAlchemy 2.0, React, React Query, shadcn/ui

---

## 前置条件

- Phase 1-6 已完成
- 数据库模型已定义 (Execution, ExecutionStep, Report)

---

## Task 1: 报告服务层

**Files:**
- Create: `backend/app/modules/report/schemas.py`
- Create: `backend/app/modules/report/service.py`

**实现 schemas.py:**

```python
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional, List, Dict, Any

# 报告统计
class ReportStatistics(BaseModel):
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int
    skipped_scenarios: int
    total_steps: int
    passed_steps: int
    failed_steps: int
    pass_rate: float
    duration_ms: int

# 步骤结果
class StepResult(BaseModel):
    id: UUID
    step_name: str
    status: str
    duration_ms: Optional[int]
    request_data: Optional[Dict[str, Any]]
    response_data: Optional[Dict[str, Any]]
    assertions: Optional[Dict[str, Any]]
    error_message: Optional[str]

# 场景结果
class ScenarioResult(BaseModel):
    scenario_id: UUID
    scenario_name: str
    status: str
    duration_ms: Optional[int]
    steps: List[StepResult]

# 报告详情
class ReportDetailResponse(BaseModel):
    id: UUID
    execution_id: UUID
    report_type: str
    storage_path: Optional[str]
    expires_at: Optional[datetime]
    created_at: datetime

    # 执行信息
    execution_status: str
    started_at: Optional[datetime]
    finished_at: Optional[datetime]

    # 关联信息
    plan_name: Optional[str]
    scenario_name: Optional[str]
    environment_name: Optional[str]

    # 统计数据
    statistics: ReportStatistics

    # 场景结果
    scenarios: List[ScenarioResult]

# 报告简要响应
class ReportBriefResponse(BaseModel):
    id: UUID
    execution_id: UUID
    report_type: str
    created_at: datetime
    expires_at: Optional[datetime]

    # 执行信息
    execution_status: str
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int

    # 关联信息
    plan_name: Optional[str]
    scenario_name: Optional[str]

# 报告列表响应
class ReportListResponse(BaseModel):
    items: List[ReportBriefResponse]
    total: int
```

**实现 service.py:**

ReportService 类:
- list(project_id, page, page_size) -> Tuple[List[Report], int]
- get(report_id) -> ReportDetailResponse
- get_by_execution(execution_id) -> ReportDetailResponse
- generate_report(execution_id) -> Report
- delete(report_id) -> None
- cleanup_expired() -> int (清理过期报告)

---

## Task 2: 报告路由

**Files:**
- Create: `backend/app/modules/report/routes.py`
- Modify: `backend/app/main.py`

**实现路由 (prefix="/reports"):**

- GET / - 报告列表
- GET /{report_id} - 报告详情
- GET /execution/{execution_id} - 根据执行ID获取报告
- DELETE /{report_id} - 删除报告
- GET /{report_id}/export - 导出报告 (JSON/HTML)

---

## Task 3: 前端报告 API 和类型

**Files:**
- Create: `frontend/src/features/report/types.ts`
- Create: `frontend/src/features/report/api.ts`

**实现 types.ts:**

```typescript
export interface ReportStatistics {
  total_scenarios: number
  passed_scenarios: number
  failed_scenarios: number
  skipped_scenarios: number
  total_steps: number
  passed_steps: number
  failed_steps: number
  pass_rate: number
  duration_ms: number
}

export interface StepResult {
  id: string
  step_name: string
  status: string
  duration_ms: number | null
  request_data: Record<string, unknown> | null
  response_data: Record<string, unknown> | null
  assertions: Record<string, unknown> | null
  error_message: string | null
}

export interface ScenarioResult {
  scenario_id: string
  scenario_name: string
  status: string
  duration_ms: number | null
  steps: StepResult[]
}

export interface ReportDetail {
  id: string
  execution_id: string
  report_type: string
  storage_path: string | null
  expires_at: string | null
  created_at: string
  execution_status: string
  started_at: string | null
  finished_at: string | null
  plan_name: string | null
  scenario_name: string | null
  environment_name: string | null
  statistics: ReportStatistics
  scenarios: ScenarioResult[]
}

export interface ReportBrief {
  id: string
  execution_id: string
  report_type: string
  created_at: string
  expires_at: string | null
  execution_status: string
  total_scenarios: number
  passed_scenarios: number
  failed_scenarios: number
  plan_name: string | null
  scenario_name: string | null
}
```

**实现 api.ts:**

```typescript
export const reportApi = {
  list: (params?) => get('/reports', params),
  get: (reportId: string) => get(`/reports/${reportId}`),
  getByExecution: (executionId: string) => get(`/reports/execution/${executionId}`),
  delete: (reportId: string) => del(`/reports/${reportId}`),
  export: (reportId: string, format: 'json' | 'html') => get(`/reports/${reportId}/export`, { format }),
}
```

---

## Task 4: 集成测试与验证

**验证步骤:**
1. 验证后端路由注册
2. 验证报告生成逻辑
3. 提交最终代码

---

## Phase 7 完成检查清单

- [ ] 报告服务层 (CRUD, 统计聚合)
- [ ] 报告路由 (API 端点)
- [ ] 前端报告 API 和类型
- [ ] 集成测试验证

---

> **文档结束** — Phase 7: 测试报告模块实施计划
