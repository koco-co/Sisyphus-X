import type { KeyValuePair } from './KeyValueEditor'
import { KeyValueEditor } from './KeyValueEditor'

interface ParamsTabProps {
  params: KeyValuePair[]
  onChange: (params: KeyValuePair[]) => void
}

export function ParamsTab({ params, onChange }: ParamsTabProps) {
  return (
    <div className="p-4">
      <KeyValueEditor
        pairs={params}
        onChange={onChange}
        placeholders={{ key: '参数名', value: '参数值' }}
      />
      <p className="mt-4 text-sm text-slate-500">
        Query 参数会自动添加到 URL 中
      </p>
    </div>
  )
}
