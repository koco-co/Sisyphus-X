import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { cn } from '@/lib/utils'

export interface AuthConfig {
  type: 'no_auth' | 'bearer' | 'api_key' | 'basic'
  bearer?: { token: string }
  api_key?: { key: string; value: string; addTo: 'header' | 'query' }
  basic?: { username: string; password: string }
}

interface AuthTabProps {
  auth: AuthConfig
  onAuthChange: (auth: AuthConfig) => void
}

const AUTH_TYPES = [
  { id: 'no_auth' as const, label: 'No Auth' },
  { id: 'bearer' as const, label: 'Bearer Token' },
  { id: 'api_key' as const, label: 'API Key' },
  { id: 'basic' as const, label: 'Basic Auth' },
] as const

export function AuthTab({ auth, onAuthChange }: AuthTabProps) {
  const updateAuth = (updates: Partial<AuthConfig>) => {
    onAuthChange({ ...auth, ...updates })
  }

  return (
    <div className="space-y-6">
      {/* 认证类型选择 */}
      <div className="space-y-2">
        <Label>认证类型</Label>
        <div className="w-48">
          <CustomSelect
            value={auth.type}
            onChange={(val) => updateAuth({ type: val as AuthConfig['type'] })}
            options={AUTH_TYPES.map((t) => ({ label: t.label, value: t.id }))}
            placeholder="选择认证类型"
          />
        </div>
      </div>

      {/* Bearer Token */}
      {auth.type === 'bearer' && (
        <div className="space-y-2">
          <Label>Token</Label>
          <Input
            type="password"
            value={auth.bearer?.token || ''}
            onChange={(e) => updateAuth({ bearer: { ...auth.bearer, token: e.target.value } })}
            placeholder="输入 Bearer Token"
            className="bg-slate-800 border-slate-700 font-mono"
          />
          <p className="text-sm text-slate-500">
            请求会自动添加 <code className="text-cyan-400">Authorization: Bearer {'{'}{token}{'}'}</code>
          </p>
        </div>
      )}

      {/* API Key */}
      {auth.type === 'api_key' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Key 名称</Label>
            <Input
              value={auth.api_key?.key || ''}
              onChange={(e) => updateAuth({ api_key: { ...auth.api_key, key: e.target.value, value: auth.api_key?.value || '', addTo: auth.api_key?.addTo || 'header' } })}
              placeholder="例如：X-API-Key"
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Value</Label>
            <Input
              type="password"
              value={auth.api_key?.value || ''}
              onChange={(e) => updateAuth({ api_key: { ...auth.api_key, key: auth.api_key?.key || '', value: e.target.value, addTo: auth.api_key?.addTo || 'header' } })}
              placeholder="输入 API Key 值"
              className="bg-slate-800 border-slate-700 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>添加到</Label>
            <div className="w-48">
              <CustomSelect
                value={auth.api_key?.addTo || 'header'}
                onChange={(val) => updateAuth({ api_key: { ...auth.api_key, key: auth.api_key?.key || '', value: auth.api_key?.value || '', addTo: val as 'header' | 'query' } })}
                options={[
                  { label: 'Header', value: 'header' },
                  { label: 'Query', value: 'query' },
                ]}
                placeholder="选择位置"
              />
            </div>
          </div>
        </div>
      )}

      {/* Basic Auth */}
      {auth.type === 'basic' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input
              value={auth.basic?.username || ''}
              onChange={(e) => updateAuth({ basic: { ...auth.basic, username: e.target.value, password: auth.basic?.password || '' } })}
              placeholder="输入用户名"
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div className="space-y-2">
            <Label>密码</Label>
            <Input
              type="password"
              value={auth.basic?.password || ''}
              onChange={(e) => updateAuth({ basic: { ...auth.basic, username: auth.basic?.username || '', password: e.target.value } })}
              placeholder="输入密码"
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <p className="text-sm text-slate-500">
            请求会自动添加 <code className="text-cyan-400">Authorization: Basic {'{base64(username:password)}'}</code>
          </p>
        </div>
      )}

      {/* No Auth */}
      {auth.type === 'no_auth' && (
        <div className="text-center py-8 text-slate-500">
          <p>此接口不需要认证</p>
        </div>
      )}
    </div>
  )
}
