import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft,
    Send,
    Save,
    ChevronDown,
    Plus,
    Trash2,
    Copy,
    Loader2,
    Check,
    X,
    FileJson,
    Code
} from 'lucide-react'
import { interfacesApi, projectsApi } from '@/api/client'
import { cn } from '@/lib/utils'

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
            if (formData.body_type === 'json' && formData.body) {
                try {
                    body = JSON.parse(formData.body)
                } catch {
                    body = formData.body
                }
            } else if (formData.body) {
                body = formData.body
            }

            const res = await interfacesApi.sendRequest({
                url: fullUrl,
                method: formData.method,
                headers: mergedHeaders,
                params: keyValueArrayToObject(formData.params),
                body
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
                : {},
            body_type: formData.body_type,
        })
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
                <select
                    value={selectedEnvId || ''}
                    onChange={(e) => setSelectedEnvId(e.target.value ? parseInt(e.target.value) : null)}
                    className="h-10 px-4 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                    <option value="">无环境</option>
                    {environments.map((env: any) => (
                        <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                </select>

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
                <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className={cn(
                        "h-10 px-3 rounded-xl text-sm font-bold focus:outline-none",
                        methodColors[formData.method] || 'bg-slate-700 text-white'
                    )}
                >
                    {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>

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
        </div>
    )
}
