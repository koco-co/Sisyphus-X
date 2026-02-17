/**
 * 关键字配置页面
 *
 * 功能：
 * - 按项目筛选关键字
 * - 区分内置和自定义关键字
 * - 创建/编辑/删除自定义关键字
 * - 启用/禁用关键字
 * - Monaco Editor 代码编辑
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { keywordsApi, projectsApi } from '@/api/client'
import { KeywordList } from '@/components/keyword/KeywordList'
import { KeywordEditor } from '@/components/keyword/KeywordEditor'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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

export default function KeywordsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 状态管理
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null)

  // 获取项目列表
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectsApi.list({ page: 1, size: 100 })
      return response.data
    },
  })

  // 获取关键字列表
  const {
    data: keywordsData,
    isLoading: keywordsLoading,
    refetch: refetchKeywords,
  } = useQuery({
    queryKey: ['keywords', selectedProjectId],
    queryFn: async () => {
      const params: any = { page: 1, size: 100 }
      if (selectedProjectId) {
        params.project_id = selectedProjectId
      }
      const response = await keywordsApi.list(params)
      return response.data
    },
    enabled: !!selectedProjectId || !selectedProjectId, // 允许获取所有关键字
  })

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
      toast.success('关键字创建成功')
      setIsCreateDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '创建失败')
    },
  })

  // 更新关键字
  const updateKeywordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await keywordsApi.update(id, data)
    },
    onSuccess: () => {
      toast.success('关键字更新成功')
      setIsEditDialogOpen(false)
      setSelectedKeyword(null)
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '更新失败')
    },
  })

  // 删除关键字
  const deleteKeywordMutation = useMutation({
    mutationFn: async (id: string) => {
      await keywordsApi.delete(id)
    },
    onSuccess: () => {
      toast.success('关键字删除成功')
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '删除失败')
    },
  })

  // 切换启用状态
  const toggleKeywordMutation = useMutation({
    mutationFn: async (id: string) => {
      await keywordsApi.toggle(id)
    },
    onSuccess: () => {
      toast.success('状态更新成功')
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '状态更新失败')
    },
  })

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
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个关键字吗？')) return
    await deleteKeywordMutation.mutateAsync(id)
  }

  // 处理切换状态
  const handleToggle = async (id: string) => {
    await toggleKeywordMutation.mutateAsync(id)
  }

  // 转换关键字数据格式
  const keywords: Keyword[] = keywordsData?.items || []

  // 过滤出可编辑的关键字（非内置）
  const editableKeywords = keywords.filter(kw => !kw.is_built_in)

  return (
    <div className="keywords-page container mx-auto py-6 space-y-6" data-testid="keywords-page">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">关键字配置</h1>
            <p className="text-sm text-gray-500 mt-1">
              管理项目关键字（内置关键字不可编辑）
            </p>
          </div>
        </div>
      </div>

      {/* 项目选择 */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium whitespace-nowrap">选择项目：</label>
          {projectsLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-500">加载项目中...</span>
            </div>
          ) : (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-[300px] h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-testid="project-select"
            >
              <option value="">请选择项目</option>
              {projectsData?.items?.map((project: Project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </Card>

      {/* 关键字列表 */}
      {keywordsLoading ? (
        <Card className="p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin mb-4" />
          <p className="text-gray-500">加载关键字中...</p>
        </Card>
      ) : (
        <KeywordList
          keywords={editableKeywords.map(kw => ({
            id: kw.id,
            name: kw.name,
            func_name: kw.method_name,
            category: kw.class_name,
            description: kw.description || undefined,
            is_active: kw.is_enabled,
            created_at: kw.created_at,
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          onCreateNew={() => setIsCreateDialogOpen(true)}
        />
      )}

      {/* 创建关键字对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="create-keyword-dialog">
          <DialogHeader>
            <DialogTitle>创建自定义关键字</DialogTitle>
          </DialogHeader>
          <KeywordEditor onSave={handleCreate} />
        </DialogContent>
      </Dialog>

      {/* 编辑关键字对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="edit-keyword-dialog">
          <DialogHeader>
            <DialogTitle>编辑关键字</DialogTitle>
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
