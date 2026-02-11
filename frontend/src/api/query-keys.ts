/**
 * React Query 查询键统一管理
 *
 * 统一管理所有查询键，确保缓存一致性，便于失效操作。
 *
 * 使用示例:
 * ```typescript
 * const { data } = useQuery({
 *   queryKey: queryKeys.projects.list(),
 *   queryFn: () => projectsApi.list(),
 * })
 *
 * // 失效缓存
 * queryClient.invalidateQueries({
 *   queryKey: queryKeys.projects.lists()
 * })
 * ```
 */

/**
 * 项目相关查询键
 */
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: { page?: number; size?: number; name?: string }) =>
    [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: number) => [...projectKeys.details(), id] as const,
  environments: (id: number) => [...projectKeys.detail(id), 'environments'] as const,
  datasources: (id: number) => [...projectKeys.detail(id), 'datasources'] as const,
} as const

/**
 * 接口相关查询键
 */
export const interfaceKeys = {
  all: ['interfaces'] as const,
  lists: () => [...interfaceKeys.all, 'list'] as const,
  list: (filters: { page?: number; size?: number; project_id?: number; folder_id?: number }) =>
    [...interfaceKeys.lists(), { filters }] as const,
  details: () => [...interfaceKeys.all, 'detail'] as const,
  detail: (id: number) => [...interfaceKeys.details(), id] as const,
  folders: (project_id?: number) =>
    [...interfaceKeys.all, 'folders', project_id] as const,
} as const

/**
 * 场景相关查询键
 */
export const scenarioKeys = {
  all: ['scenarios'] as const,
  lists: () => [...scenarioKeys.all, 'list'] as const,
  list: () => [...scenarioKeys.lists()] as const,
  details: () => [...scenarioKeys.all, 'detail'] as const,
  detail: (id: number) => [...scenarioKeys.details(), id] as const,
} as const

/**
 * 关键字相关查询键
 */
export const keywordKeys = {
  all: ['keywords'] as const,
  lists: () => [...keywordKeys.all, 'list'] as const,
  list: (filters: { page?: number; size?: number; project_id?: number }) =>
    [...keywordKeys.lists(), { filters }] as const,
  details: () => [...keywordKeys.all, 'detail'] as const,
  detail: (id: number) => [...keywordKeys.details(), id] as const,
} as const

/**
 * API 测试用例相关查询键
 */
export const apiTestCaseKeys = {
  all: ['api-test-cases'] as const,
  lists: () => [...apiTestCaseKeys.all, 'list'] as const,
  list: (projectId: number, filters?: {
    page?: number
    size?: number
    search?: string
    tags?: string
    enabled_only?: boolean
  }) => [...apiTestCaseKeys.lists(), projectId, { filters }] as const,
  details: () => [...apiTestCaseKeys.all, 'detail'] as const,
  detail: (id: number) => [...apiTestCaseKeys.details(), id] as const,
  executions: (id: number) => [...apiTestCaseKeys.detail(id), 'executions'] as const,
  execution: (executionId: number) =>
    [...apiTestCaseKeys.all, 'execution', executionId] as const,
  executionSteps: (executionId: number) =>
    [...apiTestCaseKeys.execution(executionId), 'steps'] as const,
} as const

/**
 * 测试执行相关查询键
 */
export const executionKeys = {
  all: ['executions'] as const,
  lists: () => [...executionKeys.all, 'list'] as const,
  list: (filters?: { status?: string; test_case_id?: number }) =>
    [...executionKeys.lists(), { filters }] as const,
  details: () => [...executionKeys.all, 'detail'] as const,
  detail: (id: number) => [...executionKeys.details(), id] as const,
} as const

/**
 * 报告相关查询键
 */
export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (filters: { page?: number; size?: number; scenario_id?: number }) =>
    [...reportKeys.lists(), { filters }] as const,
  detail: (id: number) => [...reportKeys.all, 'detail', id] as const,
  details: (id: number) => [...reportKeys.detail(id), 'details'] as const,
} as const

