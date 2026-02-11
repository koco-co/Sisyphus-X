/**
 * ExecutionLog 组件 - 执行日志展示（默认隐藏，可展开）
 *
 * 根据用户决策：执行日志默认隐藏，用户点击"展开日志"后查看详细信息
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LogEntry {
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  details?: any
}

interface ExecutionLogProps {
  logs: LogEntry[]
  className?: string
}

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle,
}

const typeColors = {
  info: 'text-cyan-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
}

const bgColors = {
  info: 'bg-cyan-500/10',
  success: 'bg-emerald-500/10',
  warning: 'bg-amber-500/10',
  error: 'bg-red-500/10',
}

export function ExecutionLog({ logs, className }: ExecutionLogProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!logs || logs.length === 0) {
    return null
  }

  return (
    <div className={cn("border-t border-white/5 bg-slate-900/50", className)}>
      {/* 展开/收起按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-6 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            <span>收起日志</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            <span>展开日志</span>
          </>
        )}
      </button>

      {/* 日志内容 */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto bg-slate-950/50 p-4 space-y-2">
          {logs.map((log, index) => {
            const Icon = typeIcons[log.type]
            const iconColor = typeColors[log.type]
            const bgColor = bgColors[log.type]

            return (
              <div key={index} className={cn("flex items-start gap-3 rounded-lg p-3", bgColor)}>
                <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", iconColor)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{log.timestamp}</span>
                  </div>
                  <p className="text-sm text-slate-300">{log.message}</p>
                  {log.details && (
                    <pre className="mt-2 overflow-x-auto rounded bg-slate-900/50 p-2 text-xs text-slate-400">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
