import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Trash2, Copy, Edit, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { globalParamsApi, projectsApi } from '@/api/client'

export interface Environment {
  id?: number
  name: string
  domain: string
  variables: Record<string, string>
  headers: Record<string, string>
  is_preupload?: boolean
}

interface KeyValuePair {
  key: string
  value: string
  description: string
}

interface EnvironmentDialogProps {
  open: boolean
  onClose: () => void
  onSave: (env: Environment) => void
  environment?: Environment
  mode: 'create' | 'edit'
}

export function EnvironmentDialog({
  open, onClose, onSave, environment, mode,
}: EnvironmentDialogProps) {
  const [formData, setFormData] = useState<Environment>({
    name: '', domain: '', variables: {}, headers: {}, is_preupload: false,
  })
  const [variables, setVariables] = useState<KeyValuePair[]>([])
  const [headers, setHeaders] = useState<KeyValuePair[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const { data: globalParams = [] } = useQuery({
    queryKey: ['global-params'],
    queryFn: async () => {
      const res = await globalParamsApi.list()
      return res.data || []
    },
    enabled: open,
  })

  useEffect(() => {
    if (environment && mode === 'edit') {
      setFormData(environment)
      setVariables(objectToKeyValuePairs(environment.variables))
      setHeaders(objectToKeyValuePairs(environment.headers))
    } else {
      setFormData({ name: '', domain: '', variables: {}, headers: {}, is_preupload: false })
      setVariables([])
      setHeaders([])
    }
  }, [environment, mode, open])

  const objectToKeyValuePairs = (obj: Record<string, string>): KeyValuePair[] =>
    Object.entries(obj || {}).map(([key, value]) => ({ key, value, description: '' }))

  const keyValuePairsToObject = (pairs: KeyValuePair[]): Record<string, string> =>
    pairs.reduce((acc, { key, value }) => {
      const trimmedKey = key.trim()
      if (trimmedKey) acc[trimmedKey] = value
      return acc
    }, {} as Record<string, string>)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        ...formData,
        variables: keyValuePairsToObject(variables),
        headers: keyValuePairsToObject(headers),
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const addVariable = () => setVariables([...variables, { key: '', value: '', description: '' }])
  const removeVariable = (i: number) => setVariables(variables.filter((_, idx) => idx !== i))
  const updateVariable = (i: number, field: keyof KeyValuePair, val: string) => {
    const next = [...variables]
    next[i] = { ...next[i], [field]: val }
    setVariables(next)
  }

  const addHeader = () => setHeaders([...headers, { key: '', value: '', description: '' }])
  const removeHeader = (i: number) => setHeaders(headers.filter((_, idx) => idx !== i))
  const updateHeader = (i: number, field: 'key' | 'value', val: string) => {
    const next = [...headers]
    next[i] = { ...next[i], [field]: val }
    setHeaders(next)
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

          {/* 全局变量 (只读参考) */}
          {globalParams.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <Label>全局变量</Label>
                <span className="text-xs text-slate-500">（所有环境共享，在全局参数页面管理）</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-800/50 divide-y divide-white/5">
                {(globalParams as Array<{ id: string; code: string; description?: string }>).map((gp) => (
                  <div key={gp.id} className="flex items-center gap-4 px-3 py-2 text-sm">
                    <span className="font-mono text-cyan-400 min-w-[120px]">{gp.code}</span>
                    <span className="text-slate-400 truncate">{gp.description || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 环境变量 (3列: 变量名 | 变量值 | 变量描述) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>环境变量</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addVariable} className="text-cyan-400 hover:text-cyan-300">
                <Plus className="w-4 h-4 mr-1" />
                添加变量
              </Button>
            </div>
            {variables.length > 0 && (
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-x-2 text-xs text-slate-500 px-1">
                <span>变量名</span><span>变量值</span><span>变量描述</span><span className="w-9" />
              </div>
            )}
            <div className="space-y-2">
              {variables.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
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
                    className="bg-slate-800 border-slate-700 font-mono"
                  />
                  <Input
                    value={v.description}
                    onChange={(e) => updateVariable(i, 'description', e.target.value)}
                    placeholder="描述"
                    className="bg-slate-800 border-slate-700"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeVariable(i)} className="text-red-400 hover:text-red-300">
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
              在请求中使用 {'{{'}变量名{'}}'} 语法引用变量，例如：{'{{'}token{'}}'}
            </p>
          </div>

          {/* 公共 Headers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>公共 Headers</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addHeader} className="text-cyan-400 hover:text-cyan-300">
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
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeHeader(i)} className="text-red-400 hover:text-red-300">
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
          <Button variant="ghost" onClick={onClose} className="bg-slate-800 text-slate-300">
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

/* ───────── Environment List Dialog ───────── */

interface EnvironmentListDialogProps {
  open: boolean
  onClose: () => void
  projectId: number
  onSelectEnv: (envId: number | null) => void
  currentEnvId?: number | null
}

export function EnvironmentListDialog({
  open, onClose, projectId, onSelectEnv, currentEnvId,
}: EnvironmentListDialogProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingEnv, setEditingEnv] = useState<Environment | undefined>()

  const { data: environments = [], isLoading } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: async () => {
      const res = await projectsApi.listEnvironments(projectId)
      return (res.data || []) as (Environment & { id: number })[]
    },
    enabled: !!projectId && open,
  })

  const handleClose = () => { setMode('list'); setEditingEnv(undefined); onClose() }
  const handleCreate = () => { setEditingEnv(undefined); setMode('create') }
  const handleEdit = (env: Environment) => { setEditingEnv(env); setMode('edit') }

  const handleSave = async (env: Environment) => {
    if (mode === 'create') {
      await projectsApi.createEnvironment(projectId, env)
    } else if (mode === 'edit' && editingEnv?.id) {
      await projectsApi.updateEnvironment(projectId, editingEnv.id, env)
    }
    queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
    setMode('list')
  }

  const handleCopy = (env: Environment) => {
    setEditingEnv({ ...env, id: undefined, name: `${env.name} - 副本` })
    setMode('create')
  }

  const handleDelete = async (envId: number) => {
    await projectsApi.deleteEnvironment(projectId, envId)
    queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <EnvironmentDialog
        open={open}
        onClose={handleClose}
        onSave={handleSave}
        environment={editingEnv}
        mode={mode}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>环境管理</DialogTitle>
            <Button size="sm" onClick={handleCreate} className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Plus className="w-4 h-4 mr-1" />
              创建环境
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-2 py-2 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            </div>
          ) : environments.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              暂无环境，点击上方按钮创建
            </div>
          ) : (
            environments.map((env) => (
              <div
                key={env.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  currentEnvId === env.id
                    ? 'border-cyan-500/50 bg-cyan-500/5'
                    : 'border-white/5 hover:border-white/10 hover:bg-white/5',
                )}
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => { onSelectEnv(env.id!); handleClose() }}
                >
                  <div className="text-sm font-medium text-white truncate">{env.name}</div>
                  <div className="text-xs text-slate-500 font-mono truncate">{env.domain || '未设置域名'}</div>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button onClick={() => handleEdit(env)} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleCopy(env)} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => env.id && handleDelete(env.id)} className="p-1.5 rounded hover:bg-white/10 text-red-400 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
