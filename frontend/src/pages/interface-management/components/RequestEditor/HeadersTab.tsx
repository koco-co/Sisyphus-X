import type { KeyValuePair } from './KeyValueEditor'
import { KeyValueEditor } from './KeyValueEditor'

interface HeadersTabProps {
  headers: KeyValuePair[]
  onChange: (headers: KeyValuePair[]) => void
}

export function HeadersTab({ headers, onChange }: HeadersTabProps) {
  return (
    <div className="p-4">
      <KeyValueEditor
        pairs={headers}
        onChange={onChange}
        placeholders={{ key: 'Header Name', value: 'Header Value' }}
      />
      <p className="mt-4 text-sm text-slate-500">
        自定义 Headers 会与环境配置的 Headers 合并
      </p>
    </div>
  )
}
