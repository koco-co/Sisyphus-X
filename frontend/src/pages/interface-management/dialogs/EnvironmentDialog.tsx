import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, Trash2, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

interface EnvironmentDialogProps {
  open: boolean
  onClose: () => void
  onSave: (env: Environment) => void
  environment?: Environment
  mode: 'create' | 'edit'
}

export function EnvironmentDialog({
  open,
  onClose,
  onSave,
  environment,
  mode
}: EnvironmentDialogProps) {
  const [formData, setFormData] = useState<Environment>({
    name: '',
    domain: '',
    variables: {},
    headers: {},
    is_preupload: false
  })

  const [variables, setVariables] = useState<KeyValuePair[]>([])
  const [headers, setHeaders] = useState<KeyValuePair[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (environment && mode === 'edit') {
      setFormData(environment)
      setVariables(objectToKeyValuePairs(environment.variables))
      setHeaders(objectToKeyValuePairs(environment.headers))
    } else {
      setFormData({
        name: '',
        domain: '',
        variables: {},
        headers: {},
        is_preupload: false
      })
      setVariables([])
      setHeaders([])
    }
  }, [environment, mode, open])

  const objectToKeyValuePairs = (obj: Record<string, string>): KeyValuePair[] => {
    return Object.entries(obj || {}).map(([key, value]) => ({ key, value }))
  }

  const keyValuePairsToObject = (pairs: KeyValuePair[]): Record<string, string> => {
    return pairs
      .filter(p => p.key.trim())
      .reduce((acc, { key, value }) => {
        acc[key] = value
        return acc
      }, {} as Record<string, string>)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        ...formData,
        variables: keyValuePairsToObject(variables),
        headers: keyValuePairsToObject(headers)
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const addVariable = () => setVariables([...variables, { key: '', value: '' }])
  const removeVariable = (index: number) => setVariables(variables.filter((_, i) => i !== index))
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
              在请求中使用 {'{{'}变量名{'}}'} 语法引用变量，例如：{'{{'}token{'}}'}
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

interface EnvironmentListDialogProps {
  open: boolean
  onClose: () => void
  projectId: number
  onSelectEnv: (envId: number | null) => void
  currentEnvId?: number | null
}

export function EnvironmentListDialog({
  open,
  onClose,
  projectId,
  onSelectEnv,
  currentEnvId
}: EnvironmentListDialogProps) {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingEnv, setEditingEnv] = useState<Environment | undefined>()

  const handleClose = () => {
    setMode('list')
    setEditingEnv(undefined)
    onClose()
  }

  const handleCreate = () => {
    setEditingEnv(undefined)
    setMode('create')
  }

  const handleEdit = (env: Environment) => {
    setEditingEnv(env)
    setMode('edit')
  }

  const handleSave = (env: Environment) => {
    setMode('list')
    // TODO: 调用保存 API
  }

  const handleCopy = (env: Environment) => {
    setEditingEnv({
      ...env,
      id: undefined,
      name: `${env.name} - 副本`
    })
    setMode('create')
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

  // 列表模式渲染在 EnvironmentSelector 中
  return null
}
