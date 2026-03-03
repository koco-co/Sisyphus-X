// frontend/src/features/interface/types.ts

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface InterfaceFolder {
  id: string
  project_id: string
  parent_id: string | null
  name: string
  sort_order: number
  created_at: string
  children: InterfaceFolder[]
  interface_count: number
}

export interface Interface {
  id: string
  project_id: string
  folder_id: string | null
  name: string
  method: HttpMethod
  path: string
  headers: Record<string, unknown> | null
  params: Record<string, unknown> | null
  body: Record<string, unknown> | null
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface FolderCreate {
  name: string
  parent_id?: string
  sort_order?: number
}

export interface FolderUpdate {
  name?: string
  parent_id?: string
  sort_order?: number
}

export interface InterfaceCreate {
  name: string
  method: HttpMethod
  path: string
  folder_id?: string
  headers?: Record<string, unknown>
  params?: Record<string, unknown>
  body?: Record<string, unknown>
  description?: string
  sort_order?: number
}

export interface InterfaceUpdate {
  name?: string
  method?: HttpMethod
  path?: string
  folder_id?: string
  headers?: Record<string, unknown>
  params?: Record<string, unknown>
  body?: Record<string, unknown>
  description?: string
  sort_order?: number
}
