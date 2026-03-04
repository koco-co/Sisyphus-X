// frontend/src/features/plan/types.ts

export interface PlanScenario {
  id: string
  plan_id: string
  scenario_id: string
  dataset_id: string | null
  variables_override: Record<string, unknown>
  sort_order: number
  created_at: string
  scenario_name: string | null
  dataset_name: string | null
}

export interface PlanScenarioCreate {
  scenario_id: string
  dataset_id?: string
  variables_override?: Record<string, unknown>
  sort_order?: number
}

export interface PlanScenarioUpdate {
  dataset_id?: string
  variables_override?: Record<string, unknown>
  sort_order?: number
}

export interface TestPlan {
  id: string
  project_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  scenarios: PlanScenario[]
}

export interface TestPlanBrief {
  id: string
  project_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  scenario_count: number
}

export interface TestPlanCreate {
  name: string
  description?: string
  scenarios?: PlanScenarioCreate[]
}

export interface TestPlanUpdate {
  name?: string
  description?: string
}
