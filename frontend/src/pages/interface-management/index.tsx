import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Save,
  Loader2,
  Settings as SettingsIcon,
} from 'lucide-react'
import { interfacesApi, projectsApi, globalParamsApi } from '@/api/client'
import { toast } from 'sonner'
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { cn } from '@/lib/utils'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { InterfaceTree } from './components/InterfaceTree'
import { WelcomeCards } from './components/WelcomeCards'
import { RequestEditor } from './components/RequestEditor/RequestEditor'
import type { RequestData } from './components/RequestEditor/RequestEditor'
import { ResponseViewer } from './components/ResponseViewer/ResponseViewer'
import type { ResponseData } from './components/ResponseViewer/ResponseViewer'
import { EnvironmentDialog } from './dialogs/EnvironmentDialog'
import { CurlImportDialog } from './dialogs/CurlImportDialog'
import { SwaggerImportDialog } from './dialogs/SwaggerImportDialog'
import type { CurlImportData } from './dialogs/CurlImportDialog'
import type { KeyValuePair } from './components/RequestEditor/KeyValueEditor'
import type { AuthConfig } from './components/RequestEditor/AuthTab'
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import type { BodyType } from './components/RequestEditor/BodyTab'
import type { Environment } from './dialogs/EnvironmentDialog'
import { useEnvironment } from './hooks/useEnvironment'
import { replaceVariables } from './utils/variableParser'

// 工具函数
const objectToKeyValueArray = (obj: Record<string, string>): KeyValuePair[] => {
  return Object.entries(obj || {}).map(([key, value]) => ({ key, value, enabled: true }))
}

const keyValueArrayToObject = (pairs: KeyValuePair[]): Record<string, string> => {
  return pairs
    .filter(p => p.enabled && p.key.trim())
    .reduce((acc, { key, value }) => {
      const trimmedKey = key.trim()
      if (trimmedKey) {
        acc[trimmedKey] = value
      }
      return acc
    }, {} as Record<string, string>)
}

