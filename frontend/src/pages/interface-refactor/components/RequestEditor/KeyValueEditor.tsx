import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface KeyValuePair {
  key: string
  value: string
  enabled: boolean
  description?: string
}

interface KeyValueEditorProps {
  pairs: KeyValuePair[]
  onChange: (pairs: KeyValuePair[]) => void
  placeholders?: { key: string; value: string }
  showEnableToggle?: boolean
  showDescription?: boolean
  className?: string
}

export function KeyValueEditor({
  pairs,
  onChange,
  placeholders = { key: 'Key', value: 'Value' },
  showEnableToggle = true,
  showDescription = false,
  className
}: KeyValueEditorProps) {
  const addPair = () => {
    onChange([...pairs, { key: '', value: '', enabled: true }])
  }

  const removePair = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index))
  }

  const updatePair = (index: number, field: keyof KeyValuePair, value: any) => {
    const newPairs = [...pairs]
    newPairs[index] = { ...newPairs[index], [field]: value }
    onChange(newPairs)
  }

  return (
    <div className={cn("space-y-2", className)}>
      {pairs.map((pair, index) => (
        <div key={index} className="flex gap-2 items-center">
          {showEnableToggle && (
            <input
              type="checkbox"
              checked={pair.enabled}
              onChange={(e) => updatePair(index, 'enabled', e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20"
            />
          )}
          <Input
            type="text"
            value={pair.key}
            onChange={(e) => updatePair(index, 'key', e.target.value)}
            placeholder={placeholders.key}
            className="flex-1 bg-slate-800 border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500/50 font-mono"
          />
          <Input
            type="text"
            value={pair.value}
            onChange={(e) => updatePair(index, 'value', e.target.value)}
            placeholder={placeholders.value}
            className="flex-1 bg-slate-800 border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500/50 font-mono"
          />
          {showDescription && (
            <Input
              type="text"
              value={pair.description || ''}
              onChange={(e) => updatePair(index, 'description', e.target.value)}
              placeholder="描述"
              className="w-32 bg-slate-800 border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500/50"
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removePair(index)}
            className="text-slate-500 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addPair}
        className="text-cyan-400 hover:text-cyan-300"
      >
        <Plus className="w-4 h-4 mr-2" />
        添加
      </Button>
    </div>
  )
}
