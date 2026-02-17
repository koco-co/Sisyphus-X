import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft,
    Plus,
    Trash2,
    Copy,
    Settings,
    Database,
    Globe,
    Check,
    X,
    Loader2,
    Server
} from 'lucide-react'
import { projectsApi } from '@/api/client'
import { CustomSelect } from '@/components/ui/CustomSelect'

// 类型定义
interface Environment {
    id: number
    project_id: number
    name: string
    domain: string
    variables: Record<string, string>
    headers: Record<string, string>
}

interface DataSource {
    id: number
    project_id: number
    name: string
    db_type: string
    host: string
    port: number
    db_name: string
    username: string
}

interface KeyValuePair {
    key: string
    value: string
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
        onChange([...pairs, { key: '', value: '' }])
    }

    const removePair = (index: number) => {
        onChange(pairs.filter((_, i) => i !== index))
    }

    const updatePair = (index: number, field: 'key' | 'value', value: string) => {
        const newPairs = [...pairs]
        newPairs[index] = { ...newPairs[index], [field]: value }
        onChange(newPairs)
    }

    return (
        <div className="space-y-2">
            {pairs.map((pair, index) => (
                <div key={index} className="flex gap-2 items-center">
                    <input
                        type="text"
                        value={pair.key}
                        onChange={(e) => updatePair(index, 'key', e.target.value)}
                        placeholder={placeholder.key}
                        className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                    <input
                        type="text"
                        value={pair.value}
                        onChange={(e) => updatePair(index, 'value', e.target.value)}
                        placeholder={placeholder.value}
                        className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
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

// 工具函数：对象转 Key-Value 数组
const objectToKeyValueArray = (obj: Record<string, string>): KeyValuePair[] => {
    return Object.entries(obj).map(([key, value]) => ({ key, value }))
}

// 工具函数：Key-Value 数组转对象
const keyValueArrayToObject = (pairs: KeyValuePair[]): Record<string, string> => {
    return pairs.reduce((acc, { key, value }) => {
        if (key.trim()) {
            acc[key] = value
        }
        return acc
    }, {} as Record<string, string>)
}

export default function ProjectSettings() {
    const { t } = useTranslation()
    const { id } = useParams<{ id: string }>()
    const projectId = parseInt(id || '0')
    const queryClient = useQueryClient()

    // 当前标签页
    const [activeTab, setActiveTab] = useState<'environments' | 'datasources'>('environments')

    // 环境编辑状态
    const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null)
    const [envForm, setEnvForm] = useState({
        name: '',
        domain: '',
        variables: [] as KeyValuePair[],
        headers: [] as KeyValuePair[]
    })

    // 数据源弹窗状态
    const [isDataSourceModalOpen, setIsDataSourceModalOpen] = useState(false)
    const [dsForm, setDsForm] = useState({
        name: '',
        db_type: 'mysql',
        host: '',
        port: 3306,
        db_name: '',
        username: '',
        password: ''
    })
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
    const [isTesting, setIsTesting] = useState(false)

    // 获取项目信息
    const { data: projectData } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectsApi.get(projectId),
        select: (data) => data.data
    })

    // 获取环境列表
    const { data: environments = [] } = useQuery({
        queryKey: ['environments', projectId],
        queryFn: () => projectsApi.listEnvironments(projectId),
        select: (data) => data.data as Environment[]
    })

    // 获取数据源列表
    const { data: dataSources = [] } = useQuery({
        queryKey: ['datasources', projectId],
        queryFn: () => projectsApi.listDataSources(projectId),
        select: (data) => data.data as DataSource[]
    })

    // 环境 Mutations
    const createEnvMutation = useMutation({
        mutationFn: (data: { name: string; domain: string; variables: Record<string, string>; headers: Record<string, string> }) =>
            projectsApi.createEnvironment(projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
            resetEnvForm()
        }
    })

    const updateEnvMutation = useMutation({
        mutationFn: ({ envId, data }: { envId: number; data: { name?: string; domain?: string; variables?: Record<string, string>; headers?: Record<string, string> } }) =>
            projectsApi.updateEnvironment(projectId, envId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
        }
    })

    const deleteEnvMutation = useMutation({
        mutationFn: (envId: number) => projectsApi.deleteEnvironment(projectId, envId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
            if (selectedEnvId) setSelectedEnvId(null)
        }
    })

    const copyEnvMutation = useMutation({
        mutationFn: (envId: number) => projectsApi.copyEnvironment(projectId, envId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
        }
    })

    // 数据源 Mutations
    const createDsMutation = useMutation({
        mutationFn: (data: { name: string; db_type: string; host: string; port: number; db_name: string; username: string; password: string }) =>
            projectsApi.createDataSource(projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datasources', projectId] })
            setIsDataSourceModalOpen(false)
            resetDsForm()
        }
    })

    const deleteDsMutation = useMutation({
        mutationFn: (dsId: number) => projectsApi.deleteDataSource(projectId, dsId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datasources', projectId] })
        }
    })

    // 选择环境进行编辑
    const selectEnvironment = (env: Environment) => {
        setSelectedEnvId(env.id)
        setEnvForm({
            name: env.name,
            domain: env.domain,
            variables: objectToKeyValueArray(env.variables),
            headers: objectToKeyValueArray(env.headers)
        })
    }

    // 重置环境表单
    const resetEnvForm = () => {
        setSelectedEnvId(null)
        setEnvForm({
            name: '',
            domain: '',
            variables: [],
            headers: []
        })
    }

    // 重置数据源表单
    const resetDsForm = () => {
        setDsForm({
            name: '',
            db_type: 'mysql',
            host: '',
            port: 3306,
            db_name: '',
            username: '',
            password: ''
        })
        setTestResult(null)
    }

    // 保存环境
    const saveEnvironment = () => {
        const data = {
            name: envForm.name,
            domain: envForm.domain,
            variables: keyValueArrayToObject(envForm.variables),
            headers: keyValueArrayToObject(envForm.headers)
        }

        if (selectedEnvId) {
            updateEnvMutation.mutate({ envId: selectedEnvId, data })
        } else {
            createEnvMutation.mutate(data)
        }
    }

    // 测试数据源连接
    const testConnection = async () => {
        setIsTesting(true)
        setTestResult(null)
        try {
            const res = await projectsApi.testDataSource({
                db_type: dsForm.db_type,
                host: dsForm.host,
                port: dsForm.port,
                db_name: dsForm.db_name,
                username: dsForm.username,
                password: dsForm.password
            })
            setTestResult(res.data)
        } catch (e) {
            setTestResult({ success: false, message: '请求失败' })
        } finally {
            setIsTesting(false)
        }
    }

    const tabs = [
        { id: 'environments' as const, label: '环境管理', icon: Globe },
        { id: 'datasources' as const, label: '数据源管理', icon: Database }
    ]

    return (
        <div className="p-8">
            {/* 顶部导航 */}
            <header className="flex items-center gap-4 mb-8">
                <Link
                    to="/api/projects"
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Settings className="w-5 h-5 text-cyan-400" />
                        <h1 className="text-2xl font-bold text-white">项目设置</h1>
                    </div>
                    <p className="text-slate-400 text-sm">{projectData?.name || '加载中...'}</p>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-slate-900/50 p-1 rounded-2xl w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${activeTab === tab.id
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 环境管理 Tab */}
            {activeTab === 'environments' && (
                <div className="flex gap-6">
                    {/* 左侧：环境列表 */}
                    <div className="w-64 shrink-0">
                        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-semibold">环境列表</h3>
                                <button
                                    onClick={() => resetEnvForm()}
                                    className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {environments.map((env) => (
                                    <div
                                        key={env.id}
                                        className={`p-3 rounded-xl cursor-pointer transition-all ${selectedEnvId === env.id
                                            ? 'bg-cyan-500/20 border border-cyan-500/50'
                                            : 'bg-slate-800/50 border border-transparent hover:bg-slate-800'
                                            }`}
                                        onClick={() => selectEnvironment(env)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-white text-sm font-medium">{env.name}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); copyEnvMutation.mutate(env.id) }}
                                                    className="p-1 text-slate-500 hover:text-cyan-400 transition-colors"
                                                    title="复制"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteEnvMutation.mutate(env.id) }}
                                                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                                    title="删除"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-slate-500 text-xs truncate mt-1">{env.domain || '未设置 URL'}</p>
                                    </div>
                                ))}
                                {environments.length === 0 && (
                                    <p className="text-slate-500 text-sm text-center py-4">暂无环境配置</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 右侧：编辑器 */}
                    <div className="flex-1 bg-slate-900 border border-white/5 rounded-2xl p-6">
                        <h3 className="text-white font-semibold mb-6">
                            {selectedEnvId ? '编辑环境' : '新建环境'}
                        </h3>
                        <div className="space-y-6">
                            {/* 环境名称 */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">环境名称</label>
                                <input
                                    type="text"
                                    value={envForm.name}
                                    onChange={(e) => setEnvForm({ ...envForm, name: e.target.value })}
                                    placeholder="如: Development, Testing, Production"
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                                />
                            </div>

                            {/* Base URL */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Base URL</label>
                                <input
                                    type="text"
                                    value={envForm.domain}
                                    onChange={(e) => setEnvForm({ ...envForm, domain: e.target.value })}
                                    placeholder="https://api.example.com"
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                                />
                            </div>

                            {/* 全局变量 */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">全局变量</label>
                                <KeyValueEditor
                                    pairs={envForm.variables}
                                    onChange={(pairs) => setEnvForm({ ...envForm, variables: pairs })}
                                    placeholder={{ key: '变量名', value: '变量值' }}
                                />
                            </div>

                            {/* 全局请求头 */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">全局请求头</label>
                                <KeyValueEditor
                                    pairs={envForm.headers}
                                    onChange={(pairs) => setEnvForm({ ...envForm, headers: pairs })}
                                    placeholder={{ key: 'Header Name', value: 'Header Value' }}
                                />
                            </div>

                            {/* 保存按钮 */}
                            <div className="flex gap-4 pt-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={saveEnvironment}
                                    disabled={!envForm.name}
                                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                                >
                                    保存
                                </motion.button>
                                {selectedEnvId && (
                                    <button
                                        onClick={resetEnvForm}
                                        className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
                                    >
                                        取消
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 数据源管理 Tab */}
            {activeTab === 'datasources' && (
                <div>
                    {/* 新建按钮 */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsDataSourceModalOpen(true)}
                        className="mb-6 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-cyan-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        新建数据源
                    </motion.button>

                    {/* 数据源卡片网格 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {dataSources.map((ds, index) => (
                                <motion.div
                                    key={ds.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-slate-900 border border-white/5 rounded-2xl p-6 hover:border-cyan-500/30 transition-all"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
                                            <Server className="w-6 h-6" />
                                        </div>
                                        <button
                                            onClick={() => deleteDsMutation.mutate(ds.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h4 className="text-white font-semibold mb-2">{ds.name}</h4>
                                    <div className="space-y-1 text-sm text-slate-400">
                                        <p>类型: <span className="text-cyan-400">{ds.db_type.toUpperCase()}</span></p>
                                        <p>地址: {ds.host}:{ds.port}</p>
                                        {ds.db_name && <p>数据库: {ds.db_name}</p>}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {dataSources.length === 0 && (
                            <div className="col-span-full text-center py-12 text-slate-500">
                                暂无数据源，点击上方按钮添加
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 新建数据源弹窗 */}
            <AnimatePresence>
                {isDataSourceModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                        onClick={() => { setIsDataSourceModalOpen(false); resetDsForm() }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold text-white mb-6">新建数据源</h3>

                            <div className="space-y-4">
                                {/* 名称 */}
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">名称</label>
                                    <input
                                        type="text"
                                        value={dsForm.name}
                                        onChange={(e) => setDsForm({ ...dsForm, name: e.target.value })}
                                        placeholder="如: 主数据库"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>

                                {/* 类型 */}
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">数据库类型</label>
                                    <CustomSelect
                                        value={dsForm.db_type}
                                        onChange={(val) => setDsForm({ ...dsForm, db_type: val })}
                                        options={[
                                            { label: 'MySQL', value: 'mysql' },
                                            { label: 'PostgreSQL', value: 'postgresql' },
                                            { label: 'MongoDB', value: 'mongodb' },
                                            { label: 'Redis', value: 'redis' }
                                        ]}
                                        placeholder="选择数据库类型"
                                    />
                                </div>

                                {/* Host & Port */}
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-slate-400 text-sm mb-2">Host</label>
                                        <input
                                            type="text"
                                            value={dsForm.host}
                                            onChange={(e) => setDsForm({ ...dsForm, host: e.target.value })}
                                            placeholder="localhost"
                                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                                        />
                                    </div>
                                    <div className="w-28">
                                        <label className="block text-slate-400 text-sm mb-2">Port</label>
                                        <input
                                            type="number"
                                            value={dsForm.port}
                                            onChange={(e) => setDsForm({ ...dsForm, port: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                                        />
                                    </div>
                                </div>

                                {/* Database Name */}
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">数据库名</label>
                                    <input
                                        type="text"
                                        value={dsForm.db_name}
                                        onChange={(e) => setDsForm({ ...dsForm, db_name: e.target.value })}
                                        placeholder="my_database"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>

                                {/* Username & Password */}
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-slate-400 text-sm mb-2">用户名</label>
                                        <input
                                            type="text"
                                            value={dsForm.username}
                                            onChange={(e) => setDsForm({ ...dsForm, username: e.target.value })}
                                            placeholder="root"
                                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-slate-400 text-sm mb-2">密码</label>
                                        <input
                                            type="password"
                                            value={dsForm.password}
                                            onChange={(e) => setDsForm({ ...dsForm, password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                                        />
                                    </div>
                                </div>

                                {/* 测试结果 */}
                                {testResult && (
                                    <div className={`p-4 rounded-xl flex items-center gap-3 ${testResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {testResult.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                        <span className="text-sm">{testResult.message}</span>
                                    </div>
                                )}
                            </div>

                            {/* 按钮 */}
                            <div className="flex justify-end gap-4 mt-8">
                                <button
                                    onClick={testConnection}
                                    disabled={isTesting || !dsForm.host}
                                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                    测试连接
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => createDsMutation.mutate(dsForm)}
                                    disabled={!dsForm.name || !dsForm.host}
                                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                                >
                                    保存
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
