/**
 * 报告相关类型定义
 */

// 报告统计
export interface ReportStatistics {
  total_scenarios: number
  passed_scenarios: number
  failed_scenarios: number
  skipped_scenarios: number
  total_steps: number
  passed_steps: number
  failed_steps: number
  pass_rate: number
  duration_ms: number
}

// 步骤结果
export interface StepResult {
  id: string
  step_name: string
  status: 'passed' | 'failed' | 'skipped'
  started_at: string | null
  finished_at: string | null
  duration_ms: number | null
  request_data: Record<string, unknown> | null
  response_data: Record<string, unknown> | null
  assertions: Record<string, unknown> | null
  error_message: string | null
}

// 场景结果
export interface ScenarioResult {
  scenario_id: string | null
  scenario_name: string
  status: 'passed' | 'failed' | 'skipped'
  started_at: string | null
  finished_at: string | null
  duration_ms: number | null
  steps: StepResult[]
}

// 报告详情
export interface ReportDetail {
  id: string
  execution_id: string
  report_type: 'platform' | 'allure'
  storage_path: string | null
  expires_at: string | null
  created_at: string

  // 执行信息
  execution_status: string
  started_at: string | null
  finished_at: string | null

  // 关联信息
  plan_name: string | null
  scenario_name: string | null
  environment_name: string | null

  // 统计数据
  statistics: ReportStatistics

  // 场景结果
  scenarios: ScenarioResult[]
}

// 报告简要
export interface ReportBrief {
  id: string
  execution_id: string
  report_type: 'platform' | 'allure'
  created_at: string
  expires_at: string | null

  // 执行信息
  execution_status: string
  started_at: string | null
  finished_at: string | null
  total_scenarios: number
  passed_scenarios: number
  failed_scenarios: number

  // 关联信息
  plan_name: string | null
  scenario_name: string | null
  environment_name: string | null
}

// 报告列表响应
export interface ReportListResponse {
  items: ReportBrief[]
  total: number
}

// 报告查询参数
export interface ReportListParams {
  project_id?: string
  page?: number
  page_size?: number
}

// 报告导出格式
export type ReportExportFormat = 'json' | 'html'
