// frontend/src/features/project/api.ts
import { get, post, put, del } from '@/lib/api-client'
import type { Project, ProjectCreate, ProjectUpdate, PagedResponse } from './types'

export const projectApi = {
  list: (params?: { search?: string; page?: number; page_size?: number; name?: string }) =>
    get<PagedResponse<Project>>('/projects', params),

  get: (id: string) =>
    get<Project>(`/projects/${id}`),

  create: (data: ProjectCreate) =>
    post<Project>('/projects', data),

  update: (id: string, data: ProjectUpdate) =>
    put<Project>(`/projects/${id}`, data),

  delete: (id: string) =>
    del<void>(`/projects/${id}`),
}
