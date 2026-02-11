import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ExecutionLogViewerProps {
  timeline?: {
    dns: number
    tcp: number
    ttfb: number
    download: number
  }
  responseTime: number
  requestSize: number
  responseSize: number
}

interface LogEntry {
  timestamp: string
  message: string
  duration?: number
}

export function ExecutionLogViewer({
  timeline,
  responseTime,
  requestSize,
  responseSize,
}: ExecutionLogViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 生成执行日志
  const generateLogs = (): LogEntry[] => {
    const logs: LogEntry[] = []
    const startTime = Date.now()

    // 初始时间
    let elapsed = 0

    // 开始发送请求
    logs.push({
      timestamp: formatTime(startTime),
      message: `开始发送请求 (大小: ${formatBytes(requestSize)})`,
    })

    // DNS 查询
    if (timeline?.dns) {
      elapsed += timeline.dns
      logs.push({
        timestamp: formatTime(startTime + elapsed),
        message: 'DNS 查询完成',
        duration: timeline.dns,
      })
    }

    // TCP 连接
    if (timeline?.tcp) {
      elapsed += timeline.tcp
      logs.push({
        timestamp: formatTime(startTime + elapsed),
        message: 'TCP 连接建立完成',
        duration: timeline.tcp,
      })
    }

    // TTFB
    if (timeline?.ttfb) {
      elapsed += timeline.ttfb
      logs.push({
        timestamp: formatTime(startTime + elapsed),
        message: '首字节接收时间 (TTFB)',
        duration: timeline.ttfb,
      })
    }

    // 下载
    if (timeline?.download) {
      elapsed += timeline.download
      logs.push({
        timestamp: formatTime(startTime + elapsed),
        message: `响应内容下载完成 (大小: ${formatBytes(responseSize)})`,
        duration: timeline.download,
      })
    }

    // 总计
    logs.push({
      timestamp: formatTime(startTime + elapsed),
      message: `请求完成，总耗时: ${responseTime.toFixed(0)}ms`,
    })

    return logs
  }

  const logs = generateLogs()

  return (
    <div className="space-y-2">
      {/* 展开按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300">执行日志</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{logs.length} 条记录</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* 日志内容 */}
      {isExpanded && (
        <div className="p-4 bg-slate-900/50 rounded-lg space-y-2 font-mono text-xs">
          {logs.map((log, index) => (
            <div key={index} className="flex gap-3">
              <span className="text-slate-500 select-none">{log.timestamp}</span>
              <span className={cn(
                "flex-1",
                log.message.includes('完成') && !log.message.includes('开始') ? "text-emerald-400" : "text-slate-300"
              )}>
                {log.message}
                {log.duration !== undefined && (
                  <span className="ml-2 text-slate-500">({log.duration.toFixed(2)}ms)</span>
                )}
              </span>
            </div>
          ))}

          {/* 说明 */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-start gap-2 text-slate-500">
              <Clock className="w-4 h-4 mt-0.5" />
              <div className="space-y-1">
                <p><strong className="text-slate-400">DNS</strong>: 域名解析时间</p>
                <p><strong className="text-slate-400">TCP</strong>: TCP 连接建立时间</p>
                <p><strong className="text-slate-400">TTFB</strong>: 首字节接收时间</p>
                <p><strong className="text-slate-400">Download</strong>: 响应内容下载时间</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 辅助函数
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const ms = date.getMilliseconds().toString().padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}
