import { Clock, Network } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimelineViewerProps {
  timeline?: {
    dns: number
    tcp: number
    ttfb: number
    download: number
  }
}

export function TimelineViewer({ timeline }: TimelineViewerProps) {
  if (!timeline) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>暂无时间线数据</p>
      </div>
    )
  }

  const total = timeline.dns + timeline.tcp + timeline.ttfb + timeline.download
  const stages = [
    { name: 'DNS', value: timeline.dns, color: 'bg-purple-500' },
    { name: 'TCP', value: timeline.tcp, color: 'bg-blue-500' },
    { name: 'TTFB', value: timeline.ttfb, color: 'bg-cyan-500' },
    { name: 'Download', value: timeline.download, color: 'bg-emerald-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* 总体时间线 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">总耗时</span>
          <span className="text-white font-mono">{total.toFixed(0)} ms</span>
        </div>
        <div className="h-8 bg-slate-800 rounded-lg overflow-hidden flex">
          {stages.map((stage) => {
            const width = (stage.value / total) * 100
            return (
              <div
                key={stage.name}
                className={cn('h-full', stage.color)}
                style={{ width: `${width}%` }}
                title={`${stage.name}: ${stage.value.toFixed(2)} ms`}
              />
            )
          })}
        </div>
      </div>

      {/* 详细信息 */}
      <div className="space-y-3">
        {stages.map((stage) => (
          <div key={stage.name} className="flex items-center gap-4">
            <div className={cn('w-3 h-3 rounded-full', stage.color)} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">{stage.name}</span>
                <span className="text-white font-mono">{stage.value.toFixed(2)} ms</span>
              </div>
              <div className="mt-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn('h-full', stage.color)}
                  style={{ width: `${(stage.value / total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 说明 */}
      <div className="p-3 bg-slate-800/50 rounded-lg">
        <div className="flex items-start gap-2 text-sm">
          <Network className="w-4 h-4 text-slate-500 mt-0.5" />
          <div className="text-slate-400">
            <p><strong className="text-slate-300">DNS</strong>: DNS 查询时间</p>
            <p><strong className="text-slate-300">TCP</strong>: TCP 连接时间</p>
            <p><strong className="text-slate-300">TTFB</strong>: 首字节接收时间</p>
            <p><strong className="text-slate-300">Download</strong>: 内容下载时间</p>
          </div>
        </div>
      </div>
    </div>
  )
}
