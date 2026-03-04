// frontend/src/features/plan/api.ts
import { get, post, put, del } from '@/lib/api-client'
import type { PagedResponse } from '@/features/project/types'
import type {
  TestPlan,
  TestPlanBrief,
  TestPlanCreate,
  TestPlanUpdate,
  PlanScenario,
  PlanScenarioCreate,
  PlanScenarioUpdate,
} from './types'

const baseUrl = (projectId: string) => `/projects/${projectId}/plans`

export const testPlanApi = {
  // 计划管理
  list: (projectId: string, params?: {
    search?: string
    page?: number
    page_size?: number
  }) =>
    get<PagedResponse<TestPlanBrief>>(baseUrl(projectId), params),

  get: (projectId: string, planId: string) =>
    get<TestPlan>(`${baseUrl(projectId)}/${planId}`),

  create: (projectId: string, data: TestPlanCreate) =>
    post<TestPlan>(baseUrl(projectId), data),

  update: (projectId: string, planId: string, data: TestPlanUpdate) =>
    put<TestPlan>(`${baseUrl(projectId)}/${planId}`, data),

  delete: (projectId: string, planId: string) =>
    del<void>(`${baseUrl(projectId)}/${planId}`),

  duplicate: (projectId: string, planId: string, newName: string) =>
    post<TestPlan>(`${baseUrl(projectId)}/${planId}/duplicate`, { new_name: newName }),

  // 场景管理
  listScenarios: (projectId: string, planId: string) =>
    get<PlanScenario[]>(`${baseUrl(projectId)}/${planId}/scenarios`),

  addScenario: (projectId: string, planId: string, data: PlanScenarioCreate) =>
    post<PlanScenario>(`${baseUrl(projectId)}/${planId}/scenarios`, data),

  batchAddScenarios: (projectId: string, planId: string, scenarios: PlanScenarioCreate[]) =>
    post<PlanScenario[]>(`${baseUrl(projectId)}/${planId}/scenarios/batch`, { scenarios }),

  updateScenario: (projectId: string, planScenarioId: string, data: PlanScenarioUpdate) =>
    put<PlanScenario>(`/projects/${projectId}/plans/scenarios/${planScenarioId}`, data),

  removeScenario: (projectId: string, planScenarioId: string) =>
    del<void>(`/projects/${projectId}/plans/scenarios/${planScenarioId}`),

  reorderScenarios: (projectId: string, planId: string, planScenarioIds: string[]) =>
    post<PlanScenario[]>(`${baseUrl(projectId)}/${planId}/scenarios/reorder`, { plan_scenario_ids: planScenarioIds }),
}
