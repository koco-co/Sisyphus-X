/**
 * ResponseViewer 组件 - 完整的响应展示
 *
 * 包含：
 * - Body/Headers/Cookies/Timeline Tabs
 * - 执行日志（默认隐藏，可展开）
 */

import { useState } from 'react'
import { Clock, Zap, Database, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ExecutionLog } from './ExecutionLog'

export interface ResponseData {
  status_code: number
  headers: Record<string, string>
  body: any
  elapsed: number
  size: number
  timeline?: {
    dns?: number
    tcp?: number
    ttfb?: number
    download?: number
  }
}

export interface ResponseViewerProps {
  response: ResponseData | null
  executionLogs?: Array<{
    timestamp: string
    type: 'info' | 'success' | 'warning' | 'error'
    message: string
    details?: any
  }>
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function ResponseViewer({ response, executionLogs = [] }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'cookies' | 'timeline'>('body')
  const [showLogs, setShowLogs] = useState(false)

  if (!response) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <FileText className="w-12 h-12 opacity-20" />
        <p>发送请求后查看响应</p>
      </div>
    )
  }

  const statusCodeColor =
    response.status_code >= 200 && response.status_code < 300 ? 'text-emerald-400' :
    response.status_code >= 300 && response.status_code < 400 ? 'text-amber-400' :
    response.status_code >= 400 && response.status_code < 500 ? 'text-orange-400' :
    'text-red-400'

  const statusCodeBg =
    response.status_code >= 200 && response.status_code < 300 ? 'bg-emerald-500/20' :
    response.status_code >= 300 && response.status_code < 400 ? 'bg-amber-500/20' :
    response.status_code >= 400 && response.status_code < 500 ? 'bg-orange-500/20' :
    'bg-red-500/20'

  const tabs = [
    { id: 'body' as const, label: 'Body' },
    { id: 'headers' as const, label: 'Headers' },
    { id: 'cookies' as const, label: 'Cookies' },
    { id: 'timeline' as const, label: 'Timeline' },
  ]

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* 状态栏 */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-white/5 bg-slate-900">
        <h2 className={cn("text-lg font-bold", statusCodeColor)}>
          {response.status_code || 'Error'}
        </h2>
        <span className={cn("px-3 py-1 rounded-lg text-sm font-bold", statusCodeBg)}>
          {response.status_code >= 200 && response.status_code < 300 && '✓ Success'}
          {response.status_code >= 300 && response.status_code < 400 && '↪ Redirect'}
          {response.status_code >= 400 && response.status_code < 500 && '⚠ Client Error'}
          {response.status_code >= 500 && '⚠ Server Error'}
        </span>
        <span className="text-slate-400 text-sm">
          {(response.elapsed * 1000).toFixed(0)} ms
        </span>
        <span className="text-slate-400 text-sm">
          {formatSize(response.size || 0)}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-3 border-b border-white/5 bg-slate-900">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Body Tab */}
        {activeTab === 'body' && (
          <div className="h-full">
            {response.body ? (
              <pre className="h-full overflow-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-300 font-mono whitespace-pre-wrap break-all">
                {typeof response.body === 'string'
                  ? response.body
                  : JSON.stringify(response.body, null, 2)}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p>无响应体</p>
              </div>
            )}
          </div>
        )}

        {/* Headers Tab */}
        {activeTab === 'headers' && (
          <div className="space-y-2">
            {Object.keys(response.headers || {}).length > 0 ? (
              Object.entries(response.headers).map(([key, value]) => (
                <div key={key} className="flex gap-4 rounded-lg bg-slate-900 p-4">
                  <span className="text-cyan-400 font-mono text-sm font-medium">{key}:</span>
                  <span className="text-slate-300 font-mono text-sm">{value}</span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500">
                <p>无响应头</p>
              </div>
            )}
          </div>
        )}

        {/* Cookies Tab */}
        {activeTab === 'cookies' && (
          <div className="space-y-2">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <p>暂不支持 Cookies 展示</p>
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && response.timeline && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-300 mb-4">请求时间线</h3>

            <div className="space-y-3">
              {response.timeline.dns !== undefined && (
                <div className="flex items-center gap-4">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <span className="text-slate-400 text-sm">DNS 解析:</span>
                  <span className="text-slate-300 font-mono">{response.timeline.dns.toFixed(1)} ms</span>
                </div>
              )}

              {response.timeline.tcp !== undefined && (
                <div className="flex items-center gap-4">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  <span className="text-slate-400 text-sm">TCP 连接:</span>
                  <span className="text-slate-300 font-mono">{response.timeline.tcp.toFixed(1)} ms</span>
                </div>
              )}

              {response.timeline.ttfb !== undefined && (
                <div className="flex items-center gap-4">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <span className="text-slate-400 text-sm">TTFB (首字节):</span>
                  <span className="text-slate-300 font-mono">{response.timeline.ttfb.toFixed(1)} ms</span>
                </div>
              )}

              {response.timeline.download !== undefined && (
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <span className="text-slate-400 text-sm">内容下载:</span>
                  <span className="text-slate-300 font-mono">{response.timeline.download.toFixed(1)} ms</span>
                </div>
              )}

              {/* 总计 */}
              <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                <span className="text-slate-400 text-sm font-medium">总计:</span>
                <span className="text-slate-300 font-mono">
                  {((response.timeline.dns || 0) +
                    (response.timeline.tcp || 0) +
                    (response.timeline.ttfb || 0) +
                    (response.timeline.download || 0)).toFixed(1)} ms
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 执行日志 */}
      {executionLogs && executionLogs.length > 0 && (
        <ExecutionLog logs={executionLogs} />
      )}
    </div>
  )
}
