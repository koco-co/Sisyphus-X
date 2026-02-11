import { useState, useEffect } from 'react'
import { Send, Clock, FileText, Database, Cookie, Timeline } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ResponseHeader } from './ResponseHeader'
import { BodyViewer } from './BodyViewer'
import { HeadersViewer } from './HeadersViewer'
import { CookiesViewer } from './CookiesViewer'
import { TimelineViewer } from './TimelineViewer'
import { ExecutionLog } from './ExecutionLog'
import type { LogEntry } from './ExecutionLog'

export interface ResponseData {
  status_code: number
  headers: Record<string, string>
  body: any
  elapsed: number
  size: number
  timeline?: {
    dns: number
    tcp: number
    ttfb: number
    download: number
  }
  cookies?: Record<string, string>
  logs?: LogEntry[]
}

interface ResponseViewerProps {
  response: ResponseData | null
  isLoading?: boolean
}

const RESPONSE_TABS = [
  { id: 'body' as const, label: 'Body', icon: FileText },
  { id: 'headers' as const, label: 'Headers', icon: FileText },
  { id: 'cookies' as const, label: 'Cookies', icon: Cookie },
  { id: 'timeline' as const, label: 'Timeline', icon: Timeline },
  { id: 'logs' as const, label: 'Logs', icon: FileText },
]

export function ResponseViewer({ response, isLoading = false }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<typeof RESPONSE_TABS[number]['id']>('body')
  const [bodyFormat, setBodyFormat] = useState<'pretty' | 'raw'>('pretty')
  const [showLog, setShowLog] = useState(false)

  // 当收到新响应时，自动显示日志（如果有错误日志）
  useEffect(() => {
    if (response?.logs && response.logs.some(log => log.type === 'error')) {
      setShowLog(true)
    }
  }, [response])

  if (isLoading) {
    return (
      <div className="w-1/2 flex flex-col bg-slate-900/30 border-l border-white/5">
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="w-1/2 flex flex-col bg-slate-900/30 border-l border-white/5">
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <Send className="w-16 h-16 mb-4 opacity-10" />
          <p className="text-lg font-medium">点击 "发送" 查看响应</p>
          <p className="text-sm mt-2">响应内容将显示在这里</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-emerald-500/20 text-emerald-400'
    if (status >= 300 && status < 400) return 'bg-amber-500/20 text-amber-400'
    if (status >= 400 && status < 500) return 'bg-orange-500/20 text-orange-400'
    if (status >= 500) return 'bg-red-500/20 text-red-400'
    return 'bg-slate-500/20 text-slate-400'
  }

  return (
    <div className="w-1/2 flex flex-col bg-slate-900/30 border-l border-white/5">
      {/* 响应头部 */}
      <ResponseHeader
        status={response.status_code}
        statusColor={getStatusColor(response.status_code)}
        elapsed={response.elapsed}
        size={response.size}
      />

      {/* Tabs 标签栏 */}
      <div className="flex gap-1 px-6 py-3 border-b border-white/5">
        {RESPONSE_TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}

        {/* Body 格式切换 */}
        {activeTab === 'body' && (
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setBodyFormat('pretty')}
              className={cn(
                "px-3 py-1 rounded text-xs",
                bodyFormat === 'pretty'
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Pretty
            </button>
            <button
              onClick={() => setBodyFormat('raw')}
              className={cn(
                "px-3 py-1 rounded text-xs",
                bodyFormat === 'raw'
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Raw
            </button>
          </div>
        )}
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'body' && (
          <BodyViewer
            body={response.body}
            headers={response.headers}
            format={bodyFormat}
          />
        )}
        {activeTab === 'headers' && (
          <HeadersViewer headers={response.headers} />
        )}
        {activeTab === 'cookies' && (
          <CookiesViewer cookies={response.cookies} />
        )}
        {activeTab === 'timeline' && (
          <TimelineViewer timeline={response.timeline} />
        )}
        {activeTab === 'logs' && response.logs && (
          <div className="p-4">
            <ExecutionLog logs={response.logs} defaultExpanded={true} />
          </div>
        )}
      </div>

      {/* 执行日志（默认隐藏，可展开） */}
      {response.logs && response.logs.length > 0 && (
        <ExecutionLog
          logs={response.logs}
          defaultExpanded={response.logs.some(log => log.type === 'error')}
        />
      )}
    </div>
  )
}
