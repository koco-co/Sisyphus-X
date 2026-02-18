import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Loader2, Copy, ArrowLeft, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { projectsApi } from '@/api/client'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/common/EmptyState'

interface Environment {
  id: number
  name: string
  domain: string
  variables: Record<string, string>
  headers: Record<string, string>
  created_at: string
  updated_at: string
}

interface KeyValuePair {
  key: string
  value: string
}

// 辅助函数：在组件外部定义
const objectToKeyValuePairs = (obj: Record<string, string>): KeyValuePair[] => {
  return Object.entries(obj || {}).map(([key, value]) => ({ key, value }))
}

const keyValuePairsToObject = (pairs: KeyValuePair[]): Record<string, string> => {
  return pairs
    .filter((p) => p.key.trim())
    .reduce((acc, { key, value }) => {
      acc[key] = value
      return acc
    }, {} as Record<string, string>)
}

export default function EnvironmentList() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { success, error: showError } = useToast()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [environmentToDelete, setEnvironmentToDelete] = useState<Environment | null>(null)

  // 获取环境列表
  const { data: environments = [], isLoading } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: async () => {
      const response = await projectsApi.listEnvironments(Number(projectId))
      return response.data
    },
    enabled: !!projectId,
  })

  // 创建环境
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Environment, 'id' | 'created_at' | 'updated_at'>) => {
      await projectsApi.createEnvironment(Number(projectId), data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
      setIsCreateDialogOpen(false)
      success('环境创建成功')
    },
    onError: (err: any) => {
      showError(err.response?.data?.detail || '创建环境失败')
    },
  })

  // 更新环境
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Environment> }) => {
      await projectsApi.updateEnvironment(Number(projectId), id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
      setIsEditDialogOpen(false)
      setEditingEnvironment(null)
      success('环境更新成功')
    },
    onError: (err: any) => {
      showError(err.response?.data?.detail || '更新环境失败')
    },
  })

  // 删除环境
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await projectsApi.deleteEnvironment(Number(projectId), id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
      setIsDeleteDialogOpen(false)
      setEnvironmentToDelete(null)
      success('环境删除成功')
    },
    onError: (err: any) => {
      showError(err.response?.data?.detail || '删除环境失败')
    },
  })

  // 克隆环境
  const cloneMutation = useMutation({
    mutationFn: async (id: number) => {
      await projectsApi.cloneEnvironment(Number(projectId), id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
      success('环境克隆成功')
    },
    onError: (err: any) => {
      showError(err.response?.data?.detail || '克隆环境失败')
    },
  })

  const handleDelete = (env: Environment) => {
    setEnvironmentToDelete(env)
    setIsDeleteDialogOpen(true)
  }

  const handleEdit = (env: Environment) => {
    setEditingEnvironment(env)
    setIsEditDialogOpen(true)
  }

  const handleClone = (env: Environment) => {
    cloneMutation.mutate(env.id)
  }

  const confirmDelete = () => {
    if (environmentToDelete) {
      deleteMutation.mutate(environmentToDelete.id)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题和返回按钮 */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/api/projects')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回项目列表
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">环境配置管理</h1>
            <p className="text-slate-400 mt-1">管理测试环境配置，包括域名、环境变量和公共 Headers</p>
          </div>
        </div>

        {/* 操作栏 */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-slate-500 text-sm">
            项目 ID: {projectId} · 共 {environments.length} 个环境
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
            data-testid="create-environment-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建环境
          </Button>
        </div>

        {/* 环境列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : environments.length === 0 ? (
          <EmptyState
            icon={<Globe className="w-12 h-12" />}
            title="暂无环境配置"
            description="点击上方「创建环境」按钮创建第一个环境"
            action={{
              label: '创建环境',
              onClick: () => setIsCreateDialogOpen(true),
            }}
          />
        ) : (
          <div className="grid gap-4">
            {environments.map((env: Environment) => (
              <div
                key={env.id}
                data-testid={`environment-card-${env.id}`}
                className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-cyan-500/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-white">{env.name}</h3>
                      {env.domain && (
                        <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded border border-cyan-500/20">
                          {env.domain}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-24">域名:</span>
                        <code className="text-cyan-400 bg-slate-800 px-2 py-1 rounded font-mono text-xs">
                          {env.domain || '未设置'}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-24">环境变量:</span>
                        <span className="text-slate-400">
                          {Object.keys(env.variables || {}).length} 个
                        </span>
                        {Object.keys(env.variables || {}).length > 0 && (
                          <span className="text-slate-500 text-xs">
                            ({Object.entries(env.variables || {}).map(([k]) => k).join(', ')})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-24">公共 Headers:</span>
                        <span className="text-slate-400">
                          {Object.keys(env.headers || {}).length} 个
                        </span>
                        {Object.keys(env.headers || {}).length > 0 && (
                          <span className="text-slate-500 text-xs">
                            ({Object.entries(env.headers || {}).map(([k]) => k).join(', ')})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-24">创建时间:</span>
                        <span className="text-slate-500 text-xs">
                          {new Date(env.created_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClone(env)}
                      disabled={cloneMutation.isPending}
                      className="text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                      title="克隆环境"
                      data-testid={`clone-environment-button-${env.id}`}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(env)}
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                      title="编辑环境"
                      data-testid={`edit-environment-button-${env.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(env)}
                      className="text-red-400 hover:text-red-300 hover:bg-slate-800"
                      title="删除环境"
                      data-testid={`delete-environment-button-${env.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* 创建环境对话框 */}
        <EnvironmentDialog
          open={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSave={(data) => createMutation.mutate(data)}
          mode="create"
          isLoading={createMutation.isPending}
        />

        {/* 编辑环境对话框 */}
        <EnvironmentDialog
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false)
            setEditingEnvironment(null)
          }}
          onSave={(data) =>
            editingEnvironment &&
            updateMutation.mutate({ id: editingEnvironment.id, data })
          }
          environment={editingEnvironment || undefined}
          mode="edit"
          isLoading={updateMutation.isPending}
        />

        {/* 删除确认对话框 */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false)
            setEnvironmentToDelete(null)
          }}
          onConfirm={confirmDelete}
          title="确认删除环境"
          description={`确定要删除环境 "${environmentToDelete?.name}" 吗？此操作不可撤销。`}
          confirmText="删除"
          cancelText="取消"
          isDestructive
        />
      </div>
    </div>
  )
}

