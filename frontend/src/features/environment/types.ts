// frontend/src/features/environment/types.ts

export interface EnvironmentVariable {
  id: string
  environment_id: string
  key: string
  value: string | null
  description: string | null
}

export interface Environment {
  id: string
  project_id: string
  name: string
  base_url: string | null
  is_default: boolean
  created_at: string
  variables: EnvironmentVariable[]
}

export interface EnvironmentCreate {
  name: string
  base_url?: string
  is_default?: boolean
  variables?: EnvironmentVariableCreate[]
}

export interface EnvironmentUpdate {
  name?: string
  base_url?: string
  is_default?: boolean
}

export interface EnvironmentVariableCreate {
  key: string
  value?: string
  description?: string
}

export interface EnvironmentVariableUpdate {
  key?: string
  value?: string
  description?: string
}

export interface GlobalVariable {
  id: string
  project_id: string
  key: string
  value: string | null
  description: string | null
}

export interface GlobalVariableCreate {
  key: string
  value?: string
  description?: string
}

export interface GlobalVariableUpdate {
  key?: string
  value?: string
  description?: string
}
