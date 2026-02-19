/**
 * 关键字配置页面（重构版）
 *
 * 功能：
 * - Tabs 切换（自定义关键字 | 内置关键字）
 * - 统一工具栏（项目选择、类型筛选、搜索）
 * - Table 展示（替代 Card 列表）
 * - 创建/编辑/删除/启用/禁用关键字
 * - Monaco Editor 代码编辑
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Key } from 'lucide-react'
import { toast } from 'sonner'
import { keywordsApi, projectsApi } from '@/api/client'
import { KeywordEditor } from '@/components/keyword/KeywordEditor'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
// 新组件
import { PageHeader } from './components/PageHeader'
import { KeywordTabs } from './components/KeywordTabs'
import type { TabType } from './components/KeywordTabs'
import { KeywordToolbar } from './components/KeywordToolbar'
import { KeywordTable } from './components/KeywordTable'
import type { Keyword, Project } from './types'

export default function KeywordManagement() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // ===== 状态管理 =====
  const [activeTab, setActiveTab] = useState<TabType>('custom')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedType, setSelectedType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showBuiltIn, setShowBuiltIn] = useState(false)

  // 对话框状态
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null)

  // ===== 数据获取 =====
  // 获取项目列表
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectsApi.list({ page: 1, size: 100 })
      return response.data
    },
  })

  // 构建查询参数
  const getQueryParams = () => {
    const params: any = { page: 1, size: 100 }

    if (activeTab === 'custom') {
      // 自定义关键字：需要项目ID，且非内置
      if (selectedProjectId) {
        params.project_id = selectedProjectId
      }
      params.is_builtin = false
    } else {
      // 内置关键字
      params.is_builtin = true
    }

    // 类型筛选
    if (selectedType && selectedType !== 'all') {
      params.type = selectedType
    }

    // 搜索
    if (searchTerm) {
      params.search = searchTerm
    }

    // 显示内置关键字（在自定义Tab中）
    if (activeTab === 'custom' && showBuiltIn) {
      delete params.is_builtin
    }

    return params
  }

  // 获取关键字列表
  const {
    data: keywordsData,
    isLoading: keywordsLoading,
    refetch,
  } = useQuery({
    queryKey: ['keywords', activeTab, selectedProjectId, selectedType, searchTerm, showBuiltIn],
    queryFn: async () => {
      const response = await keywordsApi.list(getQueryParams())
      return response.data
    },
    enabled: true,
  })

  // ===== Mutations =====
  // 创建关键字
  const createKeywordMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        id: crypto.randomUUID(),
        project_id: selectedProjectId || null,
        is_built_in: false,
        is_enabled: true,
      }
      await keywordsApi.create(payload)
    },
    onSuccess: () => {
      toast.success(t('keywords.createSuccess'))
      setIsCreateDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('keywords.createFailed'))
    },
  })

  // 更新关键字
  const updateKeywordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await keywordsApi.update(id, data)
    },
    onSuccess: () => {
      toast.success(t('keywords.updateSuccess'))
      setIsEditDialogOpen(false)
      setSelectedKeyword(null)
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('keywords.updateFailed'))
    },
  })

  // 删除关键字
  const deleteKeywordMutation = useMutation({
    mutationFn: async (keyword: Keyword) => {
      await keywordsApi.delete(keyword.id)
    },
    onSuccess: () => {
      toast.success(t('keywords.deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('keywords.deleteFailed'))
    },
  })

  // 切换启用状态
  const toggleKeywordMutation = useMutation({
    mutationFn: async (id: string) => {
      await keywordsApi.toggle(id)
    },
    onSuccess: () => {
      toast.success(t('keywords.toggleSuccess'))
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('keywords.toggleFailed'))
    },
  })

  // ===== 事件处理 =====
  // 处理创建
  const handleCreate = async (data: any) => {
    await createKeywordMutation.mutateAsync(data)
  }

  // 处理编辑
  const handleEdit = (keyword: Keyword) => {
    setSelectedKeyword(keyword)
    setIsEditDialogOpen(true)
  }

  // 处理更新
  const handleUpdate = async (data: any) => {
    if (!selectedKeyword) return
    await updateKeywordMutation.mutateAsync({
      id: selectedKeyword.id,
      data,
    })
  }

  // 处理删除
  const handleDelete = (keyword: Keyword) => {
    if (!confirm(t('keywords.confirmDelete'))) return
    deleteKeywordMutation.mutate(keyword)
  }

  // 处理切换状态
  const handleToggle = (id: string) => {
    toggleKeywordMutation.mutate(id)
  }

  // 复制方法名
  const handleCopyMethodName = (methodName: string) => {
    navigator.clipboard.writeText(methodName)
    toast.success('方法名已复制到剪贴板')
  }

  // Tab 切换时重置筛选条件
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    if (tab === 'builtin') {
      // 切换到内置关键字时，清空项目选择
      setSelectedProjectId('')
    }
  }

  // ===== 数据转换 =====
  const keywords: Keyword[] = keywordsData?.items || []
  const projects: Project[] = projectsData?.items || []

  return (
    <div className="p-8 space-y-8" data-testid="keywords-page">
      {/* 1. 页面标题 */}
      <PageHeader
        title={t('keywords.title')}
        description="管理项目的自定义关键字和内置关键字"
        onCreateClick={() => setIsCreateDialogOpen(true)}
        createButtonText={t('keywords.newKeyword')}
      />

      {/* 2. Tabs 切换 */}
      <KeywordTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* 3. 工具栏 */}
      <KeywordToolbar
        projects={projects}
        selectedProject={selectedProjectId || null}
        onProjectChange={(projectId) => setSelectedProjectId(projectId || '')}
        projectsLoading={projectsLoading}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showBuiltIn={showBuiltIn}
        onToggleBuiltIn={() => setShowBuiltIn(!showBuiltIn)}
      />

      {/* 4. Table 列表 */}
      <KeywordTable
        keywords={keywords}
        isLoading={keywordsLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggle}
        onCopyMethodName={handleCopyMethodName}
      />

      {/* 5. 创建关键字对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10" data-testid="create-keyword-dialog">
          <DialogHeader>
            <DialogTitle className="text-white">{t('keywords.newKeyword')}</DialogTitle>
          </DialogHeader>
          <KeywordEditor onSave={handleCreate} />
        </DialogContent>
      </Dialog>

      {/* 6. 编辑关键字对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10" data-testid="edit-keyword-dialog">
          <DialogHeader>
            <DialogTitle className="text-white">{t('keywords.edit')}</DialogTitle>
          </DialogHeader>
          {selectedKeyword && (
            <KeywordEditor
              initialData={{
                name: selectedKeyword.name,
                func_name: selectedKeyword.method_name,
                category: selectedKeyword.class_name,
                description: selectedKeyword.description || undefined,
                function_code: selectedKeyword.code,
                params_schema: selectedKeyword.parameters
                  ? JSON.parse(selectedKeyword.parameters)
                  : undefined,
              }}
              onSave={handleUpdate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
