import { CustomSelect } from '@/components/ui/CustomSelect'
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { Globe } from 'lucide-react'
import { useEnvironment } from '../../hooks/useEnvironment'
import { normalizeResourceId, toSelectValue } from '../../utils/identifierUtils'

interface EnvironmentSelectorProps {
  projectId: string | number | null
  value: string | null
  onChange: (envId: string | null) => void
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
        value={toSelectValue(value)}
        onChange={(val) => onChange(normalizeResourceId(val))}
        options={options}
        placeholder="选择环境"
      />
    </div>
  )
}
