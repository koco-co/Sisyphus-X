import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react'
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

interface Environment {
  id: number
  name: string
  domain: string
  variables: Record<string, string>
  headers: Record<string, string>
}

interface KeyValuePair {
  key: string
  value: string
}

export default function EnvironmentManagement() {
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null)

  const queryClient = useQueryClient()

  // 获取环境列表
  const { data: environments = [], isLoading } = useQuery({
    queryKey: ['environments', selectedProjectId],
    queryFn: async () => {
      const response = await projectsApi.listEnvironments(selectedProjectId)
      return response.data
    },
  })

  // 创建环境
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Environment, 'id'>) => {
      await projectsApi.createEnvironment(selectedProjectId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', selectedProjectId] })
      setIsCreateDialogOpen(false)
    },
  })

  // 更新环境
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Environment> }) => {
      await projectsApi.updateEnvironment(selectedProjectId, id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', selectedProjectId] })
      setIsEditDialogOpen(false)
      setEditingEnvironment(null)
    },
  })

  // 删除环境
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await projectsApi.deleteEnvironment(selectedProjectId, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', selectedProjectId] })
    },
  })

  const handleDelete = (id: number) => {
    if (confirm('确定要删除这个环境吗？')) {
      deleteMutation.mutate(id)
    }
  }

  const handleEdit = (env: Environment) => {
    setEditingEnvironment(env)
    setIsEditDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <h1 className="text-3xl font-bold text-white mb-8">环境管理</h1>

        {/* 操作栏 */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-slate-400">
            管理测试环境配置，包括域名前缀、环境变量和公共 Headers
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
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
          <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">暂无环境配置</p>
            <p className="text-slate-500 text-sm mt-2">点击上方"创建环境"按钮创建第一个环境</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {environments.map((env: Environment) => (
              <div
                key={env.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-cyan-500/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{env.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-24">域名前缀:</span>
                        <code className="text-cyan-400 bg-slate-800 px-2 py-1 rounded font-mono">
                          {env.domain || '未设置'}
                        </code>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 w-24">环境变量:</span>
                        <span className="text-slate-400">
                          {Object.keys(env.variables || {}).length} 个变量
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 w-24">公共 Headers:</span>
                        <span className="text-slate-400">
                          {Object.keys(env.headers || {}).length} 个 Header
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(env)}
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(env.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-slate-800"
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
        />
      </div>
    </div>
  )
}

interface EnvironmentDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Environment, 'id'>) => void
  environment?: Environment
  mode: 'create' | 'edit'
}

function EnvironmentDialog({
  open,
  onClose,
  onSave,
  environment,
  mode,
}: EnvironmentDialogProps) {
  const [formData, setFormData] = useState<Omit<Environment, 'id'>>({
    name: '',
    domain: '',
    variables: {},
    headers: {},
  })
  const [variables, setVariables] = useState<KeyValuePair[]>([])
  const [headers, setHeaders] = useState<KeyValuePair[]>([])

  // 当对话框打开或环境数据变化时更新表单
  if (open && environment && mode === 'edit' && formData.name !== environment.name) {
    setFormData({
      name: environment.name,
      domain: environment.domain,
      variables: environment.variables,
      headers: environment.headers,
    })
    setVariables(objectToKeyValuePairs(environment.variables))
    setHeaders(objectToKeyValuePairs(environment.headers))
  } else if (open && !environment && mode === 'create' && formData.name !== '') {
    // 重置表单
    setFormData({
      name: '',
      domain: '',
      variables: {},
      headers: {},
    })
    setVariables([])
    setHeaders([])
  }

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

  const handleSave = () => {
    onSave({
      ...formData,
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
  const removeHeader = (index: number) => setHeaders(headers.filter((_, i) => i !== index))
  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers]
    newHeaders[index][field] = value
    setHeaders(newHeaders)
  }

  const isSaving =
    mode === 'create'
      ? false // createMutation.isPending
      : false // updateMutation.isPending

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
              <Label htmlFor="name">环境名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：开发环境、测试环境"
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div>
              <Label htmlFor="domain">域名前缀</Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="https://api-dev.example.com"
                className="bg-slate-800 border-slate-700 font-mono"
              />
            </div>
          </div>

          {/* 环境变量 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>环境变量</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addVariable}
                className="text-cyan-400 hover:text-cyan-300"
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
                    className="bg-slate-800 border-slate-700 font-mono"
                  />
                  <Input
                    value={v.value}
                    onChange={(e) => updateVariable(i, 'value', e.target.value)}
                    placeholder="变量值"
                    className="flex-1 bg-slate-800 border-slate-700 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariable(i)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {variables.length === 0 && (
                <div className="text-center py-4 text-slate-500 text-sm">
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
              <Label>公共 Headers</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addHeader}
                className="text-cyan-400 hover:text-cyan-300"
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
                    className="bg-slate-800 border-slate-700 font-mono"
                  />
                  <Input
                    value={h.value}
                    onChange={(e) => updateHeader(i, 'value', e.target.value)}
                    placeholder="Header 值"
                    className="flex-1 bg-slate-800 border-slate-700 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHeader(i)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {headers.length === 0 && (
                <div className="text-center py-4 text-slate-500 text-sm">
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
            className="bg-slate-800 text-slate-300"
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name || isSaving}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'create' ? '创建' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
