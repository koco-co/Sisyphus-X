import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, FileText, Check } from 'lucide-react'
import { parseCurlCommand } from '../utils/curlParser'
import type { ParsedCurlRequest } from '../utils/curlParser'
import { cn } from '@/lib/utils'

export interface CurlImportData {
  method: string
  url: string
  headers: Record<string, string>
  body?: any
  body_type: 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'none'
  params: Record<string, string>
  auth?: {
    type: 'none' | 'bearer' | 'api_key' | 'basic'
    token?: string
    key?: string
    value?: string
    add_to?: 'header' | 'query'
    username?: string
    password?: string
  }
}

interface CurlImportDialogProps {
  open: boolean
  onClose: () => void
  onImport: (data: CurlImportData) => void
}

export function CurlImportDialog({ open, onClose, onImport }: CurlImportDialogProps) {
  const [curlCommand, setCurlCommand] = useState('')
  const [parsedData, setParsedData] = useState<ParsedCurlRequest | null>(null)
  const [error, setError] = useState<string>('')
  const [isParsing, setIsParsing] = useState(false)

  const handleParse = () => {
    if (!curlCommand.trim()) {
      setError('请输入 cURL 命令')
      setParsedData(null)
      return
    }

    setIsParsing(true)
    setError('')

    try {
      const result = parseCurlCommand(curlCommand)
      setParsedData(result)
      setError('')
    } catch (err: any) {
      setError(err.message || '解析失败，请检查 cURL 格式')
      setParsedData(null)
    } finally {
      setIsParsing(false)
    }
  }

  const handleImport = () => {
    if (parsedData) {
      onImport(parsedData as CurlImportData)
      handleClose()
    }
  }

  const handleClose = () => {
    setCurlCommand('')
    setParsedData(null)
    setError('')
    onClose()
  }

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-emerald-500/20 text-emerald-400',
      POST: 'bg-amber-500/20 text-amber-400',
      PUT: 'bg-cyan-500/20 text-cyan-400',
      DELETE: 'bg-red-500/20 text-red-400',
      PATCH: 'bg-violet-500/20 text-violet-400',
    }
    return colors[method] || 'bg-slate-500/20 text-slate-400'
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>从 cURL 导入</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 输入区域 */}
          <div className="space-y-2">
            <Label htmlFor="curl-input">cURL 命令</Label>
            <Textarea
              id="curl-input"
              value={curlCommand}
              onChange={(e) => {
                setCurlCommand(e.target.value)
                setParsedData(null)
                setError('')
              }}
              placeholder={`粘贴 cURL 命令，例如：\ncurl -X POST https://api.example.com/users \n  -H 'Content-Type: application/json' \n  -H 'Authorization: Bearer {{token}}' \n  -d '{"name":"Alice"}'`}
              className="min-h-[120px] bg-slate-800 border-slate-700 font-mono text-sm"
            />
            <div className="flex justify-between items-center">
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
              <Button
                onClick={handleParse}
                disabled={!curlCommand.trim() || isParsing}
                variant="outline"
                className="ml-auto"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    解析 cURL
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 解析结果预览 */}
          {parsedData && (
            <div className="space-y-4 border-t border-slate-700 pt-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <Check className="w-5 h-5" />
                <span className="font-medium">解析成功</span>
              </div>

              {/* 基本信息 */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-lg text-sm font-bold",
                      getMethodColor(parsedData.method)
                    )}
                  >
                    {parsedData.method}
                  </span>
                  <code className="flex-1 px-3 py-2 bg-slate-800 rounded-lg text-sm font-mono text-cyan-400 break-all">
                    {parsedData.url}
                  </code>
                </div>

                {/* Headers */}
                {Object.keys(parsedData.headers).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-slate-400">Headers</Label>
                    <div className="bg-slate-800 rounded-lg p-3 space-y-1">
                      {Object.entries(parsedData.headers).map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-sm">
                          <span className="text-cyan-400 font-mono">{key}:</span>
                          <span className="text-slate-300 font-mono break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Query 参数 */}
                {Object.keys(parsedData.params).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-slate-400">Query Parameters</Label>
                    <div className="bg-slate-800 rounded-lg p-3 space-y-1">
                      {Object.entries(parsedData.params).map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-sm">
                          <span className="text-cyan-400 font-mono">{key}:</span>
                          <span className="text-slate-300 font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Body */}
                {parsedData.body && parsedData.body_type !== 'none' && (
                  <div className="space-y-2">
                    <Label className="text-slate-400">
                      Body ({parsedData.body_type})
                    </Label>
                    <div className="bg-slate-800 rounded-lg p-3 max-h-[200px] overflow-auto">
                      <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                        {typeof parsedData.body === 'string'
                          ? parsedData.body
                          : JSON.stringify(parsedData.body, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 认证 */}
                {parsedData.auth && parsedData.auth.type !== 'none' && (
                  <div className="space-y-2">
                    <Label className="text-slate-400">认证</Label>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-medium">
                          {parsedData.auth.type.toUpperCase()}
                        </span>
                        {parsedData.auth.type === 'bearer' && (
                          <span className="text-sm text-slate-400 font-mono">
                            Token: {parsedData.auth.token?.substring(0, 20)}...
                          </span>
                        )}
                        {parsedData.auth.type === 'basic' && (
                          <span className="text-sm text-slate-400 font-mono">
                            {parsedData.auth.username}:{'***'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} className="bg-slate-800 text-slate-300">
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedData}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
