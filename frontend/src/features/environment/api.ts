// frontend/src/features/environment/api.ts
import { get, post, put, del } from '@/lib/api-client'
import type {
  Environment,
  EnvironmentCreate,
  EnvironmentUpdate,
  EnvironmentVariable,
  EnvironmentVariableCreate,
  EnvironmentVariableUpdate,
  GlobalVariable,
  GlobalVariableCreate,
  GlobalVariableUpdate,
} from './types'

const envBaseUrl = (projectId: string) => `/projects/${projectId}/environments`
const globalVarBaseUrl = (projectId: string) => `/projects/${projectId}/global-variables`

export const environmentApi = {
  // 环境管理
  list: (projectId: string) =>
    get<Environment[]>(envBaseUrl(projectId)),

  get: (projectId: string, environmentId: string) =>
    get<Environment>(`${envBaseUrl(projectId)}/${environmentId}`),

  create: (projectId: string, data: EnvironmentCreate) =>
    post<Environment>(envBaseUrl(projectId), data),

  update: (projectId: string, environmentId: string, data: EnvironmentUpdate) =>
    put<Environment>(`${envBaseUrl(projectId)}/${environmentId}`, data),

  delete: (projectId: string, environmentId: string) =>
    del<void>(`${envBaseUrl(projectId)}/${environmentId}`),

  setDefault: (projectId: string, environmentId: string) =>
    post<Environment>(`${envBaseUrl(projectId)}/${environmentId}/set-default`, {}),

  // 环境变量管理
  addVariable: (projectId: string, environmentId: string, data: EnvironmentVariableCreate) =>
    post<EnvironmentVariable>(`${envBaseUrl(projectId)}/${environmentId}/variables`, data),

  updateVariable: (projectId: string, variableId: string, data: EnvironmentVariableUpdate) =>
    put<EnvironmentVariable>(`${envBaseUrl(projectId)}/variables/${variableId}`, data),

  deleteVariable: (projectId: string, variableId: string) =>
    del<void>(`${envBaseUrl(projectId)}/variables/${variableId}`),
}

export const globalVariableApi = {
  list: (projectId: string) =>
    get<{ items: GlobalVariable[]; total: number }>(globalVarBaseUrl(projectId)),

  create: (projectId: string, data: GlobalVariableCreate) =>
    post<GlobalVariable>(globalVarBaseUrl(projectId), data),

  update: (projectId: string, variableId: string, data: GlobalVariableUpdate) =>
    put<GlobalVariable>(`${globalVarBaseUrl(projectId)}/${variableId}`, data),

  delete: (projectId: string, variableId: string) =>
    del<void>(`${globalVarBaseUrl(projectId)}/${variableId}`),
}