interface EnvironmentDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Environment, 'id' | 'created_at' | 'updated_at'>) => void
  environment?: Environment
  mode: 'create' | 'edit'
  isLoading?: boolean
}

function EnvironmentDialog({
  open,
  onClose,
  onSave,
  environment,
  mode,
  isLoading = false,
}: EnvironmentDialogProps) {
  const [formData, setFormData] = useState<{
    name: string
    domain: string
  }>({
    name: '',
    domain: '',
  })
  const [variables, setVariables] = useState<KeyValuePair[]>([])
  const [headers, setHeaders] = useState<KeyValuePair[]>([])
  const [errors, setErrors] = useState<{ name?: string; domain?: string }>({})

  // 当对话框打开时初始化表单数据
  const resetForm = () => {
    setFormData({ name: '', domain: '' })
    setVariables([])
    setHeaders([])
    setErrors({})
  }

  const initForm = (env: Environment) => {
    setFormData({
      name: env.name,
      domain: env.domain,
    })
    setVariables(objectToKeyValuePairs(env.variables))
    setHeaders(objectToKeyValuePairs(env.headers))
    setErrors({})
  }

  // 使用 useEffect 来处理对话框打开时的初始化
  if (open && environment && mode === 'edit' && formData.name !== environment.name) {
    initForm(environment)
  } else if (open && !environment && mode === 'create' && formData.name !== '') {
    // 延迟重置以避免渲染时重置
    setTimeout(resetForm, 0)
  }

  const validateForm = (): boolean => {
    const newErrors: { name?: string; domain?: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = '环境名称不能为空'
    } else if (formData.name.length > 50) {
      newErrors.name = '环境名称不能超过50个字符'
    }

    if (formData.domain && formData.domain.length > 200) {
      newErrors.domain = '域名不能超过200个字符'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) {
      return
    }

    onSave({
      name: formData.name.trim(),
      domain: formData.domain.trim(),
      variables: keyValuePairsToObject(variables),
      headers: keyValuePairsToObject(headers),
    })
  }

  const addVariable = () => setVariables([...variables, { key: '', value: '' }])
  const removeVariable = (index: number) =>
    setVariables(variables.filter((_, i) => i !== index))
  const updateVariable = (index: number, field: 'key' | 'value', value: string) => {
    const newVariables = [...variables]
    newVariables[index][field] = value
    setVariables(newVariables)
  }

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }])
  const removeHeader = (index: number) =>
    setHeaders(headers.filter((_, i) => i !== index))
  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers]
    newHeaders[index][field] = value
    setHeaders(newHeaders)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '创建环境' : '编辑环境'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-slate-300">
                环境名称 <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  setErrors({ ...errors, name: undefined })
                }}
                placeholder="例如：开发环境、测试环境、生产环境"
                className={`bg-slate-800 border-slate-700 mt-1.5 ${
                  errors.name ? 'border-red-500' : ''
                }`}
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="domain" className="text-slate-300">
                域名 URL
              </Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => {
                  setFormData({ ...formData, domain: e.target.value })
                  setErrors({ ...errors, domain: undefined })
                }}
                placeholder="https://api-dev.example.com"
                className={`bg-slate-800 border-slate-700 font-mono mt-1.5 ${
                  errors.domain ? 'border-red-500' : ''
                }`}
              />
              {errors.domain && (
                <p className="text-red-400 text-xs mt-1">{errors.domain}</p>
              )}
              <p className="text-slate-500 text-xs mt-1">
                该环境的默认域名前缀，可用于接口测试
              </p>
            </div>
          </div>

          {/* 环境变量 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">环境变量</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addVariable}
                className="text-cyan-400 hover:text-cyan-300 h-7"
              >
                <Plus className="w-4 h-4 mr-1" />
                添加变量
              </Button>
            </div>
            <div className="space-y-2">
              {variables.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={v.key}
                    onChange={(e) => updateVariable(i, 'key', e.target.value)}
                    placeholder="变量名"
                    className="bg-slate-800 border-slate-700 font-mono text-sm"
                  />
                  <Input
                    value={v.value}
                    onChange={(e) => updateVariable(i, 'value', e.target.value)}
                    placeholder="变量值"
                    className="flex-1 bg-slate-800 border-slate-700 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariable(i)}
                    className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {variables.length === 0 && (
                <div className="text-center py-4 bg-slate-800/50 rounded text-slate-500 text-sm">
                  暂无变量，点击上方按钮添加
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              在请求中使用 {'{'}{'{'}变量名{'}'}{'}'} 语法引用变量，例如：{'{'}{'{'}token{'}'}{'}'}
            </p>
          </div>

          {/* 公共 Headers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">公共 Headers</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addHeader}
                className="text-cyan-400 hover:text-cyan-300 h-7"
              >
                <Plus className="w-4 h-4 mr-1" />
                添加 Header
              </Button>
            </div>
            <div className="space-y-2">
              {headers.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={h.key}
                    onChange={(e) => updateHeader(i, 'key', e.target.value)}
                    placeholder="Header 名称"
                    className="bg-slate-800 border-slate-700 font-mono text-sm"
                  />
                  <Input
                    value={h.value}
                    onChange={(e) => updateHeader(i, 'value', e.target.value)}
                    placeholder="Header 值"
                    className="flex-1 bg-slate-800 border-slate-700 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHeader(i)}
                    className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {headers.length === 0 && (
                <div className="text-center py-4 bg-slate-800/50 rounded text-slate-500 text-sm">
                  暂无 Headers，点击上方按钮添加
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              这些 Headers 会自动添加到该环境的所有请求中
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name.trim() || isLoading}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'create' ? '创建' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
