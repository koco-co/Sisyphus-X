import { Clock, HardDrive } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResponseHeaderProps {
  status: number
  statusColor: string
  elapsed: number
  size: number
}

export function ResponseHeader({ status, statusColor, elapsed, size }: ResponseHeaderProps) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-white/5">
      {/* 状态码 */}
      <span className={cn(
        "px-3 py-1 rounded-lg text-sm font-bold",
        statusColor
      )}>
        {status}
      </span>

      {/* 耗时 */}
      <div className="flex items-center gap-1.5 text-slate-400 text-sm">
        <Clock className="w-4 h-4" />
        <span>{(elapsed * 1000).toFixed(0)} ms</span>
      </div>

      {/* 大小 */}
      <div className="flex items-center gap-1.5 text-slate-400 text-sm">
        <HardDrive className="w-4 h-4" />
        <span>{formatSize(size)}</span>
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
