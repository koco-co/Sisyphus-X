/**
 * 关键字类型定义
 */

export interface Keyword {
  id: string
  project_id: string | null
  name: string
  class_name: string
  method_name: string
  description: string | null
  code: string
  parameters: string | null
  return_type: string | null
  is_built_in: boolean
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  key: string
  description?: string
}
