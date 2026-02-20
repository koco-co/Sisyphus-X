/**
 * 关键字配置页面 - 重新设计
 *
 * 功能：
 * - Tab 切换（自定义关键字 | 内置关键字）
 * - 统一工具栏（项目选择、类型筛选、搜索）
 * - 分页 Table 展示
 * - 创建/编辑/查看/删除/启用/禁用关键字
 * - Monaco Editor 代码查看/编辑
 * - 内置关键字只读模式（代码回显展示）
 */

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { keywordsApi, projectsApi } from '@/api/client'
import {
  Plus,
  Search,
  Code,
  FileCode,
  Power,
  PowerOff,
  Edit,
  Trash2,
  Copy,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Info,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { MonacoEditor } from '@/components/ui/MonacoEditor'
import { Input } from '@/components/ui/input'

// ===== 类型定义 =====
interface Keyword {
  id: string
  project_id: string | null
  name: string
  class_name: string
  method_name: string
  description: string | null
  code: string
  parameters: string | null
  return_type: string | null
  is_built_in: boolean
  is_enabled: boolean
  created_at: string
  updated_at: string
}

interface Project {
  id: string
  name: string
  key: string
  description?: string
}

interface ParamItem {
  name: string
  type: string
  description: string
  required: boolean
}

// ===== 关键字类型映射 =====
const TYPE_OPTIONS = [
  { value: 'all', label: '全部类型', icon: '🏷️' },
  { value: 'request', label: '发送请求', icon: '🌐' },
  { value: 'assertion', label: '断言类型', icon: '✅' },
  { value: 'extract', label: '提取变量', icon: '📤' },
  { value: 'database', label: '数据库操作', icon: '🗄️' },
  { value: 'custom', label: '自定义操作', icon: '⚙️' },
]

const CLASS_NAME_MAP: Record<string, { label: string; icon: string; color: string }> = {
  request: { label: '发送请求', icon: '🌐', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  assertion: { label: '断言类型', icon: '✅', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  extract: { label: '提取变量', icon: '📤', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  database: { label: '数据库操作', icon: '🗄️', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  custom: { label: '自定义操作', icon: '⚙️', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
}

// ===== 主组件 =====
export default function KeywordManagement() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // Tab 状态
  const [activeTab, setActiveTab] = useState<'custom' | 'builtin'>('custom')
  // 工具栏筛选
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedType, setSelectedType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  // 分页
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // 弹窗状态
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null)

  // ===== 数据获取 =====
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectsApi.list({ page: 1, size: 100 })
      return response.data
    },
  })

  const getQueryParams = useCallback(() => {
    const params: any = { page: currentPage, size: pageSize }
    if (activeTab === 'custom') {
      if (selectedProjectId) params.project_id = selectedProjectId
      params.is_builtin = false
    } else {
      params.is_builtin = true
    }
    if (selectedType && selectedType !== 'all') params.type = selectedType
    if (searchTerm) params.search = searchTerm
    return params
  }, [activeTab, selectedProjectId, selectedType, searchTerm, currentPage])

  const { data: keywordsData, isLoading: keywordsLoading } = useQuery({
    queryKey: ['keywords', activeTab, selectedProjectId, selectedType, searchTerm, currentPage],
    queryFn: async () => {
      const response = await keywordsApi.list(getQueryParams())
      return response.data
    },
  })

  const keywords: Keyword[] = keywordsData?.items || []
  const totalPages = keywordsData?.pages || 1
  const totalItems = keywordsData?.total || 0
  const projects: Project[] = projectsData?.items || []

  // ===== Mutations =====
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        id: crypto.randomUUID(),
        project_id: selectedProjectId || null,
        name: data.name,
        class_name: data.class_name,
        method_name: data.method_name,
        description: data.description || null,
        code: data.code || '',
        parameters: data.parameters ? JSON.stringify(data.parameters) : null,
        is_built_in: false,
        is_enabled: true,
      }
      await keywordsApi.create(payload)
    },
    onSuccess: () => {
      toast.success('添加成功')
      setIsCreateDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await keywordsApi.update(id, data)
    },
    onSuccess: () => {
      toast.success('编辑成功')
      setIsEditDialogOpen(false)
      setSelectedKeyword(null)
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '更新失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await keywordsApi.delete(id)
    },
    onSuccess: () => {
      toast.success('删除成功')
      setIsDeleteConfirmOpen(false)
      setSelectedKeyword(null)
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '删除失败')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      await keywordsApi.toggle(id)
    },
    onSuccess: () => {
      toast.success('状态更新成功')
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '状态更新失败')
    },
  })

  // ===== 事件处理 =====
  const handleTabChange = (tab: 'custom' | 'builtin') => {
    setActiveTab(tab)
    setCurrentPage(1)
    if (tab === 'builtin') setSelectedProjectId('')
  }

  const handleCopyMethodName = (methodName: string) => {
    navigator.clipboard.writeText(methodName)
    toast.success('方法名已复制到剪贴板')
  }

  const handleViewKeyword = (keyword: Keyword) => {
    setSelectedKeyword(keyword)
    setIsViewDialogOpen(true)
  }

  const handleEditKeyword = (keyword: Keyword) => {
    setSelectedKeyword(keyword)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (keyword: Keyword) => {
    setSelectedKeyword(keyword)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (selectedKeyword) {
      deleteMutation.mutate(selectedKeyword.id)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getClassNameBadge = (className: string) => {
    const info = CLASS_NAME_MAP[className]
    if (!info) return { label: className, icon: '📦', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
    return info
  }

  const parseParameters = (params: string | null): ParamItem[] => {
    if (!params) return []
    try {
      const parsed = JSON.parse(params)
      if (Array.isArray(parsed)) return parsed
      // 兼容旧格式: object形式
      return Object.entries(parsed).map(([key, val]: [string, any]) => ({
        name: val.name || key,
        type: val.type || 'string',
        description: val.description || '',
        required: val.required || false,
      }))
    } catch {
      return []
    }
  }

  return (
    <div className="p-8 space-y-6" data-testid="keywords-page">
      {/* ===== 页面标题 ===== */}
      <motion.header
        className="flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {t('keywords.title')}
          </h1>
          <p className="text-slate-400 mt-2">配置可扩展的关键字函数, 在场景编排中通过下拉框引用</p>
        </div>

        {activeTab === 'custom' && (
          <motion.button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-3 rounded-2xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="create-keyword-button"
          >
            <Plus className="w-5 h-5" />
            {t('keywords.newKeyword')}
          </motion.button>
        )}
      </motion.header>

      {/* ===== Tab 切换 ===== */}
      <motion.div
        className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl w-fit backdrop-blur"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <button
          onClick={() => handleTabChange('custom')}
          className={cn(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-medium transition-all",
            activeTab === 'custom'
              ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 shadow-inner"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
          data-testid="tab-custom"
        >
          <Code className="w-4 h-4" />
          自定义关键字
        </button>
        <button
          onClick={() => handleTabChange('builtin')}
          className={cn(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-medium transition-all",
            activeTab === 'builtin'
              ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 shadow-inner"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
          data-testid="tab-builtin"
        >
          <FileCode className="w-4 h-4" />
          内置关键字
        </button>
      </motion.div>

      {/* ===== 工具栏 ===== */}
      <motion.div
        className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 backdrop-blur"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-wrap gap-4 items-center">
          {/* 项目选择器(仅自定义Tab) */}
          {activeTab === 'custom' && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-400 whitespace-nowrap">项目</label>
              {projectsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span className="text-sm text-slate-500">加载中...</span>
                </div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => { setSelectedProjectId(e.target.value); setCurrentPage(1) }}
                  className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  data-testid="project-select"
                >
                  <option value="" className="bg-slate-900">全部项目</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 类型筛选 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-400 whitespace-nowrap">类型</label>
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1) }}
              className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              data-testid="type-select"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 搜索 */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              placeholder="搜索关键字名称或方法名..."
              className="w-full h-9 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              data-testid="keyword-search-input"
            />
          </div>
        </div>
      </motion.div>

      {/* ===== 列表区域 ===== */}
      <motion.div
        className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {keywordsLoading ? (
          <div className="flex justify-center items-center py-20 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            加载中...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">名称</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">方法名</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">关键字类型</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">类别</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">启用状态</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">更新时间</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {keywords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
                            <Code className="w-8 h-8 opacity-50" />
                          </div>
                          <p className="text-lg font-medium mb-1">暂无关键字</p>
                          <p className="text-sm">
                            {activeTab === 'custom' ? '点击「新建关键字」开始创建' : '内置关键字将在系统初始化时自动生成'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence>
                      {keywords.map((keyword, index) => {
                        const typeInfo = getClassNameBadge(keyword.class_name)
                        return (
                          <motion.tr
                            key={keyword.id}
                            className="hover:bg-white/[0.03] transition-colors group"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            {/* 名称 */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-white font-medium text-sm">{keyword.name}</span>
                                {keyword.description && (
                                  <span className="text-slate-500 text-xs mt-0.5 truncate max-w-xs">
                                    {keyword.description}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 方法名 */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <code className="text-cyan-400 font-mono text-xs bg-cyan-500/5 px-2 py-0.5 rounded-md">
                                  {keyword.method_name}
                                </code>
                                <button
                                  onClick={() => handleCopyMethodName(keyword.method_name)}
                                  className="p-0.5 text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                  title="复制方法名"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* 关键字类型 */}
                            <td className="px-6 py-4">
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
                                typeInfo.color
                              )}>
                                <span>{typeInfo.icon}</span>
                                {typeInfo.label}
                              </span>
                            </td>

                            {/* 类别 */}
                            <td className="px-6 py-4">
                              <Badge variant={keyword.is_built_in ? 'secondary' : 'default'} className="text-xs">
                                {keyword.is_built_in ? '内置' : '自定义'}
                              </Badge>
                            </td>

                            {/* 启用状态 */}
                            <td className="px-6 py-4">
                              <button
                                onClick={() => toggleMutation.mutate(keyword.id)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                  keyword.is_enabled
                                    ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                    : "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20"
                                )}
                              >
                                {keyword.is_enabled ? (
                                  <><Power className="w-3 h-3" /> 已启用</>
                                ) : (
                                  <><PowerOff className="w-3 h-3" /> 已禁用</>
                                )}
                              </button>
                            </td>

                            {/* 更新时间 */}
                            <td className="px-6 py-4">
                              <span className="text-slate-500 text-xs">{formatDate(keyword.updated_at)}</span>
                            </td>

                            {/* 操作 */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1 justify-end">
                                {/* 查看代码(内置关键字) */}
                                {keyword.is_built_in && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewKeyword(keyword)}
                                    className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-8 w-8 p-0"
                                    title="查看代码"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                )}

                                {/* 编辑(自定义关键字) */}
                                {!keyword.is_built_in && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditKeyword(keyword)}
                                    className="text-slate-400 hover:text-white hover:bg-white/5 h-8 w-8 p-0"
                                    title="编辑"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}

                                {/* 删除(自定义关键字) */}
                                {!keyword.is_built_in && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(keyword)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                                    title="删除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>

            {/* ===== 分页 ===== */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-slate-800/30">
                <span className="text-xs text-slate-500">
                  共 {totalItems} 条记录，第 {currentPage} / {totalPages} 页
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="text-slate-400 hover:text-white h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number
                    if (totalPages <= 5) {
                      page = i + 1
                    } else if (currentPage <= 3) {
                      page = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i
                    } else {
                      page = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={page}
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "h-8 w-8 p-0 text-xs",
                          page === currentPage
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        {page}
                      </Button>
                    )
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="text-slate-400 hover:text-white h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ===== 新建关键字弹窗 ===== */}
      <KeywordFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="新建关键字"
        onSubmit={(data) => createMutation.mutateAsync(data)}
        isSaving={createMutation.isPending}
      />

      {/* ===== 编辑关键字弹窗 ===== */}
      {selectedKeyword && !selectedKeyword.is_built_in && (
        <KeywordFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          title="编辑关键字"
          initialData={selectedKeyword}
          onSubmit={(data) => updateMutation.mutateAsync({ id: selectedKeyword.id, data })}
          isSaving={updateMutation.isPending}
        />
      )}

      {/* ===== 查看内置关键字弹窗 ===== */}
      {selectedKeyword && selectedKeyword.is_built_in && (
        <KeywordViewDialog
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          keyword={selectedKeyword}
          parseParameters={parseParameters}
          getClassNameBadge={getClassNameBadge}
        />
      )}

      {/* ===== 删除确认弹窗 ===== */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">确认删除</DialogTitle>
            <DialogDescription className="text-slate-400">
              确定要删除关键字「<span className="text-cyan-400 font-medium">{selectedKeyword?.name}</span>」吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="text-slate-400"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 删除中...</>
              ) : (
                '确认删除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


// ===== 新建/编辑关键字表单弹窗 =====
interface KeywordFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initialData?: Keyword
  onSubmit: (data: any) => Promise<void>
  isSaving: boolean
}

function KeywordFormDialog({
  open,
  onOpenChange,
  title,
  initialData,
  onSubmit,
  isSaving,
}: KeywordFormDialogProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    class_name: initialData?.class_name || 'custom',
    method_name: initialData?.method_name || '',
    description: initialData?.description || '',
    code: initialData?.code || `def custom_keyword():\n    """自定义关键字"""\n    # 在这里实现你的逻辑\n    pass\n`,
    parameters: initialData?.parameters ? (() => {
      try { return JSON.parse(initialData.parameters!) } catch { return [] }
    })() : [] as ParamItem[],
  })

  // 入参释义
  const [params, setParams] = useState<ParamItem[]>(
    (() => {
      if (!initialData?.parameters) return []
      try {
        const parsed = JSON.parse(initialData.parameters)
        if (Array.isArray(parsed)) return parsed
        return Object.entries(parsed).map(([key, val]: [string, any]) => ({
          name: val.name || key,
          type: val.type || 'string',
          description: val.description || '',
          required: val.required || false,
        }))
      } catch { return [] }
    })()
  )

  const addParam = () => {
    setParams([...params, { name: '', type: 'string', description: '', required: false }])
  }

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index))
  }

  const updateParam = (index: number, field: keyof ParamItem, value: any) => {
    const newParams = [...params]
    newParams[index] = { ...newParams[index], [field]: value }
    setParams(newParams)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.method_name) {
      toast.error('关键字名称和方法名不能为空')
      return
    }
    await onSubmit({
      name: formData.name,
      class_name: formData.class_name,
      method_name: formData.method_name,
      description: formData.description,
      code: formData.code,
      parameters: params.length > 0 ? params : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                关键字类型 <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.class_name}
                onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
              >
                {TYPE_OPTIONS.filter(o => o.value !== 'all').map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900">
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                名称 <span className="text-red-400">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="关键字名称"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                方法名 <span className="text-red-400">*</span>
              </label>
              <Input
                value={formData.method_name}
                onChange={(e) => setFormData({ ...formData, method_name: e.target.value })}
                placeholder="例如: send_http_request"
                className="bg-white/5 border-white/10 text-white font-mono text-sm placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">描述</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="描述信息"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* 代码块 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              代码块 <span className="text-red-400">*</span>
            </label>
            <div className="h-[320px] border border-white/10 rounded-xl overflow-hidden">
              <MonacoEditor
                value={formData.code}
                onChange={(value) => setFormData({ ...formData, code: value })}
                language="python"
                height="100%"
              />
            </div>
          </div>

          {/* 入参释义 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">入参释义</label>
              <Button
                variant="outline"
                size="sm"
                onClick={addParam}
                className="bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs h-7"
              >
                <Plus className="w-3 h-3 mr-1" /> 添加参数
              </Button>
            </div>

            {params.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-xl text-slate-500 text-sm">
                暂无参数, 点击「添加参数」定义入参
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_100px_2fr_60px_40px] gap-2 px-2 text-xs text-slate-500 font-medium">
                  <span>参数名</span>
                  <span>类型</span>
                  <span>描述</span>
                  <span>必填</span>
                  <span></span>
                </div>
                {params.map((param, index) => (
                  <div key={index} className="grid grid-cols-[1fr_100px_2fr_60px_40px] gap-2 items-center">
                    <Input
                      value={param.name}
                      onChange={(e) => updateParam(index, 'name', e.target.value)}
                      placeholder="参数名"
                      className="bg-white/5 border-white/10 text-white text-sm h-8"
                    />
                    <select
                      value={param.type}
                      onChange={(e) => updateParam(index, 'type', e.target.value)}
                      className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white focus:outline-none"
                    >
                      {['string', 'int', 'float', 'bool', 'list', 'dict', 'any'].map(t => (
                        <option key={t} value={t} className="bg-slate-900">{t}</option>
                      ))}
                    </select>
                    <Input
                      value={param.description}
                      onChange={(e) => updateParam(index, 'description', e.target.value)}
                      placeholder="参数描述"
                      className="bg-white/5 border-white/10 text-white text-sm h-8"
                    />
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => updateParam(index, 'required', e.target.checked)}
                        className="w-4 h-4 accent-cyan-500"
                      />
                    </div>
                    <button
                      onClick={() => removeParam(index)}
                      className="flex justify-center text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !formData.name || !formData.method_name}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 保存中...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> 保存</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== 内置关键字查看弹窗（只读） =====
interface KeywordViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  keyword: Keyword
  parseParameters: (params: string | null) => ParamItem[]
  getClassNameBadge: (className: string) => { label: string; icon: string; color: string }
}

function KeywordViewDialog({
  open,
  onOpenChange,
  keyword,
  parseParameters,
  getClassNameBadge,
}: KeywordViewDialogProps) {
  const params = parseParameters(keyword.parameters)
  const typeInfo = getClassNameBadge(keyword.class_name)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-3">
            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm border", typeInfo.color)}>
              {typeInfo.icon} {typeInfo.label}
            </span>
            {keyword.name}
            <Badge variant="secondary" className="text-xs">内置关键字</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* 基本信息 */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400">内置关键字不可编辑和删除, 代码仅作参考</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
              <div>
                <span className="text-slate-500">方法名：</span>
                <code className="text-cyan-400 font-mono">{keyword.method_name}</code>
              </div>
              <div>
                <span className="text-slate-500">类名：</span>
                <code className="text-slate-300 font-mono">{keyword.class_name}</code>
              </div>
              <div>
                <span className="text-slate-500">状态：</span>
                <span className={keyword.is_enabled ? "text-emerald-400" : "text-slate-500"}>
                  {keyword.is_enabled ? '已启用' : '已禁用'}
                </span>
              </div>
            </div>
            {keyword.description && (
              <p className="text-sm text-slate-400 mt-2">{keyword.description}</p>
            )}
          </div>

          {/* 入参释义 */}
          {params.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">入参释义</h3>
              <div className="bg-slate-800/30 rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-slate-500 font-medium">参数名</th>
                      <th className="px-4 py-2 text-left text-xs text-slate-500 font-medium">类型</th>
                      <th className="px-4 py-2 text-left text-xs text-slate-500 font-medium">必填</th>
                      <th className="px-4 py-2 text-left text-xs text-slate-500 font-medium">描述</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {params.map((param, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2">
                          <code className="text-cyan-400 font-mono text-xs">{param.name}</code>
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant="secondary" className="text-xs">{param.type}</Badge>
                        </td>
                        <td className="px-4 py-2">
                          {param.required ? (
                            <span className="text-red-400 text-xs">必填</span>
                          ) : (
                            <span className="text-slate-500 text-xs">选填</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-400 text-xs">{param.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 代码块(只读) */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">代码参考</h3>
            <div className="h-[400px] border border-white/10 rounded-xl overflow-hidden">
              <MonacoEditor
                value={keyword.code}
                language="python"
                height="100%"
                readOnly={true}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400"
          >
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
