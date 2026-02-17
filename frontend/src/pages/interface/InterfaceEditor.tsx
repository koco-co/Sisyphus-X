import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft,
    Send,
    Save,
    Plus,
    Trash2,
    Loader2,
    FileText,
    X,
} from 'lucide-react'
import { interfacesApi, projectsApi } from '@/api/client'
import { cn } from '@/lib/utils'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { FormDataEditor } from './components/FormDataEditor'
import type { KeyValueTypePair } from './components/FormDataEditor'

interface KeyValuePair {
    key: string
    value: string
    enabled: boolean
}

// HTTP 方法颜色
const methodColors: Record<string, string> = {
    GET: 'bg-emerald-500 text-white',
    POST: 'bg-amber-500 text-white',
    PUT: 'bg-cyan-500 text-white',
    DELETE: 'bg-red-500 text-white',
    PATCH: 'bg-violet-500 text-white',
}

// Key-Value 编辑器组件
function KeyValueEditor({
    pairs,
    onChange,
    placeholder = { key: 'Key', value: 'Value' }
}: {
    pairs: KeyValuePair[]
    onChange: (pairs: KeyValuePair[]) => void
    placeholder?: { key: string; value: string }
}) {
    const addPair = () => {
        onChange([...pairs, { key: '', value: '', enabled: true }])
    }

    const removePair = (index: number) => {
        onChange(pairs.filter((_, i) => i !== index))
    }

    const updatePair = (index: number, field: 'key' | 'value' | 'enabled', value: any) => {
        const newPairs = [...pairs]
        newPairs[index] = { ...newPairs[index], [field]: value }
        onChange(newPairs)
    }

    return (
        <div className="space-y-2">
            {pairs.map((pair, index) => (
                <div key={index} className="flex gap-2 items-center">
                    <input
                        type="checkbox"
                        checked={pair.enabled}
                        onChange={(e) => updatePair(index, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20"
                    />
                    <input
                        type="text"
                        value={pair.key}
                        onChange={(e) => updatePair(index, 'key', e.target.value)}
                        placeholder={placeholder.key}
                        className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                    <input
                        type="text"
                        value={pair.value}
                        onChange={(e) => updatePair(index, 'value', e.target.value)}
                        placeholder={placeholder.value}
                        className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                        onClick={() => removePair(index)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
            <button
                onClick={addPair}
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
            >
                <Plus className="w-4 h-4" />
                添加
            </button>
        </div>
    )
}

// cURL 导入弹窗
function CurlImportDialog({
    isOpen,
    onClose,
    onImport
}: {
    isOpen: boolean
    onClose: () => void
    onImport: (curl: string) => Promise<void>
}) {
    const [curl, setCurl] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleImport = async () => {
        if (!curl.trim()) return
        setIsLoading(true)
        try {
            await onImport(curl)
            setCurl('')
            onClose()
        } catch (error) {
            console.error('cURL 导入失败:', error)
            alert('cURL 格式错误，请检查后重试')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl mx-4"
            >
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h3 className="text-lg font-semibold text-white">导入 cURL</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            cURL 命令
                        </label>
                        <textarea
                            value={curl}
                            onChange={(e) => setCurl(e.target.value)}
                            placeholder={`curl -X POST "https://api.example.com/users" -H "Content-Type: application/json"`}
                            className="w-full h-40 bg-slate-800 border border-white/10 rounded-xl p-4 text-white font-mono text-sm resize-none focus:outline-none focus:border-cyan-500/50"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            提示：在浏览器开发者工具中复制 cURL 命令，然后粘贴到此处
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-4 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!curl.trim() || isLoading}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        导入
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

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

export default function InterfaceEditor() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const interfaceId = parseInt(id || '0')
    const isNew = !id || id === 'new'

    // cURL 导入弹窗状态
    const [showCurlDialog, setShowCurlDialog] = useState(false)

    // 请求编辑器 tabs
    const [activeTab, setActiveTab] = useState<'params' | 'body' | 'headers' | 'cookies'>('params')

    // 响应面板 tabs
    const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'cookies'>('body')

    // 环境选择
    const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null)
    const [projectId, setProjectId] = useState<number>(1)

    // 表单数据
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        method: 'GET',
        description: '',
        status: 'draft',
        params: [] as KeyValuePair[],
        headers: [] as KeyValuePair[],
        cookies: [] as KeyValuePair[],
        body: '',
        body_type: 'json',
    })

    // For form-data editing
    const [formDataBodyPairs, setFormDataBodyPairs] = useState<KeyValueTypePair[]>([])

    // 响应数据
    const [response, setResponse] = useState<{
        status_code: number
        headers: Record<string, string>
        body: any
        elapsed: number
    } | null>(null)
    const [isSending, setIsSending] = useState(false)

    // 获取接口详情
    const { data: interfaceData, isLoading } = useQuery({
        queryKey: ['interface', interfaceId],
        queryFn: () => interfacesApi.get(interfaceId),
        enabled: !isNew,
        select: (data) => data.data
    })

    // 获取环境列表
    const { data: environments = [] } = useQuery({
        queryKey: ['environments', projectId],
        queryFn: () => projectsApi.listEnvironments(projectId),
        select: (data) => data.data || []
    })

    // 获取项目列表
    const { data: projects = [] } = useQuery({
        queryKey: ['projects-list'],
        queryFn: () => projectsApi.list({ page: 1, size: 100 }),
        select: (data) => data.data?.items || []
    })

    // 加载接口数据
    useEffect(() => {
        if (interfaceData) {
            setFormData({
                name: interfaceData.name || '',
                url: interfaceData.url || '',
                method: interfaceData.method || 'GET',
                description: interfaceData.description || '',
                status: interfaceData.status || 'draft',
                params: objectToKeyValueArray(interfaceData.params),
                headers: objectToKeyValueArray(interfaceData.headers),
                cookies: objectToKeyValueArray(interfaceData.cookies),
                body: typeof interfaceData.body === 'string'
                    ? interfaceData.body
                    : JSON.stringify(interfaceData.body || {}, null, 2),
                body_type: interfaceData.body_type || 'json',
            })

            // 初始化 formDataBodyPairs
            if (interfaceData.body_type === 'form-data' && Array.isArray(interfaceData.body)) {
                // 如果后端存储的是结构化数据
                setFormDataBodyPairs(interfaceData.body)
            } else if (interfaceData.body_type === 'form-data' && typeof interfaceData.body === 'object') {
                // 兼容旧数据或 key-value 对象
                setFormDataBodyPairs(Object.entries(interfaceData.body || {}).map(([key, value]) => ({
                    key,
                    value: String(value),
                    type: 'text',
                    enabled: true
                })))
            } else {
                setFormDataBodyPairs([])
            }

            setProjectId(interfaceData.project_id)
        }
    }, [interfaceData])

    // 保存接口
    const saveMutation = useMutation({
        mutationFn: (data: any) => {
            if (isNew) {
                return interfacesApi.create({
                    project_id: projectId,
                    name: data.name,
                    url: data.url,
                    method: data.method,
                    status: data.status,
                })
            } else {
                return interfacesApi.update(interfaceId, data)
            }
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['interfaces'] })
            if (isNew && res.data?.id) {
                navigate(`/api/interfaces/${res.data.id}`)
            }
        }
    })

    // 发送请求
    const handleSend = async () => {
        setIsSending(true)
        setResponse(null)

        try {
            // 获取环境配置
            let baseUrl = ''
            let envHeaders: Record<string, string> = {}
            if (selectedEnvId) {
                const env = environments.find((e: any) => e.id === selectedEnvId)
                if (env) {
                    baseUrl = env.domain || ''
                    envHeaders = env.headers || {}
                }
            }

            // 构建完整 URL
            let fullUrl = formData.url
            if (baseUrl && !fullUrl.startsWith('http')) {
                fullUrl = baseUrl.replace(/\/$/, '') + '/' + fullUrl.replace(/^\//, '')
            }

            // 合并 headers
            const mergedHeaders = {
                ...envHeaders,
                ...keyValueArrayToObject(formData.headers)
            }

            // 解析 body
            let body = undefined
            let files: Record<string, string> | undefined = undefined

            if (formData.body_type === 'json' && formData.body) {
                try {
                    body = JSON.parse(formData.body)
                } catch {
                    body = formData.body
                }
            } else if (formData.body_type === 'form-data') {
                // 分离 text 和 file
                const textData: Record<string, string> = {}
                const fileData: Record<string, string> = {}

                formDataBodyPairs.filter(p => p.enabled).forEach(p => {
                    if (p.type === 'file') {
                        fileData[p.key] = p.value // value stored is object_name
                    } else {
                        textData[p.key] = p.value
                    }
                })

                body = textData
                if (Object.keys(fileData).length > 0) {
                    files = fileData
                }
            } else if (formData.body) {
                body = formData.body
            }

            const res = await interfacesApi.sendRequest({
                url: fullUrl,
                method: formData.method,
                headers: mergedHeaders,
                params: keyValueArrayToObject(formData.params),
                body,
                files
            })
            setResponse(res.data)
        } catch (e: any) {
            setResponse({
                status_code: 0,
                headers: {},
                body: { error: e.message || '请求失败' },
                elapsed: 0
            })
        } finally {
            setIsSending(false)
        }
    }

    // 保存
    const handleSave = () => {
        saveMutation.mutate({
            name: formData.name,
            url: formData.url,
            method: formData.method,
            description: formData.description,
            status: formData.status,
            params: keyValueArrayToObject(formData.params),
            headers: keyValueArrayToObject(formData.headers),
            cookies: keyValueArrayToObject(formData.cookies),
            body: formData.body_type === 'json' && formData.body
                ? (() => { try { return JSON.parse(formData.body) } catch { return {} } })()
                : formData.body_type === 'form-data'
                    ? formDataBodyPairs // Save the structured array
                    : {},
            body_type: formData.body_type,
        })
    }

    // cURL 导入处理
    const handleCurlImport = async (curl: string) => {
        try {
            // 调用后端 API 解析 cURL
            const res = await interfacesApi.importCurl({ curl })
            const parsedData = res.data

            // 更新表单数据
            setFormData({
                name: parsedData.name || formData.name,
                url: parsedData.url || formData.url,
                method: parsedData.method || formData.method,
                description: formData.description,
                status: formData.status,
                params: objectToKeyValueArray(parsedData.params || {}),
                headers: objectToKeyValueArray(parsedData.headers || {}),
                cookies: objectToKeyValueArray(parsedData.cookies || {}),
                body: parsedData.body ? JSON.stringify(parsedData.body, null, 2) : formData.body,
                body_type: parsedData.body_type || 'json',
            })

            // 如果有名称，自动保存
            if (parsedData.name) {
                saveMutation.mutate({
                    name: parsedData.name,
                    url: parsedData.url || formData.url,
                    method: parsedData.method || formData.method,
                    description: formData.description,
                    status: formData.status,
                    params: parsedData.params || {},
                    headers: parsedData.headers || {},
                    cookies: parsedData.cookies || {},
                    body: parsedData.body || {},
                    body_type: parsedData.body_type || 'json',
                })
            }
        } catch (error) {
            console.error('cURL 解析失败:', error)
            throw error
        }
    }

    const requestTabs = [
        { id: 'params' as const, label: 'Params' },
        { id: 'headers' as const, label: 'Headers' },
        { id: 'body' as const, label: 'Body' },
        { id: 'cookies' as const, label: 'Cookies' },
    ]

    const responseTabs = [
        { id: 'body' as const, label: 'Body' },
        { id: 'headers' as const, label: 'Headers' },
    ]

    if (isLoading && !isNew) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-950">
            {/* 顶部工具栏 */}
            <header className="flex items-center gap-4 px-6 py-4 border-b border-white/5 bg-slate-900/50">
                <Link
                    to="/api/interfaces"
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>

                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="接口名称"
                    className="text-xl font-bold text-white bg-transparent border-none focus:outline-none flex-1"
                />

                {/* 环境选择器 */}
                <div className="w-48">
                    <CustomSelect
                        value={selectedEnvId || ''}
                        onChange={(val) => setSelectedEnvId(val ? parseInt(val) : null)}
                        options={[
                            { label: '无环境', value: '' },
                            ...environments.map((env: any) => ({ label: env.name, value: env.id }))
                        ]}
                        placeholder="选择环境"
                    />
                </div>

                {/* cURL 导入按钮 */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCurlDialog(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center gap-2 transition-colors"
                    title="导入 cURL"
                >
                    <FileText className="w-4 h-4" />
                    导入 cURL
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center gap-2 transition-colors"
                >
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    保存
                </motion.button>
            </header>

            {/* 请求 URL 栏 */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                <div className="w-32">
                    <CustomSelect
                        value={formData.method}
                        onChange={(val) => setFormData({ ...formData, method: val })}
                        options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => ({ label: m, value: m }))}
                        placeholder="Method"
                        className={methodColors[formData.method] || 'bg-slate-700 text-white'}
                    />
                </div>

                <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="输入请求 URL，如 /api/users"
                    className="flex-1 h-10 bg-slate-800 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50"
                />

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSend}
                    disabled={isSending}
                    className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-colors"
                >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    发送
                </motion.button>
            </div>

            {/* 主体区域 */}
            <div className="flex-1 flex overflow-hidden">
                {/* 左侧：请求编辑器 */}
                <div className="flex-1 flex flex-col border-r border-white/5">
                    {/* Tabs */}
                    <div className="flex gap-1 px-6 py-3 border-b border-white/5 bg-slate-900/30">
                        {requestTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                    activeTab === tab.id
                                        ? "bg-cyan-500/20 text-cyan-400"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {tab.label}
                                {tab.id === 'params' && formData.params.length > 0 && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                                        {formData.params.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab 内容 */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'params' && (
                            <KeyValueEditor
                                pairs={formData.params}
                                onChange={(pairs) => setFormData({ ...formData, params: pairs })}
                                placeholder={{ key: '参数名', value: '参数值' }}
                            />
                        )}

                        {activeTab === 'headers' && (
                            <KeyValueEditor
                                pairs={formData.headers}
                                onChange={(pairs) => setFormData({ ...formData, headers: pairs })}
                                placeholder={{ key: 'Header Name', value: 'Header Value' }}
                            />
                        )}

                        {activeTab === 'cookies' && (
                            <KeyValueEditor
                                pairs={formData.cookies}
                                onChange={(pairs) => setFormData({ ...formData, cookies: pairs })}
                                placeholder={{ key: 'Cookie Name', value: 'Cookie Value' }}
                            />
                        )}

                        {activeTab === 'body' && (
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    {['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw'].map((type) => (
                                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="body_type"
                                                value={type}
                                                checked={formData.body_type === type}
                                                onChange={(e) => setFormData({ ...formData, body_type: e.target.value })}
                                                className="text-cyan-500 focus:ring-cyan-500/20"
                                            />
                                            <span className="text-slate-300 text-sm">{type}</span>
                                        </label>
                                    ))}
                                </div>

                                {formData.body_type !== 'none' && (
                                    <textarea
                                        value={formData.body}
                                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                        placeholder={formData.body_type === 'json' ? '{\n  "key": "value"\n}' : '请求体内容'}
                                        className="w-full h-64 bg-slate-800 border border-white/10 rounded-xl p-4 text-white font-mono text-sm resize-none focus:outline-none focus:border-cyan-500/50"
                                    />
                                )}

                                {formData.body_type === 'form-data' && (
                                    <FormDataEditor
                                        pairs={formDataBodyPairs}
                                        onChange={setFormDataBodyPairs}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 右侧：响应面板 */}
                <div className="w-1/2 flex flex-col bg-slate-900/30">
                    {/* 响应状态 */}
                    {response && (
                        <div className="flex items-center gap-4 px-6 py-3 border-b border-white/5">
                            <span className={cn(
                                "px-3 py-1 rounded-lg text-sm font-bold",
                                response.status_code >= 200 && response.status_code < 300
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : response.status_code >= 400
                                        ? "bg-red-500/20 text-red-400"
                                        : "bg-amber-500/20 text-amber-400"
                            )}>
                                {response.status_code || 'Error'}
                            </span>
                            <span className="text-slate-400 text-sm">
                                {(response.elapsed * 1000).toFixed(0)} ms
                            </span>
                        </div>
                    )}

                    {/* 响应 Tabs */}
                    <div className="flex gap-1 px-6 py-3 border-b border-white/5">
                        {responseTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setResponseTab(tab.id)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                    responseTab === tab.id
                                        ? "bg-cyan-500/20 text-cyan-400"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* 响应内容 */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {!response ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <Send className="w-12 h-12 mb-4 opacity-20" />
                                <p>点击 "发送" 查看响应</p>
                            </div>
                        ) : responseTab === 'body' ? (
                            <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-all">
                                {typeof response.body === 'string'
                                    ? response.body
                                    : JSON.stringify(response.body, null, 2)}
                            </pre>
                        ) : (
                            <div className="space-y-2">
                                {Object.entries(response.headers || {}).map(([key, value]) => (
                                    <div key={key} className="flex gap-4">
                                        <span className="text-cyan-400 font-mono text-sm">{key}:</span>
                                        <span className="text-slate-300 font-mono text-sm">{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* cURL 导入弹窗 */}
            <CurlImportDialog
                isOpen={showCurlDialog}
                onClose={() => setShowCurlDialog(false)}
                onImport={handleCurlImport}
            />
        </div>
    )
}
