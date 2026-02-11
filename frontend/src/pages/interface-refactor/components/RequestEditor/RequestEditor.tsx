import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MethodSelector } from './MethodSelector'
import { UrlInput } from './UrlInput'
import { EnvironmentSelector } from './EnvironmentSelector'
import { ParamsTab } from './ParamsTab'
import { AuthTab, AuthConfig } from './AuthTab'
import { HeadersTab } from './HeadersTab'
import { BodyTab, BodyType } from './BodyTab'
import type { KeyValuePair } from './KeyValueEditor'

export interface RequestData {
  name: string
  url: string
  method: string
  params: KeyValuePair[]
  headers: KeyValuePair[]
  auth: AuthConfig
  body: string
  bodyType: BodyType
  formDataPairs: KeyValuePair[]
}

interface RequestEditorProps {
  projectId: number
  data: RequestData
  onChange: (data: RequestData) => void
  onSend: () => void
  isSending?: boolean
}

const REQUEST_TABS = [
  { id: 'params' as const, label: 'Params' },
  { id: 'auth' as const, label: 'Authorization' },
  { id: 'headers' as const, label: 'Headers' },
  { id: 'body' as const, label: 'Body' },
  // Pre-request Script 暂时移除，后续有需求再实现
]

export function RequestEditor({
  projectId,
  data,
  onChange,
  onSend,
  isSending = false
}: RequestEditorProps) {
  const [activeTab, setActiveTab] = useState<typeof REQUEST_TABS[number]['id']>('params')
  const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null)

  const updateData = (updates: Partial<RequestData>) => {
    onChange({ ...data, ...updates })
  }

  const updateUrl = (url: string) => {
    updateData({ url })
  }

  const updateMethod = (method: string) => {
    updateData({ method })
  }

  const updateParams = (params: KeyValuePair[]) => {
    updateData({ params })
  }

  const updateHeaders = (headers: KeyValuePair[]) => {
    updateData({ headers })
  }

  const updateAuth = (auth: AuthConfig) => {
    updateData({ auth })
  }

  const updateBody = (body: string, bodyType: BodyType) => {
    updateData({ body, bodyType })
  }

  const updateFormDataPairs = (formDataPairs: KeyValuePair[]) => {
    updateData({ formDataPairs })
  }

  const getTabCount = (tabId: typeof REQUEST_TABS[number]['id']) => {
    switch (tabId) {
      case 'params':
        return data.params.filter(p => p.enabled && p.key).length
      case 'headers':
        return data.headers.filter(h => h.enabled && h.key).length
      case 'body':
        return data.bodyType !== 'none' ? 1 : 0
      default:
        return 0
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950">
      {/* URL 输入栏 */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
        <MethodSelector
          value={data.method}
          onChange={updateMethod}
        />
        <UrlInput
          value={data.url}
          onChange={updateUrl}
        />
        <EnvironmentSelector
          projectId={projectId}
          value={selectedEnvId}
          onChange={setSelectedEnvId}
        />
        <button
          onClick={onSend}
          disabled={isSending}
          className={cn(
            "px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-colors",
            isSending && "opacity-70 cursor-not-allowed"
          )}
        >
          {isSending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              发送中...
            </>
          ) : (
            '发送'
          )}
        </button>
      </div>

      {/* Tabs 标签栏 */}
      <div className="flex gap-1 px-6 py-3 border-b border-white/5 bg-slate-900/30">
        {REQUEST_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all relative",
              activeTab === tab.id
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            {tab.label}
            {getTabCount(tab.id) > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                {getTabCount(tab.id)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'params' && (
          <ParamsTab params={data.params} onChange={updateParams} />
        )}
        {activeTab === 'auth' && (
          <AuthTab auth={data.auth} onChange={updateAuth} />
        )}
        {activeTab === 'headers' && (
          <HeadersTab headers={data.headers} onChange={updateHeaders} />
        )}
        {activeTab === 'body' && (
          <BodyTab
            body={data.body}
            bodyType={data.bodyType}
            formDataPairs={data.formDataPairs}
            onChange={updateBody}
            onFormDataChange={updateFormDataPairs}
          />
        )}
      </div>
    </div>
  )
}
