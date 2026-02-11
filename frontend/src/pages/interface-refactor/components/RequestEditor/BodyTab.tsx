import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { cn } from '@/lib/utils'
import { KeyValueEditor, KeyValuePair } from './KeyValueEditor'

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw'

interface BodyTabProps {
  body: string
  bodyType: BodyType
  formDataPairs?: KeyValuePair[]
  onChange: (body: string, bodyType: BodyType) => void
  onFormDataChange?: (pairs: KeyValuePair[]) => void
}

const BODY_TYPES: { label: string; value: BodyType }[] = [
  { label: 'None', value: 'none' },
  { label: 'JSON', value: 'json' },
  { label: 'Form Data', value: 'form-data' },
  { label: 'URL Encoded', value: 'x-www-form-urlencoded' },
  { label: 'Raw', value: 'raw' },
]

export function BodyTab({ body, bodyType, formDataPairs = [], onChange, onFormDataChange }: BodyTabProps) {
  const [jsonError, setJsonError] = useState<string>('')

  // 验证 JSON 格式
  useEffect(() => {
    if (bodyType === 'json' && body.trim()) {
      try {
        JSON.parse(body)
        setJsonError('')
      } catch (err: any) {
        setJsonError(err.message)
      }
    } else {
      setJsonError('')
    }
  }, [body, bodyType])

  const handleBodyChange = (value: string) => {
    onChange(value, bodyType)
  }

  const handleBodyTypeChange = (type: BodyType) => {
    onChange(body, type)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Body 类型选择 */}
      <div className="space-y-2">
        <Label>Body 类型</Label>
        <CustomSelect
          value={bodyType}
          onChange={(val) => handleBodyTypeChange(val as BodyType)}
          options={BODY_TYPES}
        />
      </div>

      {/* JSON 编辑器 */}
      {bodyType === 'json' && (
        <div className="space-y-2">
          <Label>JSON Body</Label>
          <Textarea
            value={body}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder='{\n  "key": "value"\n}'
            className={cn(
              "min-h-[300px] bg-slate-800 border-slate-700 font-mono text-sm",
              jsonError && "border-red-500 focus:border-red-500"
            )}
          />
          {jsonError && (
            <p className="text-sm text-red-400">JSON 格式错误: {jsonError}</p>
          )}
          <p className="text-sm text-slate-500">
            支持 {'{{'}变量名{'}'}} 语法引用环境变量
          </p>
        </div>
      )}

      {/* Form Data */}
      {bodyType === 'form-data' && (
        <div className="space-y-2">
          <Label>Form Data</Label>
          {onFormDataChange && (
            <KeyValueEditor
              pairs={formDataPairs}
              onChange={onFormDataChange}
              placeholders={{ key: '字段名', value: '字段值' }}
            />
          )}
        </div>
      )}

      {/* URL Encoded */}
      {bodyType === 'x-www-form-urlencoded' && (
        <div className="space-y-2">
          <Label>URL Encoded Form Data</Label>
          {onFormDataChange && (
            <KeyValueEditor
              pairs={formDataPairs}
              onChange={onFormDataChange}
              placeholders={{ key: '参数名', value: '参数值' }}
            />
          )}
        </div>
      )}

      {/* Raw */}
      {bodyType === 'raw' && (
        <div className="space-y-2">
          <Label>Raw Body</Label>
          <Textarea
            value={body}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder="输入请求体内容"
            className="min-h-[300px] bg-slate-800 border-slate-700 font-mono text-sm"
          />
          <p className="text-sm text-slate-500">
            纯文本请求体，不做任何处理
          </p>
        </div>
      )}

      {/* None */}
      {bodyType === 'none' && (
        <div className="text-center py-16 text-slate-500">
          此请求没有 Body
        </div>
      )}
    </div>
  )
}
