// frontend/src/features/execution/types.ts

// 执行状态
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'

// 执行记录
export interface Execution {
  id: string
  plan_id: string | null
  scenario_id: string | null
  environment_id: string
  status: ExecutionStatus
  celery_task_id: string | null
  total_scenarios: number
  passed_scenarios: number
  failed_scenarios: number
  skipped_scenarios: number
  started_at: string | null
  finished_at: string | null
  created_by: string | null
  created_at: string
  plan_name: string | null
  scenario_name: string | null
  environment_name: string | null
}

export interface ExecutionBrief {
  id: string
  plan_id: string | null
  scenario_id: string | null
  environment_id: string
  status: ExecutionStatus
  total_scenarios: number
  passed_scenarios: number
  failed_scenarios: number
  skipped_scenarios: number
  started_at: string | null
  finished_at: string | null
  created_at: string
  plan_name: string | null
  scenario_name: string | null
  environment_name: string | null
}

export interface ExecutionCreate {
  plan_id?: string
  scenario_id?: string
  environment_id: string
}

// 执行步骤
export interface ExecutionStep {
  id: string
  execution_id: string
  scenario_id: string | null
  step_name: string
  status: 'passed' | 'failed' | 'skipped'
  started_at: string | null
  finished_at: string | null
  request_data: Record<string, unknown> | null
  response_data: Record<string, unknown> | null
  assertions: Record<string, unknown> | null
  error_message: string | null
  duration_ms: number | null
}

// WebSocket 消息类型
export type WSMessageType =
  | 'scenario_started'
  | 'step_completed'
  | 'execution_completed'
  | 'execution_cancelled'
  | 'execution_paused'
  | 'execution_resumed'
  | 'pong'

export interface WSMessage {
  type: WSMessageType
  execution_id: string
  [key: string]: unknown
}

export interface ScenarioStartedMessage extends WSMessage {
  type: 'scenario_started'
  scenario_id: string
  scenario_name: string
  current: number
  total: number
}

export interface StepCompletedMessage extends WSMessage {
  type: 'step_completed'
  scenario_id: string
  step_name: string
  status: 'passed' | 'failed'
  duration_ms: number
  request?: Record<string, unknown>
  response?: Record<string, unknown>
  assertions?: Array<{ expression: string; result: boolean }>
  error_message?: string
}

export interface ExecutionCompletedMessage extends WSMessage {
  type: 'execution_completed'
  status: 'completed' | 'failed'
  total_scenarios: number
  passed: number
  failed: number
  skipped: number
  duration_ms: number
}
