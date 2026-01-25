import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, Plus, Search, Code, Play, Edit, Trash2, Loader2, FileCode, Power, Eye, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { keywordsApi, projectsApi } from '@/api/client'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

interface KeywordVariable {
    name: string
    description: string
}

interface KeywordItem {
    id: number
    name: str
    func_name: string
    category: string
    function_code: string
    is_active: boolean
    project_id: number
    description?: string
    input_params: KeywordVariable[]
    output_params: KeywordVariable[]
}

const typeColors: Record<string, string> = {
    'request': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    'assert': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'extract': 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    'db': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'custom': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
}

const typeLabels: Record<string, string> = {
    'request': '发送请求',
    'assert': '断言',
    'extract': '提取变量',
    'db': '数据库操作',
    'custom': '自定义操作',
}

// 示例代码模板
const codeTemplates: Record<string, string> = {
    request: `def send_request(url: str, method: str = "GET", headers: dict = None, body: dict = None) -> dict:
    """发送HTTP请求"""
    import requests
    
    response = requests.request(
        method=method,
        url=url,
        headers=headers or {},
        json=body
    )
    return {
        "status_code": response.status_code,
        "body": response.json() if response.text else None,
        "headers": dict(response.headers)
    }`,
    assert: `def assert_equals(actual, expected, message: str = "") -> bool:
    """断言两个值相等"""
    if actual != expected:
        raise AssertionError(f"{message}: 期望 {expected}, 实际 {actual}")
    return True`,
    extract: `def extract_value(response: dict, jsonpath: str) -> any:
    """从响应中提取值"""
    from jsonpath_ng import parse
    
    expr = parse(jsonpath)
    matches = expr.find(response)
    return matches[0].value if matches else None`,
    db: `def query_database(sql: str, params: tuple = None) -> list:
    """执行数据库查询"""
    # 注意: 需要配置数据源连接
    import pymysql
    
    connection = pymysql.connect(
        host="localhost",
        user="root",
        password="",
        database="test"
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params or ())
            return cursor.fetchall()
    finally:
        connection.close()`,
    custom: `def custom_keyword(param1: str, param2: int = 0) -> dict:
    """自定义关键字"""
    # 在这里编写你的自定义逻辑
    result = {
        "input": param1,
        "processed": param1.upper(),
        "count": param2
    }
    return result`
}

