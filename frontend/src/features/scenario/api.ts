// frontend/src/features/scenario/api.ts
import { get, post, put, del } from '@/lib/api-client'
import type { PagedResponse } from '@/features/project/types'
import type {
  Scenario,
  ScenarioBrief,
  ScenarioCreate,
  ScenarioUpdate,
  ScenarioStep,
  ScenarioStepCreate,
  ScenarioStepUpdate,
  TestDataset,
  TestDatasetCreate,
  TestDatasetUpdate,
  DatasetRow,
  DatasetRowCreate,
  DatasetRowUpdate,
} from './types'

const baseUrl = (projectId: string) => `/projects/${projectId}/scenarios`

export const scenarioApi = {
  // 场景管理
  list: (projectId: string, params?: {
    search?: string
    priority?: string
    page?: number
    page_size?: number
  }) =>
    get<PagedResponse<ScenarioBrief>>(baseUrl(projectId), params),

  get: (projectId: string, scenarioId: string) =>
    get<Scenario>(`${baseUrl(projectId)}/${scenarioId}`),

  create: (projectId: string, data: ScenarioCreate) =>
    post<Scenario>(baseUrl(projectId), data),

  update: (projectId: string, scenarioId: string, data: ScenarioUpdate) =>
    put<Scenario>(`${baseUrl(projectId)}/${scenarioId}`, data),

  delete: (projectId: string, scenarioId: string) =>
    del<void>(`${baseUrl(projectId)}/${scenarioId}`),

  duplicate: (projectId: string, scenarioId: string, newName: string) =>
    post<Scenario>(`${baseUrl(projectId)}/${scenarioId}/duplicate`, { new_name: newName }),

  // 步骤管理
  listSteps: (projectId: string, scenarioId: string) =>
    get<ScenarioStep[]>(`${baseUrl(projectId)}/${scenarioId}/steps`),

  createStep: (projectId: string, scenarioId: string, data: ScenarioStepCreate) =>
    post<ScenarioStep>(`${baseUrl(projectId)}/${scenarioId}/steps`, data),

  batchCreateSteps: (projectId: string, scenarioId: string, steps: ScenarioStepCreate[]) =>
    post<ScenarioStep[]>(`${baseUrl(projectId)}/${scenarioId}/steps/batch`, { steps }),

  updateStep: (projectId: string, stepId: string, data: ScenarioStepUpdate) =>
    put<ScenarioStep>(`${baseUrl(projectId)}/steps/${stepId}`, data),

  deleteStep: (projectId: string, stepId: string) =>
    del<void>(`${baseUrl(projectId)}/steps/${stepId}`),

  reorderSteps: (projectId: string, scenarioId: string, stepIds: string[]) =>
    post<ScenarioStep[]>(`${baseUrl(projectId)}/${scenarioId}/steps/reorder`, { step_ids: stepIds }),

  // 数据集管理
  listDatasets: (projectId: string, scenarioId: string) =>
    get<TestDataset[]>(`${baseUrl(projectId)}/${scenarioId}/datasets`),

  createDataset: (projectId: string, scenarioId: string, data: TestDatasetCreate) =>
    post<TestDataset>(`${baseUrl(projectId)}/${scenarioId}/datasets`, data),
}

export const datasetApi = {
  get: (projectId: string, datasetId: string) =>
    get<TestDataset>(`/projects/${projectId}/scenarios/datasets/${datasetId}`),

  update: (projectId: string, datasetId: string, data: TestDatasetUpdate) =>
    put<TestDataset>(`/projects/${projectId}/scenarios/datasets/${datasetId}`, data),

  delete: (projectId: string, datasetId: string) =>
    del<void>(`/projects/${projectId}/scenarios/datasets/${datasetId}`),

  addRow: (projectId: string, datasetId: string, data: DatasetRowCreate) =>
    post<DatasetRow>(`/projects/${projectId}/scenarios/datasets/${datasetId}/rows`, data),

  updateRow: (projectId: string, rowId: string, data: DatasetRowUpdate) =>
    put<DatasetRow>(`/projects/${projectId}/scenarios/datasets/rows/${rowId}`, data),

  deleteRow: (projectId: string, rowId: string) =>
    del<void>(`/projects/${projectId}/scenarios/datasets/rows/${rowId}`),
}
