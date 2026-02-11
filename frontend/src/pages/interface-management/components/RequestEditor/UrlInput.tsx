import { Input } from '@/components/ui/input'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UrlInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function UrlInput({
  value,
  onChange,
  placeholder = '输入请求 URL，如 /api/users',
  className
}: UrlInputProps) {
  return (
    <div className={cn("flex items-center gap-3 flex-1", className)}>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 h-10 bg-slate-800 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50"
      />
    </div>
  )
}
