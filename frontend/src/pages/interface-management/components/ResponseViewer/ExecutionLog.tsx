import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LogEntry {
  timestamp: string    // "14:32:01.234"
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  details?: any
}

interface ExecutionLogProps {
  logs: LogEntry[]
  defaultExpanded?: boolean
}

const LOG_ICONS = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
}

export function ExecutionLog({ logs, defaultExpanded = false }: ExecutionLogProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (!logs || logs.length === 0) {
    return null
  }

  return (
    <div className="border-t border-white/5">
      {/* 展开/收起按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-3 flex items-center justify-between text-sm text-slate-400 hover:text-slate-300 transition-colors"
      >
        <span className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span>执行日志 ({logs.length})</span>
        </span>
        <span className="text-xs">
          {isExpanded ? '收起' : '展开'}
        </span>
      </button>

      {/* 日志内容 */}
      {isExpanded && (
        <div className="px-6 pb-4 space-y-2 bg-slate-900/50">
          {logs.map((log, index) => {
            const Icon = LOG_ICONS[log.type].icon
            return (
              <div
                key={index}
                className="flex gap-3 p-3 bg-slate-800/50 rounded-lg border border-white/5"
              >
                {/* 时间戳 */}
                <span className="text-xs text-slate-500 font-mono shrink-0 w-20">
                  {log.timestamp}
                </span>

                {/* 图标和消息 */}
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className={cn(
                    "p-1 rounded shrink-0",
                    LOG_ICONS[log.type].bg
                  )}>
                    <Icon className={cn("w-3.5 h-3.5", LOG_ICONS[log.type].color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm break-words",
                      log.type === 'error' && "text-red-400",
                      log.type === 'warning' && "text-amber-400",
                      log.type === 'success' && "text-emerald-400",
                      log.type === 'info' && "text-slate-300"
                    )}>
                      {log.message}
                    </p>
                    {log.details && (
                      <pre className="mt-2 text-xs text-slate-500 font-mono bg-slate-900/50 rounded p-2 overflow-x-auto">
                        {typeof log.details === 'string'
                          ? log.details
                          : JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
