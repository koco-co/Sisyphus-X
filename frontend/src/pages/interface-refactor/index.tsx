import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import { RequestEditor, RequestData } from './components/RequestEditor/RequestEditor'
import { ResponseViewer, ResponseData } from './components/ResponseViewer/ResponseViewer'
import { EnvironmentDialog } from './dialogs/EnvironmentDialog'
import { CurlImportDialog, CurlImportData } from './dialogs/CurlImportDialog'
import type { KeyValuePair } from './components/RequestEditor/KeyValueEditor'
import type { AuthConfig, BodyType } from './components/RequestEditor/AuthTab'
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
  const queryClient = useQueryClient()

  const interfaceId = id ? parseInt(id) : null
  const currentProjectId = projectId ? parseInt(projectId) : 1
  const isNew = id === 'new' || !id

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
    auth: { type: 'none' },
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
        auth: { type: 'none' }, // TODO: 从接口数据加载认证配置
        body: typeof interfaceData.body === 'string'
          ? interfaceData.body
          : JSON.stringify(interfaceData.body || {}, null, 2),
        bodyType: interfaceData.body_type || 'none',
        formDataPairs: [], // TODO: 加载 form-data
      })
    }
  }, [interfaceData])

  // cURL 导入
  useEffect(() => {
    if (isNew && showCurlDialog) {
      // 如果是新建模式且 URL 包含 curl 参数，自动打开导入弹窗
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('mode') === 'curl') {
        setShowCurlDialog(true)
      }
    }
  }, [isNew, showCurlDialog])

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
        navigate(`/api/interfaces/${res.data.id}`, { replace: true })
      }
    }
  })

  // 发送请求
  const handleSend = async () => {
    setIsSending(true)
    setResponse(null)

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

      setResponse({
        status_code: res.data.status_code || 200,
        headers: res.data.headers || {},
        body: res.data.body,
        elapsed: res.data.elapsed || 0,
        size: res.data.size || 0,
        timeline: res.data.timeline,
      })
    } catch (err: any) {
      setResponse({
        status_code: err.response?.status || 0,
        headers: err.response?.headers || {},
        body: { error: err.message || '请求失败' },
        elapsed: 0,
        size: 0,
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
      auth: data.auth || { type: 'none' },
      body: typeof data.body === 'string' ? data.body : JSON.stringify(data.body || {}, null, 2),
      bodyType: data.body_type,
      formDataPairs: data.body_type === 'form-data'
        ? objectToKeyValueArray(data.body || {})
        : [],
    })
  }

  // 选择接口
  const handleSelectInterface = (id: number) => {
    navigate(`/api/interfaces/${id}?projectId=${currentProjectId}`)
  }

  // 加载中
  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  // 欢迎页面（未选择接口时）
  if (!interfaceId && isNew) {
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
            onClick={() => navigate(`/api/interfaces?projectId=${currentProjectId}`)}
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
