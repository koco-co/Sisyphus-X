// frontend/src/features/execution/api.ts
import { get, post } from '@/lib/api-client'
import type { PagedResponse } from '@/features/project/types'
import type { Execution, ExecutionBrief, ExecutionCreate, ExecutionStep } from './types'

const baseUrl = '/executions'

export const executionApi = {
  // 执行列表
  list: (params?: {
    project_id?: string
    status?: string
    page?: number
    page_size?: number
  }) => get<PagedResponse<ExecutionBrief>>(baseUrl, params),

  // 获取执行详情
  get: (executionId: string) => get<Execution>(`${baseUrl}/${executionId}`),

  // 创建执行（触发执行）
  create: (data: ExecutionCreate & { project_id?: string }) =>
    post<Execution>(baseUrl, data),

  // 终止执行
  cancel: (executionId: string) =>
    post<void>(`${baseUrl}/${executionId}/cancel`),

  // 暂停执行
  pause: (executionId: string) =>
    post<void>(`${baseUrl}/${executionId}/pause`),

  // 恢复执行
  resume: (executionId: string) =>
    post<void>(`${baseUrl}/${executionId}/resume`),

  // 获取执行步骤
  getSteps: (executionId: string) =>
    get<ExecutionStep[]>(`${baseUrl}/${executionId}/steps`),
}
