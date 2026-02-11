import { CustomSelect } from '@/components/ui/CustomSelect'
import { cn } from '@/lib/utils'

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500 text-white',
  POST: 'bg-amber-500 text-white',
  PUT: 'bg-cyan-500 text-white',
  DELETE: 'bg-red-500 text-white',
  PATCH: 'bg-violet-500 text-white',
}

interface MethodSelectorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function MethodSelector({ value, onChange, className }: MethodSelectorProps) {
  return (
    <div className={cn("w-32", className)}>
      <CustomSelect
        value={value}
        onChange={onChange}
        options={METHODS.map(m => ({ label: m, value: m }))}
        placeholder="Method"
        className={methodColors[value] || 'bg-slate-700 text-white'}
      />
    </div>
  )
}
