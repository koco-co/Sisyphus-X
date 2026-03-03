// frontend/src/features/project/types.ts
export interface Project {
  id: string
  name: string
  key?: string
  description?: string
  owner?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ProjectCreate {
  name: string
  key?: string
  description?: string
  owner?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string
}

export interface PagedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages?: number
}
