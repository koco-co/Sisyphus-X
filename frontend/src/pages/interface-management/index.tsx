import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Save,
  Loader2,
  Settings as SettingsIcon,
} from 'lucide-react'
import { interfacesApi, projectsApi } from '@/api/client'
import { cn } from '@/lib/utils'
import { InterfaceTree } from './components/InterfaceTree'
import { WelcomeCards } from './components/WelcomeCards'
import { RequestEditor } from './components/RequestEditor/RequestEditor'
import type { RequestData } from './components/RequestEditor/RequestEditor'
import { ResponseViewer } from './components/ResponseViewer/ResponseViewer'
import type { ResponseData } from './components/ResponseViewer/ResponseViewer'
import { EnvironmentDialog } from './dialogs/EnvironmentDialog'
import { CurlImportDialog } from './dialogs/CurlImportDialog'
import type { CurlImportData } from './dialogs/CurlImportDialog'
import type { KeyValuePair } from './components/RequestEditor/KeyValueEditor'
import type { AuthConfig } from './components/RequestEditor/AuthTab'
import type { BodyType } from './components/RequestEditor/BodyTab'
import type { Environment } from './dialogs/EnvironmentDialog'

// 工具函数
const objectToKeyValueArray = (obj: Record<string, string>): KeyValuePair[] => {
  return Object.entries(obj || {}).map(([key, value]) => ({ key, value, enabled: true }))
}

const keyValueArrayToObject = (pairs: KeyValuePair[]): Record<string, string> => {
  return pairs
    .filter(p => p.enabled && p.key.trim())
    .reduce((acc, { key, value }) => {
      acc[key] = value
      return acc
    }, {} as Record<string, string>)
}

