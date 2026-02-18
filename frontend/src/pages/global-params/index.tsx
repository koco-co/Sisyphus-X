import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    ChevronDown,
    ChevronRight,
    Copy,
    HelpCircle,
    Code,
    Loader2
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { globalParamsApi } from '@/api/client'
import CreateGlobalParamDialog from './components/CreateGlobalParamDialog'
import EditGlobalParamDialog from './components/EditGlobalParamDialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

// TypeScript 类型定义
interface GlobalParam {
    id: string
    class_name: string
    method_name: string
    code: string
    description: string | null
    parameters: ParameterInfo[] | null
    return_value: ReturnValueInfo | null
    created_at: string
    updated_at: string
}

interface ParameterInfo {
    name: string
    type: string
    description: string
}

interface ReturnValueInfo {
    type: string
    description: string
}

interface ParsedDocstring {
    class_name: string
    method_name: string
    description: string
    parameters: ParameterInfo[]
    return_value: ReturnValueInfo
}

export default function GlobalParamsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set())
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingParam, setEditingParam] = useState<GlobalParam | null>(null)
    const [deletingParam, setDeletingParam] = useState<GlobalParam | null>(null)
    const { success, error } = useToast()

    const queryClient = useQueryClient()

    // 获取全局参数列表
    const { data: globalParams = [], isLoading } = useQuery({
        queryKey: ['global-params'],
        queryFn: async () => {
            const response = await globalParamsApi.list()
            return response.data.data || []
        }
    })

    // 创建全局参数
    const createMutation = useMutation({
        mutationFn: async (data: { code: string }) => {
            return await globalParamsApi.create(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-params'] })
            success('全局参数创建成功')
            setIsCreateDialogOpen(false)
        },
        onError: (error: any) => {
            error(error.response?.data?.message || '创建失败')
        }
    })

    // 更新全局参数
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            return await globalParamsApi.update(id, data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-params'] })
            success('全局参数更新成功')
            setEditingParam(null)
        },
        onError: (error: any) => {
            error(error.response?.data?.message || '更新失败')
        }
    })

    // 删除全局参数
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await globalParamsApi.delete(id)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-params'] })
            success('全局参数删除成功')
            setDeletingParam(null)
        },
        onError: (error: any) => {
            error(error.response?.data?.message || '删除失败')
        }
    })

    // 按类名分组
    const groupedParams = globalParams.reduce((acc: Record<string, typeof globalParams>, param: any) => {
        if (!acc[param.class_name]) {
            acc[param.class_name] = []
        }
        acc[param.class_name].push(param)
        return acc
    }, {} as Record<string, GlobalParam[]>)

    // 过滤
    const filteredGroups = Object.entries(groupedParams).filter(([className, params]: [string, any]) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            className.toLowerCase().includes(query) ||
            params.some((p: any) =>
                p.method_name.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query))
            )
        )
    })

    // 切换类展开/折叠
    const toggleClass = (className: string) => {
        const newExpanded = new Set(expandedClasses)
        if (newExpanded.has(className)) {
            newExpanded.delete(className)
        } else {
            newExpanded.add(className)
        }
        setExpandedClasses(newExpanded)
    }

    // 复制方法名到剪贴板
    const copyMethodName = (methodName: string) => {
        navigator.clipboard.writeText(methodName)
        success('已复制到剪贴板')
    }

    // 处理创建
    const handleCreate = (parsedResult: ParsedDocstring & { code: string }) => {
        createMutation.mutate({ code: parsedResult.code })
    }

    // 处理更新
    const handleUpdate = (id: string, parsedResult: ParsedDocstring & { code: string }) => {
        updateMutation.mutate({
            id,
            data: { code: parsedResult.code }
        })
    }

    // 处理删除
    const handleDelete = () => {
        if (deletingParam) {
            deleteMutation.mutate(deletingParam.id)
        }
    }

    // 格式化参数显示
    const formatParameters = (params: ParameterInfo[] | null): string => {
        if (!params || params.length === 0) return '-'
        return params.map(p => `${p.name}: ${p.type}`).join(', ')
    }

    // 格式化返回值显示
    const formatReturnValue = (ret: ReturnValueInfo | null): string => {
        if (!ret) return '-'
        return ret.type || '-'
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-8">
            {/* 页头 */}
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">全局参数管理</h1>
                    <p className="text-slate-400">管理可复用的工具函数和参数</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-cyan-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        创建全局参数
                    </button>
                </div>
            </header>

            {/* 搜索框 */}
            <div className="flex gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="搜索类名、方法名、描述..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all shadow-xl"
                    />
                </div>
            </div>

            {/* 参数列表 */}
            {filteredGroups.length === 0 ? (
                <div className="text-center py-16">
                    <Code className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">
                        {searchQuery ? '未找到匹配的全局参数' : '暂无全局参数'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredGroups.map(([className, params]) => (
                        <motion.div
                            key={className}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden"
                        >
                            {/* 类名标题栏 */}
                            <button
                                onClick={() => toggleClass(className)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {expandedClasses.has(className) ? (
                                        <ChevronDown className="w-5 h-5 text-cyan-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-cyan-400" />
                                    )}
                                    <h3 className="text-lg font-semibold text-white">{className}</h3>
                                    <span className="text-sm text-slate-500">({(params as any).length})</span>
                                </div>
                            </button>

                            {/* 方法列表 */}
                            {expandedClasses.has(className) && (
                                <div className="border-t border-white/5">
                                    <table className="w-full">
                                        <thead className="bg-slate-800/50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                    方法名
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                    功能描述
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                    入参
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                    出参
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                    操作
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {(params as any).map((param: any) => (
                                                <tr
                                                    key={param.id}
                                                    className="hover:bg-white/5 transition-colors"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-cyan-400 font-mono text-sm">
                                                                {param.method_name}
                                                            </code>
                                                            <button
                                                                onClick={() => copyMethodName(param.method_name)}
                                                                className="p-1 text-slate-500 hover:text-white transition-colors"
                                                                title="复制方法名"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-slate-300 text-sm">
                                                            {param.description || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-slate-400 text-sm font-mono">
                                                            {formatParameters(param.parameters)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-slate-400 text-sm font-mono">
                                                            {formatReturnValue(param.return_value)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => setEditingParam(param)}
                                                                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                                                                title="编辑"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeletingParam(param)}
                                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                                title="删除"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* 创建对话框 */}
            <CreateGlobalParamDialog
                isOpen={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                onSubmit={handleCreate}
                isSubmitting={createMutation.isPending}
            />

            {/* 编辑对话框 */}
            {editingParam && (
                <EditGlobalParamDialog
                    isOpen={!!editingParam}
                    param={editingParam}
                    onClose={() => setEditingParam(null)}
                    onSubmit={(parsedResult) => handleUpdate(editingParam.id, parsedResult)}
                    isSubmitting={updateMutation.isPending}
                />
            )}

            {/* 删除确认对话框 */}
            <ConfirmDialog
                isOpen={!!deletingParam}
                title="确认删除"
                description={`确定要删除全局参数 "${deletingParam?.method_name}" 吗？此操作不可撤销。`}
                confirmText="删除"
                cancelText="取消"
                onConfirm={handleDelete}
                onClose={() => setDeletingParam(null)}
                isDestructive
            />
        </div>
    )
}
