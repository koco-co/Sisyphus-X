// 项目类型
export interface Project {
    id?: number
    name: string
    key: string
    owner: string
    description?: string
    created_at?: string
}

// 接口类型
export interface Interface {
    id?: number
    project_id: number
    name: string
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    status: '开发中' | '已完成' | '废弃'
    headers?: Record<string, string>
    schema_snapshot?: Record<string, unknown>
}

// 测试用例类型
export interface TestCase {
    id?: number
    interface_id?: number
    title: string
    priority: 'P0' | 'P1' | 'P2' | 'P3'
    pre_conditions?: string
    steps_data: { step: string; expect: string }[]
    engine_type: 'api' | 'web' | 'app' | 'manual'
    tags: string[]
}

// 测试场景类型
export interface TestScenario {
    id?: number
    project_id: number
    name: string
    cron_expression?: string
    graph_data: Record<string, unknown>
}
