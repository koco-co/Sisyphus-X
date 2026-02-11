import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormDataEditor } from './FormDataEditor'
import { cn } from '@/lib/utils'
import type { KeyValueTypePair } from './FormDataEditor'

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw'

interface BodyTabProps {
  bodyType: BodyType
  onBodyTypeChange: (type: BodyType) => void
  body: string
  onBodyChange: (body: string) => void
  formData?: KeyValueTypePair[]
  onFormDataChange?: (data: KeyValueTypePair[]) => void
}

const BODY_TYPES: { id: BodyType; label: string }[] = [
  { id: 'none', label: 'none' },
  { id: 'json' as const, label: 'JSON' },
  { id: 'form-data' as const, label: 'form-data' },
  { id: 'x-www-form-urlencoded' as const, label: 'x-www-form-urlencoded' },
  { id: 'raw' as const, label: 'raw' },
] as const

export function BodyTab({
  bodyType,
  onBodyTypeChange,
  body,
  onBodyChange,
  formData = [],
  onFormDataChange,
}: BodyTabProps) {
  const [jsonError, setJsonError] = useState<string | null>(null)

  // 验证 JSON 格式
  useEffect(() => {
    if (bodyType === 'json' && body.trim()) {
      try {
        JSON.parse(body)
        setJsonError(null)
      } catch {
        setJsonError('JSON 格式错误')
      }
    }
  }, [body, bodyType])

  const formatJson = () => {
    if (bodyType === 'json') {
      try {
        const parsed = JSON.parse(body)
        onBodyChange(JSON.stringify(parsed, null, 2))
        setJsonError(null)
      } catch {
        setJsonError('无法格式化：JSON 格式错误')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Body 类型选择 */}
      <div className="space-y-2">
        <Label>请求体类型</Label>
        <div className="flex gap-2">
          {BODY_TYPES.map((type) => (
            <label
              key={type.id}
              className={cn(
                'px-4 py-2 rounded-lg border cursor-pointer transition-all',
                bodyType === type.id
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              )}
            >
              <input
                type="radio"
                name="body_type"
                value={type.id}
                checked={bodyType === type.id}
                onChange={() => onBodyTypeChange(type.id)}
                className="sr-only"
              />
              {type.label}
            </label>
          ))}
        </div>
      </div>

      {/* JSON 编辑器 */}
      {bodyType === 'json' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>JSON Body</Label>
            <button
              onClick={formatJson}
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              格式化
            </button>
          </div>
          <Textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder='{\n  "key": "value"\n}'
            className="min-h-[200px] bg-slate-800 border-slate-700 font-mono text-sm"
          />
          {jsonError && (
            <p className="text-sm text-red-400">JSON 格式错误: {jsonError}</p>
          )}
          <p className="text-sm text-slate-500">
            支持 {'{{变量名}}'} 语法引用环境变量
          </p>
        </div>
      )}

      {/* Form Data */}
      {bodyType === 'form-data' && onFormDataChange && (
        <div className="space-y-2">
          <Label>Form Data</Label>
          {onFormDataChange && (
            <FormDataEditor
              pairs={formData}
              onChange={onFormDataChange}
            />
          )}
        </div>
      )}

      {/* URL Encoded */}
      {bodyType === 'x-www-form-urlencoded' && (
        <div className="space-y-2">
          <Label>Form Data (URL Encoded)</Label>
          <Textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder="key1=value1&key2=value2"
            className="min-h-[200px] bg-slate-800 border-slate-700 font-mono text-sm"
          />
          <p className="text-sm text-slate-500">
            使用 & 分隔多个键值对
          </p>
        </div>
      )}

      {/* Raw */}
      {bodyType === 'raw' && (
        <div className="space-y-2">
          <Label>Raw Body</Label>
          <Textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder="输入原始请求体内容"
            className="min-h-[200px] bg-slate-800 border-slate-700 font-mono text-sm"
          />
        </div>
      )}
    </div>
  )
}
