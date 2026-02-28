import { useState, useRef } from 'react'
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
import { Loader2, FileJson, Upload } from 'lucide-react'
import { interfacesApi } from '@/api/client'
import { toast } from 'sonner'

interface SwaggerImportDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  onSuccess?: () => void
}

export function SwaggerImportDialog({
  open,
  onClose,
  projectId,
  onSuccess,
}: SwaggerImportDialogProps) {
  const [mode, setMode] = useState<'file' | 'url'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setFile(f || null)
    setError('')
  }

  const handleImport = async () => {
    if (!projectId) {
      setError('请先选择项目')
      return
    }

    const formData = new FormData()
    formData.append('project_id', projectId)

    if (mode === 'file') {
      if (!file) {
        setError('请选择 Swagger/OpenAPI 文件')
        return
      }
      formData.append('file', file)
    } else {
      if (!url.trim()) {
        setError('请输入 Swagger/OpenAPI 文档 URL')
        return
      }
      formData.append('url', url.trim())
    }

    setIsImporting(true)
    setError('')

    try {
      const res = await interfacesApi.importSwagger(formData)
      const data = res?.data?.data ?? res?.data ?? res
      const count = data?.count ?? 0
      toast.success(data?.message || `成功导入 ${count} 个接口`)
      onSuccess?.()
      handleClose()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : (err as Error)?.message
      setError(String(msg || '导入失败'))
      toast.error(String(msg || '导入失败'))
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setUrl('')
    setError('')
    setMode('file')
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5" />
            导入 Swagger/OpenAPI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex gap-2">
            <Button
              variant={mode === 'file' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('file')}
              className="bg-slate-800 border-slate-600 hover:bg-slate-700"
            >
              <Upload className="w-4 h-4 mr-1" />
              上传文件
            </Button>
            <Button
              variant={mode === 'url' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('url')}
              className="bg-slate-800 border-slate-600 hover:bg-slate-700"
            >
              URL
            </Button>
          </div>

          {mode === 'file' ? (
            <div>
              <Label>Swagger/OpenAPI 文件 (JSON 或 YAML)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileChange}
                className="mt-2 block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-4 file:py-2 file:text-cyan-400" />
              {file && (
                <p className="mt-2 text-sm text-slate-400">{file.name}</p>
              )}
            </div>
          ) : (
            <div>
              <Label htmlFor="swagger-url">文档 URL</Label>
              <Input
                id="swagger-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/swagger.json"
                className="mt-2 bg-slate-800 border-slate-600"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || (mode === 'file' ? !file : !url.trim())}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            {isImporting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
