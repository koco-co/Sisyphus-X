// frontend/src/features/scenario/types.ts

export type Priority = 'P0' | 'P1' | 'P2' | 'P3'

export interface ScenarioStep {
  id: string
  scenario_id: string
  name: string
  keyword_type: string
  keyword_method: string
  config: Record<string, unknown> | null
  sort_order: number
  created_at: string
}

export interface ScenarioStepCreate {
  name: string
  keyword_type: string
  keyword_method: string
  config?: Record<string, unknown>
  sort_order?: number
}

export interface ScenarioStepUpdate {
  name?: string
  keyword_type?: string
  keyword_method?: string
  config?: Record<string, unknown>
  sort_order?: number
}

export interface DatasetRow {
  id: string
  dataset_id: string
  row_data: Record<string, unknown> | null
  sort_order: number
}

export interface DatasetRowCreate {
  row_data?: Record<string, unknown>
  sort_order?: number
}

export interface DatasetRowUpdate {
  row_data?: Record<string, unknown>
  sort_order?: number
}

export interface TestDataset {
  id: string
  scenario_id: string
  name: string
  headers: string[] | null
  created_at: string
  rows: DatasetRow[]
}

export interface TestDatasetCreate {
  name: string
  headers?: string[]
  rows?: DatasetRowCreate[]
}

export interface TestDatasetUpdate {
  name?: string
  headers?: string[]
}

export interface Scenario {
  id: string
  project_id: string
  name: string
  description: string | null
  priority: Priority
  tags: string[] | null
  variables: Record<string, unknown> | null
  pre_sql: string | null
  post_sql: string | null
  created_at: string
  updated_at: string
  steps: ScenarioStep[]
  datasets: TestDataset[]
}

export interface ScenarioBrief {
  id: string
  project_id: string
  name: string
  description: string | null
  priority: Priority
  tags: string[] | null
  created_at: string
  updated_at: string
  step_count: number
}

export interface ScenarioCreate {
  name: string
  description?: string
  priority?: Priority
  tags?: string[]
  variables?: Record<string, unknown>
  pre_sql?: string
  post_sql?: string
  steps?: ScenarioStepCreate[]
}

export interface ScenarioUpdate {
  name?: string
  description?: string
  priority?: Priority
  tags?: string[]
  variables?: Record<string, unknown>
  pre_sql?: string
  post_sql?: string
}