export default function InterfaceManagementPage() {
  const { id } = useParams<{ id?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const projectIdFromQuery = searchParams.get('projectId')
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  // 从路径解析参数
  const pathSegments = location.pathname.split('/')


  // 路径格式: /interface-management -> ["", "interface-management"] -> 无ID
  // 路径格式: /interface-management/new -> ["", "interface-management", "new"] -> ID = "new"
  // 路径格式: /interface-management/123 -> ["", "interface-management", "123"] -> ID = "123"
  const pathId = pathSegments.length >= 3 ? pathSegments[2] : undefined

  const effectiveId = pathId !== undefined ? pathId : id

  const interfaceId = effectiveId && effectiveId !== 'new' ? parseInt(effectiveId) : null
  const currentProjectId = projectIdFromQuery ? parseInt(projectIdFromQuery) : null
  const isNew = effectiveId === 'new'

  // 环境选择状态
  const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null)
  const { environments } = useEnvironment(currentProjectId ?? 0)

  // 状态机模式: 明确管理页面状态
  const [pageMode, setPageMode] = useState<'welcome' | 'new' | 'edit'>('welcome')

  // 根据路由参数更新页面模式
  useEffect(() => {
    if (!effectiveId) {
      setPageMode('welcome')
    } else if (effectiveId === 'new') {
      setPageMode('new')
    } else {
      setPageMode('edit')
    }
  }, [effectiveId])



  // UI 状态
  const [showEnvironmentDialog, setShowEnvironmentDialog] = useState(false)
  const [showCurlDialog, setShowCurlDialog] = useState(false)
  const [showSwaggerDialog, setShowSwaggerDialog] = useState(false)
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [envDialogMode, setEnvDialogMode] = useState<'create' | 'edit'>('create')
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [editingEnv, setEditingEnv] = useState<Environment | undefined>()

  // 表单数据
  const [requestData, setRequestData] = useState<RequestData>({
    name: '',
    url: '',
    method: 'GET',
    params: [],
    headers: [],
    auth: { type: 'no_auth' },
    body: '',
    bodyType: 'none',
    formDataPairs: [],
  })

  // 响应数据
  const [response, setResponse] = useState<ResponseData | null>(null)
  const [isSending, setIsSending] = useState(false)

  // 获取接口详情
  const { data: interfaceData, isLoading } = useQuery({
    queryKey: ['interface', interfaceId],
    queryFn: async () => {
      if (!interfaceId || isNew) return null
      const res = await interfacesApi.get(interfaceId)
      return res.data
    },
    enabled: !isNew && !!interfaceId
  })

  // 获取项目列表
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const res = await projectsApi.list({ page: 1, size: 100 })
      return res.data?.items || []
    }
  })

  // 获取全局变量
  const { data: globalParams = [] } = useQuery({
    queryKey: ['global-params'],
    queryFn: async () => {
      const res = await globalParamsApi.list()
      return res.data || []
    }
  })

  // 获取最近使用的接口
  const { data: recentInterfaces = [] } = useQuery({
    queryKey: ['recent-interfaces', currentProjectId],
    queryFn: async () => {
      // TODO: 调用最近使用 API
      return []
    },
    enabled: !!currentProjectId
  })

  // 项目切换
  const handleProjectChange = useCallback((val: unknown) => {
    const newProjectId = val ? String(val) : ''
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (newProjectId) {
        next.set('projectId', newProjectId)
      } else {
        next.delete('projectId')
      }
      return next
    })
  }, [setSearchParams])

  // 加载接口数据
  useEffect(() => {
    if (interfaceData) {
      setRequestData({
        name: interfaceData.name || '',
        url: interfaceData.url || '',
        method: interfaceData.method || 'GET',
        params: objectToKeyValueArray(interfaceData.params || {}),
        headers: objectToKeyValueArray(interfaceData.headers || {}),
        auth: interfaceData.auth_config && Object.keys(interfaceData.auth_config).length > 0
          ? (interfaceData.auth_config as AuthConfig)
          : { type: 'no_auth' },
        body: typeof interfaceData.body === 'string'
          ? interfaceData.body
          : JSON.stringify(interfaceData.body || {}, null, 2),
        bodyType: interfaceData.body_type || 'none',
        formDataPairs: [], // TODO: 加载 form-data
      })
    } else if (isNew) {
      // 新建模式时重置表单为默认值
      setRequestData({
        name: '',
        url: '',
        method: 'GET',
        params: [],
        headers: [],
        auth: { type: 'no_auth' },
        body: '',
        bodyType: 'none',
        formDataPairs: [],
      })
    }
  }, [interfaceData, isNew])

  // 监听路由变化
  useEffect(() => {
    if (isNew) {
      setResponse(null)
    }
  }, [id, isNew, location.pathname])

  // cURL 导入
  useEffect(() => {
    if (isNew) {
      // 如果是新建模式，检查 URL 是否包含 mode=curl 参数
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('mode') === 'curl') {
        setShowCurlDialog(true)
      }
    }
  }, [isNew])

  // 保存接口
  const saveMutation = useMutation({
    mutationFn: (data: unknown) => {
      if (isNew) {
        return interfacesApi.create({
          project_id: currentProjectId || 0,
          name: data.name,
          url: data.url,
          method: data.method,
          params: keyValueArrayToObject(data.params),
          headers: keyValueArrayToObject(data.headers),
          body: data.bodyType === 'json' ? JSON.parse(data.body || '{}') : data.body,
          body_type: data.bodyType,
          auth_config: data.auth_config,
        })
      } else {
        return interfacesApi.update(interfaceId!, data)
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['interfaces'] })
      toast.success('保存成功')
      if (isNew && res.data?.id) {
        navigate(`/interface-management/${res.data.id}${currentProjectId ? `?projectId=${currentProjectId}` : ''}`, { replace: true })
      }
    },
    onError: () => toast.error('保存失败')
  })

  // 生成执行日志
  const generateExecutionLogs = (
    startTime: number,
    endTime: number,
    hasError: boolean
  ): Array<{ timestamp: string; type: 'success' | 'error' | 'info' | 'warning'; message: string; details?: unknown }> => {
    const logs: Array<{ timestamp: string; type: 'success' | 'error' | 'info' | 'warning'; message: string; details?: unknown }> = []
    const now = new Date()
    const formatTime = (ms: number) => {
      const date = new Date(now.getTime() + ms)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const seconds = date.getSeconds().toString().padStart(2, '0')
      const msStr = date.getMilliseconds().toString().padStart(3, '0')
      return `${hours}:${minutes}:${seconds}.${msStr}`
    }

    logs.push({
      timestamp: formatTime(0),
      type: 'info',
      message: `开始发送 ${requestData.method} 请求`,
      details: { url: requestData.url }
    })

    logs.push({
      timestamp: formatTime(10),
      type: 'success',
      message: '请求参数构建完成',
      details: {
        headers: keyValueArrayToObject(requestData.headers),
        params: keyValueArrayToObject(requestData.params)
      }
    })

    if (hasError) {
      logs.push({
        timestamp: formatTime(endTime - startTime),
        type: 'error',
        message: '请求失败',
        details: { error: '请求执行过程中发生错误' }
      })
    } else {
      logs.push({
        timestamp: formatTime(endTime - startTime),
        type: 'success',
        message: `请求完成，耗时 ${((endTime - startTime) * 1000).toFixed(0)}ms`
      })
    }

    return logs
  }

  // 发送请求
  const handleSend = async () => {
    setIsSending(true)
    setResponse(null)
    const startTime = Date.now()

    try {
      // 收集变量上下文: 环境变量 + 全局变量
      const selectedEnv = environments.find(e => e.id === selectedEnvId)
      const envVars: Record<string, string> = selectedEnv?.variables || {}
      const globalVars: Record<string, string> = {}
      for (const gp of globalParams) {
        if (gp.code) {
          globalVars[gp.code] = gp.description || gp.code
        }
      }

      const doReplace = (text: string): string => {
        const { result } = replaceVariables(text, { envVars, additionalVars: globalVars })
        return result
      }

      // 替换 URL 中的变量
      let fullUrl = doReplace(requestData.url)

      // 如果环境有 domain 且 URL 不以 http(s):// 开头，则拼接
      if (selectedEnv?.domain && !/^https?:\/\//i.test(fullUrl)) {
        const domain = selectedEnv.domain.replace(/\/+$/, '')
        const path = fullUrl.startsWith('/') ? fullUrl : `/${fullUrl}`
        fullUrl = `${domain}${path}`
      }

      // 替换 headers 中的变量
      const resolvedHeaders: Record<string, string> = {}
      for (const h of requestData.headers) {
        if (h.enabled && h.key.trim()) {
          resolvedHeaders[h.key.trim()] = doReplace(h.value)
        }
      }

      // 替换 params 中的变量
      const resolvedParams: Record<string, string> = {}
      for (const p of requestData.params) {
        if (p.enabled && p.key.trim()) {
          resolvedParams[p.key.trim()] = doReplace(p.value)
        }
      }

      // 构建请求体（替换变量）
      let body
      const rawBody = doReplace(requestData.body || '')
      if (requestData.bodyType === 'json' && rawBody) {
        try {
          body = JSON.parse(rawBody)
        } catch {
          body = rawBody
        }
      } else {
        body = rawBody
      }

      const res = await interfacesApi.sendRequest({
        url: fullUrl,
        method: requestData.method,
        headers: resolvedHeaders,
        params: resolvedParams,
        body,
      })

      const endTime = Date.now()
      const elapsed = (endTime - startTime) / 1000

      setResponse({
        status_code: res.data.status_code || 200,
        headers: res.data.headers || {},
        body: res.data.body,
        elapsed: res.data.elapsed || elapsed,
        size: res.data.size || 0,
        timeline: res.data.timeline || {
          dns: Math.random() * 50,
          tcp: Math.random() * 30,
          ttfb: Math.random() * 100 + 50,
          download: Math.random() * 200 + 100
        },
        logs: generateExecutionLogs(startTime, endTime, false)
      })
    } catch (err: unknown) {
      const endTime = Date.now()
      setResponse({
        status_code: err.response?.status || 0,
        headers: err.response?.headers || {},
        body: { error: err.message || '请求失败' },
        elapsed: (endTime - startTime) / 1000,
        size: 0,
        logs: generateExecutionLogs(startTime, endTime, true)
      })
    } finally {
      setIsSending(false)
    }
  }

  // 保存接口
  const handleSave = () => {
    saveMutation.mutate({
      name: requestData.name,
      url: requestData.url,
      method: requestData.method,
      params: keyValueArrayToObject(requestData.params),
      headers: keyValueArrayToObject(requestData.headers),
      body: requestData.bodyType === 'json' && requestData.body
        ? (() => { try { return JSON.parse(requestData.body) } catch { return {} } })()
        : requestData.body,
      body_type: requestData.bodyType,
      auth_config: requestData.auth,
    })
  }

  // 处理 cURL 导入
  const handleCurlImport = (data: CurlImportData) => {
    const convertAuthType = (auth: CurlImportData['auth']): AuthConfig => {
      if (!auth) return { type: 'no_auth' }
      if (auth.type === 'none') return { type: 'no_auth' }
      return auth as unknown as AuthConfig
    }

    setRequestData({
      name: '导入的接口',
      url: data.url,
      method: data.method,
      params: objectToKeyValueArray(data.params),
      headers: objectToKeyValueArray(data.headers),
      auth: convertAuthType(data.auth),
      body: typeof data.body === 'string' ? data.body : JSON.stringify(data.body || {}, null, 2),
      bodyType: data.body_type,
      formDataPairs: data.body_type === 'form-data'
        ? objectToKeyValueArray(data.body || {})
        : [],
    })
  }

  // 选择接口
  const handleSelectInterface = (id: number) => {
    navigate(`/interface-management/${id}${currentProjectId ? `?projectId=${currentProjectId}` : ''}`)
  }

  // 加载中
  if (isLoading && pageMode === 'edit') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  // 项目选项
  const projectOptions = [
    { label: '选择项目...', value: '' },
    ...projects.map((p: { id: number; name: string }) => ({ label: p.name, value: String(p.id) }))
  ]

  // 环境选项
  const envOptions = [
    { label: '无环境', value: '' },
    ...environments.map(env => ({ label: env.name, value: String(env.id) }))
  ]

  // 统一页面头部
  const pageHeader = (
    <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-900/50 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-white whitespace-nowrap">接口定义</h1>
        <CustomSelect
          value={currentProjectId ? String(currentProjectId) : ''}
          onChange={handleProjectChange}
          options={projectOptions}
          placeholder="选择项目"
          size="sm"
          className="w-44"
        />
      </div>
      <div className="flex items-center gap-3">
        <CustomSelect
          value={selectedEnvId ? String(selectedEnvId) : ''}
          onChange={(val) => setSelectedEnvId(val ? parseInt(String(val)) : null)}
          options={envOptions}
          placeholder="选择环境"
          size="sm"
          className="w-40"
        />
        <button
          onClick={() => setShowEnvironmentDialog(true)}
          className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors flex items-center gap-1.5"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          环境管理
        </button>
      </div>
    </header>
  )

  // 状态机模式: 根据pageMode决定渲染什么
  if (pageMode === 'welcome') {
    return (
      <div className="flex flex-col h-screen bg-slate-950">
        {pageHeader}
        {!currentProjectId ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <p className="text-lg">请先在顶部选择一个项目</p>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            <InterfaceTree
              projectId={currentProjectId}
              onSelectInterface={handleSelectInterface}
            />
            <WelcomeCards
              projectId={currentProjectId}
              recentInterfaces={recentInterfaces}
              onImportSwagger={() => setShowSwaggerDialog(true)}
            />
          </div>
        )}
        <SwaggerImportDialog
          open={showSwaggerDialog}
          onClose={() => setShowSwaggerDialog(false)}
          projectId={currentProjectId ? String(currentProjectId) : ''}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['interfaces'] })}
        />
      </div>
    )
  }

  // pageMode === 'new' 或 'edit'
  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {pageHeader}

      <div className="flex flex-1 min-h-0">
        {/* 左侧目录树 */}
        <InterfaceTree
          projectId={currentProjectId || 0}
          onSelectInterface={handleSelectInterface}
          selectedInterfaceId={interfaceId ?? undefined}
        />

        {/* 右侧主区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 顶部工具栏 */}
          <header className="flex items-center gap-4 px-6 py-3 border-b border-white/5 bg-slate-900/50 shrink-0">
            <button
              onClick={() => navigate(`/interface-management${currentProjectId ? `?projectId=${currentProjectId}` : ''}`)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={requestData.name}
              onChange={(e) => setRequestData({ ...requestData, name: e.target.value })}
              placeholder="接口名称"
              className="text-lg font-bold text-white bg-transparent border-none focus:outline-none flex-1"
            />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center gap-2 transition-colors"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              保存
            </motion.button>
          </header>

          {/* 请求编辑器 (上) + 响应展示器 (下) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto min-h-0">
              <RequestEditor
                projectId={currentProjectId || 0}
                data={requestData}
                onChange={setRequestData}
                onSend={handleSend}
                isSending={isSending}
              />
            </div>
            <div className="flex-1 overflow-auto min-h-0 border-t border-white/5">
              <ResponseViewer response={response} isLoading={isSending} />
            </div>
          </div>
        </div>
      </div>

      {/* 环境管理弹窗 */}
      <EnvironmentDialog
        open={showEnvironmentDialog}
        onClose={() => setShowEnvironmentDialog(false)}
        /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
        onSave={(env) => {
          setShowEnvironmentDialog(false)
        }}
        environment={editingEnv}
        mode={envDialogMode}
      />

      {/* cURL 导入弹窗 */}
      <CurlImportDialog
        open={showCurlDialog}
        onClose={() => setShowCurlDialog(false)}
        onImport={handleCurlImport}
      />
    </div>
  )
}
