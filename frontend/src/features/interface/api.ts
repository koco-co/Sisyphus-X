// frontend/src/features/interface/api.ts
import { get, post, put, del } from '@/lib/api-client'
import type { PagedResponse } from '@/features/project/types'
import type {
  InterfaceFolder,
  Interface,
  FolderCreate,
  FolderUpdate,
  InterfaceCreate,
  InterfaceUpdate,
} from './types'

const baseUrl = (projectId: string) => `/projects/${projectId}/interfaces`

export const interfaceApi = {
  // 目录管理
  getFolders: (projectId: string) =>
    get<InterfaceFolder[]>(`${baseUrl(projectId)}/folders`),

  createFolder: (projectId: string, data: FolderCreate) =>
    post<InterfaceFolder>(`${baseUrl(projectId)}/folders`, data),

  updateFolder: (projectId: string, folderId: string, data: FolderUpdate) =>
    put<InterfaceFolder>(`${baseUrl(projectId)}/folders/${folderId}`, data),

  deleteFolder: (projectId: string, folderId: string) =>
    del<void>(`${baseUrl(projectId)}/folders/${folderId}`),

  // 接口管理
  list: (projectId: string, params?: {
    folder_id?: string
    search?: string
    method?: string
    page?: number
    page_size?: number
  }) =>
    get<PagedResponse<Interface>>(baseUrl(projectId), params),

  get: (projectId: string, interfaceId: string) =>
    get<Interface>(`${baseUrl(projectId)}/${interfaceId}`),

  create: (projectId: string, data: InterfaceCreate) =>
    post<Interface>(baseUrl(projectId), data),

  update: (projectId: string, interfaceId: string, data: InterfaceUpdate) =>
    put<Interface>(`${baseUrl(projectId)}/${interfaceId}`, data),

  delete: (projectId: string, interfaceId: string) =>
    del<void>(`${baseUrl(projectId)}/${interfaceId}`),

  move: (projectId: string, interfaceId: string, folderId: string | null) =>
    post<Interface>(`${baseUrl(projectId)}/${interfaceId}/move`, {
      folder_id: folderId,
    }),
}