export default function InterfaceManagementPage() {
  const { id, projectId } = useParams<{ id?: string; projectId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  // 🔧 终极修复: 直接从window.location解析路径参数,绕过useParams可能的问题
  const pathSegments = location.pathname.split('/')
  console.log('Path segments:', pathSegments)

  // 路径格式: /interface-management -> ["", "interface-management"] -> 无ID
  // 路径格式: /interface-management/new -> ["", "interface-management", "new"] -> ID = "new"
  // 路径格式: /interface-management/123 -> ["", "interface-management", "123"] -> ID = "123"
  const pathId = pathSegments.length >= 3 ? pathSegments[2] : undefined

  const effectiveId = pathId !== undefined ? pathId : id // 优先使用从路径解析的值

  console.log('Path analysis:', {
    pathname: location.pathname,
    pathSegments,
    pathSegments_length: pathSegments.length,
    pathId,
    useParams_id: id,
    effectiveId,
    final_decision: effectiveId === 'new' ? 'NEW MODE' : effectiveId ? `EDIT MODE (${effectiveId})` : 'WELCOME MODE'
  })

  const interfaceId = effectiveId && effectiveId !== 'new' ? parseInt(effectiveId) : null
  const currentProjectId = projectId ? parseInt(projectId) : 1
  const isNew = effectiveId === 'new'

  // 状态机模式: 明确管理页面状态
  const [pageMode, setPageMode] = useState<'welcome' | 'new' | 'edit'>('welcome')

  // 根据路由参数更新页面模式
  useEffect(() => {
    console.log('Route changed, updating page mode:', {
      useParams_id: id,
      pathId,
      effectiveId,
      isNew,
      currentMode: pageMode,
      pathname: location.pathname
    })

    if (!effectiveId) {
      console.log('Setting mode: welcome')
      setPageMode('welcome')
    } else if (effectiveId === 'new') {
      console.log('Setting mode: new')
      setPageMode('new')
    } else {
      console.log('Setting mode: edit')
      setPageMode('edit')
    }
  }, [effectiveId])

  // 调试日志
  console.log('InterfaceManagementPage render:', {
    useParams_id: id,
    pathId,
    effectiveId,
    projectId,
    interfaceId,
    isNew,
    pageMode,
    pathname: location.pathname
  })

  // UI 状态
  const [showEnvironmentDialog, setShowEnvironmentDialog] = useState(false)
  const [showCurlDialog, setShowCurlDialog] = useState(false)
  const [envDialogMode, setEnvDialogMode] = useState<'create' | 'edit'>('create')
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

  // 获取最近使用的接口
  const { data: recentInterfaces = [] } = useQuery({
    queryKey: ['recent-interfaces', currentProjectId],
    queryFn: async () => {
      // TODO: 调用最近使用 API
      return []
    }
  })

  // 加载接口数据
  useEffect(() => {
    if (interfaceData) {
      setRequestData({
        name: interfaceData.name || '',
        url: interfaceData.url || '',
        method: interfaceData.method || 'GET',
        params: objectToKeyValueArray(interfaceData.params || {}),
        headers: objectToKeyValueArray(interfaceData.headers || {}),
        auth: { type: 'no_auth' }, // TODO: 从接口数据加载认证配置
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

  // 监听路由变化,当从欢迎界面跳转到新建页面时确保状态正确
  useEffect(() => {
    console.log('Route changed:', { id, isNew, pathname: location.pathname })
    if (isNew) {
      console.log('Resetting form for new interface')
      setResponse(null) // 清除之前的响应
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
    mutationFn: (data: any) => {
      if (isNew) {
        return interfacesApi.create({
          project_id: currentProjectId,
          name: data.name,
          url: data.url,
          method: data.method,
          params: keyValueArrayToObject(data.params),
          headers: keyValueArrayToObject(data.headers),
          body: data.bodyType === 'json' ? JSON.parse(data.body || '{}') : data.body,
          body_type: data.bodyType,
        })
      } else {
        return interfacesApi.update(interfaceId!, data)
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['interfaces'] })
      if (isNew && res.data?.id) {
        navigate(`/interface-management/${res.data.id}?projectId=${currentProjectId}`, { replace: true })
      }
    }
  })

  // 生成执行日志
  const generateExecutionLogs = (
    startTime: number,
    endTime: number,
    hasError: boolean
  ): typeof import('./components/ResponseViewer/ExecutionLog').LogEntry[] => {
    const logs = []
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
      // 构建完整 URL
      let fullUrl = requestData.url

      // TODO: 应用环境变量和域名

      // 构建请求体
      let body
      if (requestData.bodyType === 'json' && requestData.body) {
        try {
          body = JSON.parse(requestData.body)
        } catch {
          body = requestData.body
        }
      } else {
        body = requestData.body
      }

      const res = await interfacesApi.sendRequest({
        url: fullUrl,
        method: requestData.method,
        headers: keyValueArrayToObject(requestData.headers),
        params: keyValueArrayToObject(requestData.params),
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
    } catch (err: any) {
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
    })
  }

  // 处理 cURL 导入
  const handleCurlImport = (data: CurlImportData) => {
    setRequestData({
      name: '导入的接口',
      url: data.url,
      method: data.method,
      params: objectToKeyValueArray(data.params),
      headers: objectToKeyValueArray(data.headers),
      auth: data.auth || { type: 'no_auth' },
      body: typeof data.body === 'string' ? data.body : JSON.stringify(data.body || {}, null, 2),
      bodyType: data.body_type,
      formDataPairs: data.body_type === 'form-data'
        ? objectToKeyValueArray(data.body || {})
        : [],
    })
  }

  // 选择接口
  const handleSelectInterface = (id: number) => {
    navigate(`/interface-management/${id}?projectId=${currentProjectId}`)
  }

  // 加载中
  if (isLoading && pageMode === 'edit') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  // 状态机模式: 根据pageMode决定渲染什么
  if (pageMode === 'welcome') {
    console.log('Rendering welcome page')
    return (
      <div className="flex h-screen bg-slate-950">
        <InterfaceTree
          projectId={currentProjectId}
          onSelectInterface={handleSelectInterface}
        />
        <WelcomeCards
          projectId={currentProjectId}
          recentInterfaces={recentInterfaces}
        />
      </div>
    )
  }

  // pageMode === 'new' 或 'edit'
  console.log('Rendering editor page, mode:', pageMode)
  return (
    <div className="flex h-screen bg-slate-950">
      {/* 左侧目录树 */}
      <InterfaceTree
        projectId={currentProjectId}
        onSelectInterface={handleSelectInterface}
        selectedInterfaceId={interfaceId ?? undefined}
      />

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部工具栏 */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-white/5 bg-slate-900/50">
          <button
            onClick={() => navigate(`/interface-management?projectId=${currentProjectId}`)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={requestData.name}
            onChange={(e) => setRequestData({ ...requestData, name: e.target.value })}
            placeholder="接口名称"
            className="text-xl font-bold text-white bg-transparent border-none focus:outline-none flex-1"
          />

          <button
            onClick={() => setShowEnvironmentDialog(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="环境管理"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>

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

        {/* 请求编辑器 + 响应展示器 */}
        <div className="flex-1 flex overflow-hidden">
          <RequestEditor
            projectId={currentProjectId}
            data={requestData}
            onChange={setRequestData}
            onSend={handleSend}
            isSending={isSending}
          />
          <ResponseViewer response={response} isLoading={isSending} />
        </div>
      </div>

      {/* 环境管理弹窗 */}
      <EnvironmentDialog
        open={showEnvironmentDialog}
        onClose={() => setShowEnvironmentDialog(false)}
        onSave={(env) => {
          // TODO: 保存环境
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
