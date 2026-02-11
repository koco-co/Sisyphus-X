import { CustomSelect } from '@/components/ui/CustomSelect'
import { Globe } from 'lucide-react'
import { useEnvironment } from '../../hooks/useEnvironment'

interface EnvironmentSelectorProps {
  projectId: number
  value: number | null
  onChange: (envId: number | null) => void
}

export function EnvironmentSelector({ projectId, value, onChange }: EnvironmentSelectorProps) {
  const { environments } = useEnvironment(projectId)

  const options = [
    { label: '无环境', value: '' },
    ...environments.map(env => ({ label: env.name, value: String(env.id) }))
  ]

  return (
    <div className="w-48">
      <CustomSelect
        value={value ? String(value) : ''}
        onChange={(val) => onChange(val ? parseInt(val) : null)}
        options={options}
        placeholder="选择环境"
      />
    </div>
  )
}