/**
 * 计划相关查询键
 */
export const planKeys = {
  all: ['plans'] as const,
  lists: () => [...planKeys.all, 'list'] as const,
  list: (filters?: { page?: number; size?: number }) =>
    [...planKeys.lists(), { filters }] as const,
  details: () => [...planKeys.all, 'detail'] as const,
  detail: (id: number) => [...planKeys.details(), id] as const,
} as const

/**
 * Dashboard 相关查询键
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  trend: () => [...dashboardKeys.all, 'trend'] as const,
  activities: () => [...dashboardKeys.all, 'activities'] as const,
} as const

/**
 * AI 配置相关查询键
 */
export const aiConfigKeys = {
  all: ['ai-configs'] as const,
  lists: () => [...aiConfigKeys.all, 'list'] as const,
  list: () => [...aiConfigKeys.lists()] as const,
  details: () => [...aiConfigKeys.all, 'detail'] as const,
  detail: (id: number) => [...aiConfigKeys.details(), id] as const,
  default: () => [...aiConfigKeys.all, 'default'] as const,
  presets: () => [...aiConfigKeys.all, 'presets'] as const,
} as const

/**
 * 功能测试相关查询键
 */
export const functionalTestKeys = {
  requirements: {
    all: ['requirements'] as const,
    lists: () => [...functionalTestKeys.requirements.all, 'list'] as const,
    list: (filters: { project_id?: number; status?: string }) =>
      [...functionalTestKeys.requirements.lists(), { filters }] as const,
    details: () => [...functionalTestKeys.requirements.all, 'detail'] as const,
    detail: (id: number) => [...functionalTestKeys.requirements.details(), id] as const,
  },
  testCases: {
    all: ['functional-test-cases'] as const,
    lists: () => [...functionalTestKeys.testCases.all, 'list'] as const,
    list: (filters: { requirement_id?: number }) =>
      [...functionalTestKeys.testCases.lists(), { filters }] as const,
    details: () => [...functionalTestKeys.testCases.all, 'detail'] as const,
    detail: (id: number) => [...functionalTestKeys.testCases.details(), id] as const,
  },
  testPoints: {
    all: ['functional-test-points'] as const,
    lists: () => [...functionalTestKeys.testPoints.all, 'list'] as const,
    list: (filters: { requirement_id?: number }) =>
      [...functionalTestKeys.testPoints.lists(), { filters }] as const,
    details: () => [...functionalTestKeys.testPoints.all, 'detail'] as const,
    detail: (id: number) => [...functionalTestKeys.testPoints.details(), id] as const,
  },
} as const

/**
 * 设置相关查询键
 */
export const settingsKeys = {
  all: ['settings'] as const,
  configs: () => [...settingsKeys.all, 'configs'] as const,
  config: (key: string) => [...settingsKeys.configs(), key] as const,
  channels: () => [...settingsKeys.all, 'channels'] as const,
  roles: () => [...settingsKeys.all, 'roles'] as const,
} as const

/**
 * 文档相关查询键
 */
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters: { project_id?: number }) =>
    [...documentKeys.lists(), { filters }] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: number) => [...documentKeys.details(), id] as const,
  versions: (id: number) => [...documentKeys.detail(id), 'versions'] as const,
} as const

/**
 * 所有查询键的集合
 */
export const queryKeys = {
  projects: projectKeys,
  interfaces: interfaceKeys,
  scenarios: scenarioKeys,
  keywords: keywordKeys,
  apiTestCases: apiTestCaseKeys,
  executions: executionKeys,
  reports: reportKeys,
  plans: planKeys,
  dashboard: dashboardKeys,
  aiConfigs: aiConfigKeys,
  functionalTests: functionalTestKeys,
  settings: settingsKeys,
  documents: documentKeys,
} as const

/**
 * 类型导出
 */
export type QueryKeys = typeof queryKeys
