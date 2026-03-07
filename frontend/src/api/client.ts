import axios from 'axios'
import config from '@/config'

// API 基础配置
const api = axios.create({
    baseURL: config.apiBaseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: config.requestTimeout
})

// 请求拦截器 - 自动添加 Authorization header
api.interceptors.request.use((axiosConfig) => {
    const token = localStorage.getItem(config.storageKeys.token)
    if (token) {
        axiosConfig.headers.Authorization = `Bearer ${token}`
    }
    return axiosConfig
})

// 响应拦截器 - 处理 401 错误
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Check if auth is disabled
            if (import.meta.env.VITE_AUTH_DISABLED === 'true') {
                return Promise.reject(error)
            }
            // 排除登录/注册请求的 401 错误，不自动跳转
            const url = error.config?.url || ''
            if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
                localStorage.removeItem(config.storageKeys.token)
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

// 认证 API
export const authApi = {
    login: (email: string, password: string) => api.post('/auth/login', { email, password }),
    register: (username: string, email: string, password: string) =>
        api.post('/auth/register', { username, email, password }),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
    github: () => api.get('/auth/github'),
    google: () => api.get('/auth/google'),
}

// 文件 API (MinIO 上传，支持按 project 分桶)
export const filesApi = {
    upload: (file: File, projectId?: string) => {
        const formData = new FormData()
        formData.append('file', file)
        if (projectId) formData.append('project_id', projectId)
        return api.post('/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
    }
}

// 项目相关 API
export const projectsApi = {
    list: (params?: { page?: number; size?: number; name?: string }) => api.get('/projects/', { params }),
    get: (id: string | number) => api.get(`/projects/${id}`),
    create: (data: { name: string; key: string; owner: string; description?: string }) =>
        api.post('/projects/', data),
    update: (id: string | number, data: unknown) => api.put(`/projects/${id}`, data),
    delete: (id: string | number) => api.delete(`/projects/${id}`),

    // 环境配置 API (projectId 支持 UUID 字符串)
    listEnvironments: (projectId: string | number) => api.get(`/projects/${projectId}/environments`),
    createEnvironment: (projectId: string | number, data: { name: string; domain?: string; variables?: Record<string, string>; headers?: Record<string, string> }) =>
        api.post(`/projects/${projectId}/environments`, data),
    getEnvironment: (projectId: string | number, envId: string | number) => api.get(`/projects/${projectId}/environments/${envId}`),
    updateEnvironment: (projectId: string | number, envId: string | number, data: { name?: string; domain?: string; variables?: Record<string, string>; headers?: Record<string, string> }) =>
        api.put(`/projects/${projectId}/environments/${envId}`, data),
    deleteEnvironment: (projectId: string | number, envId: string | number) => api.delete(`/projects/${projectId}/environments/${envId}`),
    copyEnvironment: (projectId: string | number, envId: string | number) => api.post(`/projects/${projectId}/environments/${envId}/copy`),
    cloneEnvironment: (projectId: string | number, envId: string | number) => api.post(`/projects/${projectId}/environments/${envId}/clone`),

    // 数据源 API (projectId 支持 UUID 字符串)
    listDataSources: (projectId: string | number) => api.get(`/projects/${projectId}/datasources`),
    createDataSource: (projectId: string | number, data: { name: string; db_type: string; host: string; port: number; db_name?: string; username?: string; password?: string; variable_name?: string }) =>
        api.post(`/projects/${projectId}/datasources`, data),
    updateDataSource: (projectId: string | number, dsId: string | number, data: { name?: string; db_type?: string; host?: string; port?: number; db_name?: string; username?: string; password?: string; variable_name?: string; is_enabled?: boolean }) =>
        api.put(`/projects/${projectId}/datasources/${dsId}`, data),
    deleteDataSource: (projectId: string | number, dsId: string | number) => api.delete(`/projects/${projectId}/datasources/${dsId}`),
    testDataSource: (data: { db_type: string; host: string; port: number; db_name?: string; username?: string; password?: string }) =>
        api.post('/projects/datasources/test', data),
}

// 接口相关 API
export const interfacesApi = {
    list: (params?: { page?: number; size?: number; folder_id?: number; project_id?: string | number }) => api.get('/interfaces/', { params }),
    get: (id: number | string) => api.get(`/interfaces/${id}`),
    create: (data: {
        project_id: number | string
        name: string
        url: string
        method: string
        status?: string
        description?: string
        folder_id?: number | string | null
        headers?: Record<string, string>
        params?: Record<string, unknown>
        cookies?: Record<string, string>
        body?: unknown
        body_type?: string
        auth_config?: Record<string, unknown>
    }) =>
        api.post('/interfaces/', data),
    update: (id: number | string, data: unknown) => api.put(`/interfaces/${id}`, data),
    delete: (id: number | string) => api.delete(`/interfaces/${id}`),
    sendRequest: (data: { url: string; method: string; headers?: Record<string, string>; params?: Record<string, unknown>; body?: unknown; files?: Record<string, string> }) =>
        api.post('/interfaces/debug/send', data),
    listFolders: (params?: { project_id?: string | number }) => api.get('/interfaces/folders', { params }),
    createFolder: (data: { project_id: number | string; name: string; parent_id?: number | string }) =>
        api.post('/interfaces/folders', data),
    updateFolder: (id: number | string, data: { name?: string; parent_id?: string | null; order?: number }) =>
        api.put(`/interfaces/folders/${id}`, data),
    deleteFolder: (id: number | string) => api.delete(`/interfaces/folders/${id}`),
    reorderFolders: (data: Array<{ id: string; sort_order: number }>) =>
        api.put('/interfaces/folders/reorder', data),
    reorderInterfaces: (data: Array<{ id: string; sort_order: number }>) =>
        api.put('/interfaces/reorder', data),
    moveInterface: (id: number | string, targetFolderId: string | null) =>
        api.put(`/interfaces/${id}/move`, { target_folder_id: targetFolderId }),
    copyInterface: (id: number | string, data?: { name?: string }) =>
        api.post(`/interfaces/${id}/copy`, data || {}),
    importSwagger: (formData: FormData) => api.post('/interfaces/import/swagger', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    importCurl: (data: { curl: string }) => api.post('/interfaces/import/curl', data),
}

// 场景相关 API
export const scenariosApi = {
    list: (params?: { project_id?: string; page?: number; size?: number; search?: string; priority?: string }) =>
        api.get('/scenarios/', { params }),
    get: (id: string | number) => api.get(`/scenarios/${id}`),
    create: (data: {
        project_id: string
        name: string
        description?: string
        priority?: string
        tags?: string[]
        created_by: string
        variables?: Record<string, unknown>
        pre_sql?: string
        post_sql?: string
    }) => api.post('/scenarios/', data),
    update: (id: string | number, data: {
        project_id?: string
        name?: string
        description?: string
        priority?: string
        tags?: string[]
        variables?: Record<string, unknown>
        pre_sql?: string
        post_sql?: string
    }) => api.put(`/scenarios/${id}`, data),
    delete: (id: string | number) => api.delete(`/scenarios/${id}`),

    // 步骤管理 (scenarioId/stepId 支持 UUID 字符串)
    createStep: (scenarioId: string | number, data: {
        description?: string
        keyword_type: string
        keyword_name: string
        parameters?: Record<string, unknown>
        sort_order?: number
    }) => api.post(`/scenarios/${scenarioId}/steps`, data),
    updateStep: (scenarioId: string | number, stepId: string | number, data: {
        description?: string
        keyword_type?: string
        keyword_name?: string
        parameters?: Record<string, unknown>
        sort_order?: number
    }) => api.put(`/scenarios/${scenarioId}/steps/${stepId}`, data),
    deleteStep: (scenarioId: string | number, stepId: string | number) =>
        api.delete(`/scenarios/${scenarioId}/steps/${stepId}`),
    batchUpdateSteps: (scenarioId: number, steps: Array<{ id: number; sort_order: number }>) =>
        api.put(`/scenarios/${scenarioId}/steps/batch`, { steps }),

    // 数据集管理 (scenarioId 支持 UUID 字符串)
    listDatasets: (scenarioId: string | number) =>
        api.get(`/scenarios/${scenarioId}/datasets`),
    createDataset: (scenarioId: number, data: { name: string; csv_data?: string }) =>
        api.post(`/scenarios/${scenarioId}/datasets`, data),
    getDataset: (scenarioId: number, datasetId: number) =>
        api.get(`/scenarios/${scenarioId}/datasets/${datasetId}`),
    updateDataset: (scenarioId: number, datasetId: number, data: { name?: string; csv_data?: string }) =>
        api.put(`/scenarios/${scenarioId}/datasets/${datasetId}`, data),
    deleteDataset: (scenarioId: number, datasetId: number) =>
        api.delete(`/scenarios/${scenarioId}/datasets/${datasetId}`),
    importDataset: (scenarioId: number, formData: FormData) =>
        api.post(`/scenarios/${scenarioId}/datasets/import`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
    exportDataset: (scenarioId: number, datasetId: number) =>
        api.get(`/scenarios/${scenarioId}/datasets/${datasetId}/export`, { responseType: 'blob' }),

    // 场景调试 (scenarioId 支持 UUID 字符串)
    debug: (scenarioId: string | number, data?: {
        environment_id?: string | number
        dataset_id?: string | number
    }) => api.post(`/scenarios/${scenarioId}/debug`, data ?? {}),
}

// Dashboard 统计 API
export const dashboardApi = {
    getStats: () => api.get('/dashboard/stats'),
    getTrend: () => api.get('/dashboard/trend'),
    getActivities: () => api.get('/dashboard/activities'),
}

// 测试报告 API
export const reportsApi = {
    list: (params?: { page?: number; size?: number; scenario_id?: number; search?: string }) =>
        api.get('/reports/', { params }),
    get: (id: number) => api.get(`/reports/${id}`),
    getDetails: (id: number) => api.get(`/reports/${id}/details`),
    getAllureUrl: (id: number) => api.get<{ allure_url?: string }>(`/reports/${id}/allure`),
    export: (id: number, format: 'pdf' | 'excel' = 'pdf') =>
        api.post(`/reports/${id}/export`, null, { params: { format } }),
    delete: (id: number) => api.delete(`/reports/${id}`),
}

// 测试计划 API
export const plansApi = {
    list: (params?: { project_id?: string; page?: number; size?: number; search?: string }) =>
        api.get('/plans/', { params }),
    get: (id: string | number) => api.get(`/plans/${id}`),
    create: (data: {
        project_id: string | number
        name: string
        description?: string
        cron_expression?: string
        status?: string
    }) => api.post('/plans/', data),
    update: (id: string | number, data: {
        name?: string
        description?: string
        cron_expression?: string
        is_active?: boolean
    }) => api.put(`/plans/${id}`, data),
    delete: (id: string | number) => api.delete(`/plans/${id}`),

    // 场景编排
    addScenario: (planId: string | number, data: {
        scenario_id: string | number
        dataset_id?: string | number
        environment_id?: string | number
        variables?: Record<string, unknown>
        sort_order?: number
        execution_order?: number
    }) => api.post(`/plans/${planId}/scenarios`, data),
    listScenarios: (planId: string | number) =>
        api.get(`/plans/${planId}/scenarios`),
    updateScenario: (planId: string | number, planScenarioId: string | number, data: {
        scenario_id?: string | number
        dataset_id?: string | number
        environment_id?: string | number
        variables?: Record<string, unknown>
        sort_order?: number
    }) => api.put(`/plans/${planId}/scenarios/${planScenarioId}`, data),
    removeScenario: (planId: string | number, planScenarioId: string | number) =>
        api.delete(`/plans/${planId}/scenarios/${planScenarioId}`),
    reorderScenarios: (planId: string | number, items: Array<{ scenario_id: string; execution_order: number }>) =>
        api.put(`/plans/${planId}/scenarios/reorder`, items),

    // 执行控制
    execute: (id: string | number) => api.post(`/plans/${id}/execute`),
    terminate: (id: number) => api.post(`/plans/${id}/terminate`),
    pause: (id: number) => api.post(`/plans/${id}/pause`),
    resume: (id: number) => api.post(`/plans/${id}/resume`),

    // 执行记录
    listExecutions: (planId: number) => api.get(`/plans/${planId}/executions`),
    getExecution: (_planId: number, executionId: string) =>
        api.get(`/plans/executions/${executionId}`),
}

// 关键字 API
export const keywordsApi = {
    list: (params?: { page?: number; size?: number; project_id?: string; type?: string; is_builtin?: boolean; is_enabled?: boolean; search?: string }) =>
        api.get('/keywords/', { params }),
    create: (data: {
        id: string
        project_id: string | null
        name: string
        class_name: string
        method_name: string
        description?: string
        code: string
        parameters?: string | null
        return_type?: string | null
        is_built_in: boolean
        is_enabled: boolean
    }) => api.post('/keywords/', data),
    get: (id: string) => api.get(`/keywords/${id}`),
    update: (id: string, data: {
        name?: string
        class_name?: string
        method_name?: string
        description?: string
        code?: string
        parameters?: string | null
        return_type?: string | null
    }) => api.put(`/keywords/${id}`, data),
    delete: (id: string) => api.delete(`/keywords/${id}`),
    toggle: (id: string) => api.patch(`/keywords/${id}/toggle`),
    generateFile: (id: string) => api.post(`/keywords/${id}/generate-file`),
}

// API 测试用例 API
export const apiTestCasesApi = {
    // 测试用例 CRUD
    list: (projectId: number, params?: { page?: number; size?: number; search?: string; tags?: string; enabled_only?: boolean }) =>
        api.get(`/projects/${projectId}/api-test-cases`, { params }),
    create: (projectId: number, data: unknown) => api.post(`/projects/${projectId}/api-test-cases`, data),
    get: (id: number) => api.get(`/api-test-cases/${id}`),
    update: (id: number, data: unknown) => api.put(`/api-test-cases/${id}`, data),
    delete: (id: number) => api.delete(`/api-test-cases/${id}`),

    // 测试执行
    execute: (id: number, data?: { environment_id?: number; verbose?: boolean }) =>
        api.post(`/api-test-cases/${id}/execute`, data || {}),

    // 执行历史
    listExecutions: (id: number, limit?: number) =>
        api.get(`/api-test-cases/${id}/executions`, { params: { limit } }),

    getExecution: (executionId: number) =>
        api.get(`/api-test-executions/${executionId}`),

    getExecutionSteps: (executionId: number) =>
        api.get(`/api-test-executions/${executionId}/steps`),

    // 其他功能
    validateYaml: (yamlContent: string) =>
        api.post('/api-test-cases/validate', { yaml_content: yamlContent }),

    importFromYaml: (projectId: number, yamlContent: string, override?: boolean) =>
        api.post(`/projects/${projectId}/api-test-cases/import-yaml`, { yaml_content: yamlContent, override }),
}

// 功能测试模块 API

// AI 配置管理 API
export const aiConfigApi = {
    list: () => api.get('/ai/configs/'),
    getDefault: () => api.get('/ai/configs/default'),
    get: (id: number) => api.get(`/ai/configs/${id}`),
    create: (data: { provider_name: string; provider_type: string; api_key: string; api_endpoint?: string; model_name: string; temperature?: number; is_default?: boolean }) =>
        api.post('/ai/configs/', data),
    update: (id: number, data: { provider_name?: string; api_key?: string; api_endpoint?: string; model_name?: string; temperature?: number; is_enabled?: boolean; is_default?: boolean }) =>
        api.put(`/ai/configs/${id}`, data),
    delete: (id: number) => api.delete(`/ai/configs/${id}`),
    getPresets: () => api.get('/ai/configs/presets'),
}

// 需求澄清 API
export const aiClarificationApi = {
    startClarification: (data: { requirement_id: string; initial_input: string }) =>
        api.post('/ai/clarify', data, {
            responseType: 'text' // SSE 流式响应
        }),
    sendMessage: (data: { requirement_id: string; user_input: string }) =>
        api.post('/ai/clarify', data, {
            responseType: 'text' // SSE 流式响应
        }),
    getConversation: (requirementId: string) =>
        api.get(`/ai/clarify/${requirementId}`),
    completeClarification: (requirementId: string) =>
        api.post(`/ai/clarify/${requirementId}/complete`),
}

// 测试点生成和管理 API
export const testPointsApi = {
    generate: (data: { requirement_id: number; categories?: string[]; use_knowledge?: boolean; min_coverage?: string }) =>
        api.post('/test-points/generate', data),
    listByRequirement: (requirementId: number) =>
        api.get(`/test-points/requirement/${requirementId}`),
    get: (id: number) => api.get(`/test-points/${id}`),
    delete: (id: number) => api.delete(`/test-points/${id}`),
}

// 测试用例生成和管理 API（功能测试）
export const functionalTestCasesApi = {
    generate: (data: { requirement_id: number; test_point_ids: number[]; module_name: string; page_name: string; case_type: string; include_knowledge?: boolean }) =>
        api.post('/test-cases/generate/generate', data),
    listByRequirement: (requirementId: number) =>
        api.get(`/test-cases/generate/requirement/${requirementId}`),
    get: (caseId: string) => api.get(`/test-cases/generate/${caseId}`),
    delete: (caseId: string) => api.delete(`/test-cases/generate/${caseId}`),
    approve: (caseId: string) => api.put(`/test-cases/generate/${caseId}/approve`),
}

// 需求管理 API
export const requirementsApi = {
    list: (params?: { page?: number; size?: number; status?: string }) =>
        api.get('/functional/requirements', { params }),
    get: (id: number) => api.get(`/functional/requirements/${id}`),
    create: (data: { title: string; description: string; priority?: string; module_name?: string }) =>
        api.post('/functional/requirements', data),
    update: (id: number, data: { title?: string; description?: string; priority?: string; status?: string }) =>
        api.put(`/functional/requirements/${id}`, data),
    delete: (id: number) => api.delete(`/functional/requirements/${id}`),
}

// 全局参数管理 API
export const globalParamsApi = {
    list: () => api.get('/global-params/'),
    get: (id: string) => api.get(`/global-params/${id}`),
    create: (data: { code: string }) => api.post('/global-params/', data),
    update: (id: string, data: { code?: string; description?: string }) =>
        api.put(`/global-params/${id}`, data),
    delete: (id: string) => api.delete(`/global-params/${id}`),
}

export default api
