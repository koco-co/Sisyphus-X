import { useState, useEffect } from 'react'
import { Image, FileText, Code } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BodyViewerProps {
  body: any
  headers: Record<string, string>
  format: 'pretty' | 'raw'
}

export function BodyViewer({ body, headers, format }: BodyViewerProps) {
  const [contentType, setContentType] = useState<string>('')
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview')

  useEffect(() => {
    const ct = headers['content-type'] || headers['Content-Type'] || ''
    setContentType(ct)
  }, [headers])

  const isJson = contentType.includes('json')
  const isImage = contentType.includes('image')
  const isHtml = contentType.includes('html')
  const isText = contentType.includes('text') || !contentType

  // 图片预览
  if (isImage && typeof body === 'string') {
    return (
      <div className="p-6 flex items-center justify-center">
        <img
          src={body}
          alt="Response"
          className="max-w-full max-h-[600px] rounded-lg"
        />
      </div>
    )
  }

  // JSON 格式化展示
  if (isJson && format === 'pretty') {
    let jsonData: any
    try {
      jsonData = typeof body === 'string' ? JSON.parse(body) : body
    } catch {
      jsonData = body
    }

    return (
      <div className="p-4">
        <JsonView data={jsonData} />
      </div>
    )
  }

  // 纯文本展示
  return (
    <div className="p-4">
      {typeof body === 'string' || isText || isHtml ? (
        <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-all">
          {typeof body === 'string' ? body : JSON.stringify(body, null, 2)}
        </pre>
      ) : (
        <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-all">
          {JSON.stringify(body, null, 2)}
        </pre>
      )}
    </div>
  )
}

// JSON 递归渲染组件
interface JsonViewProps {
  data: any
  depth?: number
}

function JsonView({ data, depth = 0 }: JsonViewProps) {
  const [expanded, setExpanded] = useState(true)

  if (data === null) {
    return <span className="text-purple-400">null</span>
  }

  if (data === undefined) {
    return <span className="text-purple-400">undefined</span>
  }

  if (typeof data === 'boolean') {
    return <span className="text-cyan-400">{String(data)}</span>
  }

  if (typeof data === 'number') {
    return <span className="text-amber-400">{data}</span>
  }

  if (typeof data === 'string') {
    return <span className="text-green-400">"{data}"</span>
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-slate-400">[]</span>
    }

    if (depth > 10) {
      return <span className="text-slate-500">[Array (too deep)]</span>
    }

    return (
      <div>
        <span className="text-slate-400">[</span>
        {expanded && (
          <div className="pl-4">
            {data.map((item, index) => (
              <div key={index} className="relative">
                <span className="absolute -left-4 text-slate-600 select-none">{index + 1}.</span>
                <JsonView data={item} depth={depth + 1} />
                {index < data.length - 1 && <span className="text-slate-400">,</span>}
              </div>
            ))}
          </div>
        )}
        <span className="text-slate-400">]</span>
      </div>
    )
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data)
    if (keys.length === 0) {
      return <span className="text-slate-400">{{'{'}{'}}'}</span>
    }

    if (depth > 10) {
      return <span className="text-slate-500">{{'{'}Object (too deep){'}'}}</span>
    }

    return (
      <div>
        <span className="text-slate-400">{{'{'}}</span>
        {expanded && (
          <div className="pl-4">
            {keys.map((key, index) => (
              <div key={key}>
                <span className="text-blue-400">"{key}"</span>
                <span className="text-slate-400">: </span>
                <JsonView data={data[key]} depth={depth + 1} />
                {index < keys.length - 1 && <span className="text-slate-400">,</span>}
              </div>
            ))}
          </div>
        )}
        <span className="text-slate-400">{{'}'}}</span>
      </div>
    )
  }

  return <span className="text-slate-400">{String(data)}</span>
}