export default function KeywordManagement() {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<KeywordItem | null>(null)

    // 表单状态
    const [formData, setFormData] = useState({
        name: '',
        func_name: '',
        category: 'request',
        function_code: '',
        description: '',
        project_id: 1,  // TODO: 从项目选择器获取
        input_params: [] as KeywordVariable[],
        output_params: [] as KeywordVariable[],
    })

    // 获取关键字列表
    const { data: keywordsData, isLoading } = useQuery({
        queryKey: ['keywords'],
        queryFn: async () => {
            const res = await keywordsApi.list()
            return (res.data?.items ?? res.data ?? []) as KeywordItem[]
        }
    })

    // 获取项目列表
    const { data: projectsData } = useQuery({
        queryKey: ['projects-select'],
        queryFn: () => projectsApi.list({ page: 1, size: 100 }),
        select: (data) => data.data?.items ?? []
    })

    // 创建关键字
    const createMutation = useMutation({
        mutationFn: (data: typeof formData) => keywordsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['keywords'] })
            closeModal()
        }
    })

    // 更新关键字
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: typeof formData }) => keywordsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['keywords'] })
            closeModal()
        }
    })

    // 删除关键字
    const deleteMutation = useMutation({
        mutationFn: (id: number) => keywordsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['keywords'] })
            setDeleteTarget(null)
        }
    })

    // 切换状态
    const toggleMutation = useMutation({
        mutationFn: (id: number) => keywordsApi.toggle(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['keywords'] })
        }
    })

    // 生成文件
    const generateFileMutation = useMutation({
        mutationFn: (id: number) => keywordsApi.generateFile(id),
        onSuccess: (res) => {
            alert(res.data.message)
        }
    })

    const handleSubmit = () => {
        if (!formData.name || !formData.func_name) return
        if (editingId) {
            updateMutation.mutate({ id: editingId, data: formData })
        } else {
            createMutation.mutate(formData)
        }
    }

    const openCreateModal = () => {
        setEditingId(null)
        setFormData({
            name: '',
            func_name: '',
            category: 'request',
            function_code: '',
            description: '',
            project_id: 1,
            input_params: [],
            output_params: [],
        })
        setShowModal(true)
    }

    const openEditModal = (keyword: KeywordItem) => {
        setEditingId(keyword.id)
        setFormData({
            name: keyword.name,
            func_name: keyword.func_name,
            category: keyword.category,
            function_code: keyword.function_code,
            description: keyword.description || '',
            project_id: keyword.project_id,
            input_params: keyword.input_params || [],
            output_params: keyword.output_params || [],
        })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingId(null)
        setFormData({
            name: '',
            func_name: '',
            category: 'request',
            function_code: '',
            description: '',
            project_id: 1,
            input_params: [],
            output_params: [],
        })
    }

    const generateExampleCode = () => {
        setFormData(prev => ({
            ...prev,
            function_code: codeTemplates[prev.category] || codeTemplates.custom
        }))
    }

    const addVariable = () => {
        setFormData(prev => ({
            ...prev,
            input_params: [...prev.input_params, { name: '', description: '' }]
        }))
    }

    const updateVariable = (index: number, field: 'name' | 'description', value: string) => {
        setFormData(prev => ({
            ...prev,
            input_params: prev.input_params.map((v, i) =>
                i === index ? { ...v, [field]: value } : v
            )
        }))
    }

    const removeVariable = (index: number) => {
        setFormData(prev => ({
            ...prev,
            input_params: prev.input_params.filter((_, i) => i !== index)
        }))
    }

    const keywords = keywordsData ?? []

    // 前端过滤
    const filteredKeywords = keywords.filter(keyword => {
        const matchesSearch = keyword.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            keyword.func_name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = !typeFilter || keyword.category === typeFilter
        return matchesSearch && matchesType
    })

    return (
        <div className="p-8 space-y-8">
            {/* 页面标题 */}
            <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Key className="w-8 h-8 text-cyan-400" />
                        {t('keywords.title')}
                    </h1>
                    <p className="text-slate-400 mt-1">维护核心执行器中定义的关键字代码</p>
                </div>
                <motion.button
                    onClick={openCreateModal}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all flex items-center gap-2 text-sm font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Plus className="w-4 h-4" />
                    <span>{t('keywords.newKeyword')}</span>
                </motion.button>
            </motion.div>

            {/* 搜索和筛选 */}
            <motion.div
                className="flex gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜索关键字..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-cyan-500/50"
                >
                    <option value="">全部类型</option>
                    <option value="request">发送请求</option>
                    <option value="assert">断言</option>
                    <option value="extract">提取变量</option>
                    <option value="db">数据库操作</option>
                    <option value="custom">自定义操作</option>
                </select>
            </motion.div>

            {/* 加载状态 */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
            ) : (
                /* 关键字列表 */
                <motion.div
                    className="rounded-2xl glass border border-white/5 overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left text-slate-400 font-medium text-sm px-6 py-4">{t('common.name')}</th>
                                <th className="text-left text-slate-400 font-medium text-sm px-6 py-4">方法名</th>
                                <th className="text-left text-slate-400 font-medium text-sm px-6 py-4">操作类型</th>
                                <th className="text-left text-slate-400 font-medium text-sm px-6 py-4">{t('common.status')}</th>
                                <th className="text-right text-slate-400 font-medium text-sm px-6 py-4">{t('common.action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredKeywords.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        暂无关键字数据
                                    </td>
                                </tr>
                            ) : (
                                filteredKeywords.map((keyword, i) => (
                                    <motion.tr
                                        key={keyword.id}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.1 + i * 0.05 }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/10 to-violet-500/10 flex items-center justify-center">
                                                    <Code className="w-4 h-4 text-cyan-400" />
                                                </div>
                                                <span className="text-white font-medium">{keyword.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-sm text-slate-300 bg-white/5 px-2 py-1 rounded">{keyword.func_name}</code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2 py-1 rounded-full border ${typeColors[keyword.category] || typeColors['custom']}`}>
                                                {typeLabels[keyword.category] || keyword.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleMutation.mutate(keyword.id)}
                                                className="flex items-center gap-2 group"
                                            >
                                                {keyword.is_active ? (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                                                        <span className="text-emerald-400 text-sm group-hover:underline">{t('common.enable')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-slate-500" />
                                                        <span className="text-slate-500 text-sm group-hover:underline">{t('common.disable')}</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(keyword)}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors"
                                                    title="查看/编辑"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => generateFileMutation.mutate(keyword.id)}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-white/5 transition-colors"
                                                    title="生成代码文件"
                                                >
                                                    <FileCode className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(keyword)}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                                                    title="删除"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </motion.div>
            )}

            {/* 新建/编辑关键字模态框 */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeModal}
                    >
                        <motion.div
                            className="w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl border border-white/10 p-8 overflow-y-auto"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">
                                    {editingId ? '编辑关键字' : t('keywords.newKeyword')}
                                </h2>
                                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* 左列 */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">关键字名称 *</label>
                                        <input
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-cyan-500/50"
                                            placeholder="输入关键字名称"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">方法名 *</label>
                                        <input
                                            value={formData.func_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, func_name: e.target.value }))}
                                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-cyan-500/50"
                                            placeholder="例如：send_get_request"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">操作类型</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-cyan-500/50"
                                        >
                                            <option value="request">发送请求</option>
                                            <option value="assert">断言</option>
                                            <option value="extract">提取变量</option>
                                            <option value="db">数据库操作</option>
                                            <option value="custom">自定义操作</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">所属项目</label>
                                        <select
                                            value={formData.project_id}
                                            onChange={(e) => setFormData(prev => ({ ...prev, project_id: parseInt(e.target.value) }))}
                                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-cyan-500/50"
                                        >
                                            {(projectsData || []).map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">描述</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-cyan-500/50"
                                            placeholder="关键字描述..."
                                        />
                                    </div>

                                    {/* 变量管理 */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm text-slate-400">变量定义</label>
                                            <button
                                                onClick={addVariable}
                                                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" />
                                                添加变量
                                            </button>
                                        </div>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {formData.input_params.map((v, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                    <input
                                                        value={v.name}
                                                        onChange={(e) => updateVariable(i, 'name', e.target.value)}
                                                        placeholder="变量名"
                                                        className="flex-1 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                                                    />
                                                    <input
                                                        value={v.description}
                                                        onChange={(e) => updateVariable(i, 'description', e.target.value)}
                                                        placeholder="描述"
                                                        className="flex-1 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                                                    />
                                                    <button
                                                        onClick={() => removeVariable(i)}
                                                        className="p-2 text-slate-500 hover:text-red-400"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {formData.input_params.length === 0 && (
                                                <p className="text-slate-500 text-xs text-center py-2">暂无变量</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 右列 - 代码编辑器 */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-slate-400">代码</label>
                                        <button
                                            onClick={generateExampleCode}
                                            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            生成示例代码
                                        </button>
                                    </div>
                                    <textarea
                                        value={formData.function_code}
                                        onChange={(e) => setFormData(prev => ({ ...prev, function_code: e.target.value }))}
                                        className="w-full h-80 bg-slate-800 border border-white/10 rounded-xl p-4 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
                                        placeholder={`def your_function():\n    # 在这里编写关键字代码\n    pass`}
                                    />
                                </div>
                            </div>

                            {/* 底部按钮 */}
                            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/5">
                                <button
                                    onClick={() => setFormData({
                                        name: '',
                                        func_name: '',
                                        category: 'request',
                                        function_code: '',
                                        description: '',
                                        project_id: 1,
                                        input_params: [],
                                        output_params: [],
                                    })}
                                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    清空
                                </button>
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    关闭
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-medium disabled:opacity-50 flex items-center gap-2"
                                >
                                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                                    保存
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 删除确认对话框 */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="删除关键字"
                message={`确定要删除关键字「${deleteTarget?.name}」吗？此操作无法撤销。`}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}
