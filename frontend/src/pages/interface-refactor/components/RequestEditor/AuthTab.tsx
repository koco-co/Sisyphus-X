import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { cn } from '@/lib/utils'
import type { KeyValueEditorProps } from './KeyValueEditor'

export type AuthType = 'none' | 'bearer' | 'api_key' | 'basic'

export interface AuthConfig {
  type: AuthType
  // Bearer
  token?: string
  // API Key
  key?: string
  value?: string
  addTo?: 'header' | 'query'
  // Basic
  username?: string
  password?: string
}

interface AuthTabProps {
  auth: AuthConfig
  onChange: (auth: AuthConfig) => void
}

const AUTH_TYPES: { label: string; value: AuthType }[] = [
  { label: '无认证', value: 'none' },
  { label: 'Bearer Token', value: 'bearer' },
  { label: 'API Key', value: 'api_key' },
  { label: 'Basic Auth', value: 'basic' },
]

export function AuthTab({ auth, onChange }: AuthTabProps) {
  const updateAuth = (updates: Partial<AuthConfig>) => {
    onChange({ ...auth, ...updates })
  }

  return (
    <div className="p-4 space-y-6">
      {/* 认证类型选择 */}
      <div className="space-y-2">
        <Label>认证类型</Label>
        <CustomSelect
          value={auth.type}
          onChange={(val) => updateAuth({ type: val as AuthType })}
          options={AUTH_TYPES}
          placeholder="选择认证类型"
        />
      </div>

      {/* Bearer Token */}
      {auth.type === 'bearer' && (
        <div className="space-y-2">
          <Label>Token</Label>
          <Input
            type="password"
            value={auth.token || ''}
            onChange={(e) => updateAuth({ token: e.target.value })}
            placeholder="输入 Bearer Token"
            className="bg-slate-800 border-slate-700 font-mono"
          />
          <p className="text-sm text-slate-500">
            请求会自动添加 <code className="text-cyan-400">Authorization: Bearer {'{{'}token{'}'}}</code>
          </p>
        </div>
      )}

      {/* API Key */}
      {auth.type === 'api_key' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Key 名称</Label>
            <Input
              value={auth.key || ''}
              onChange={(e) => updateAuth({ key: e.target.value })}
              placeholder="例如：X-API-Key"
              className="bg-slate-800 border-slate-700 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Key 值</Label>
            <Input
              type="password"
              value={auth.value || ''}
              onChange={(e) => updateAuth({ value: e.target.value })}
              placeholder="输入 API Key 值"
              className="bg-slate-800 border-slate-700 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>添加到</Label>
            <CustomSelect
              value={auth.addTo || 'header'}
              onChange={(val) => updateAuth({ addTo: val as 'header' | 'query' })}
              options={[
                { label: 'Header', value: 'header' },
                { label: 'Query 参数', value: 'query' }
              ]}
            />
          </div>
        </div>
      )}

      {/* Basic Auth */}
      {auth.type === 'basic' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input
              value={auth.username || ''}
              onChange={(e) => updateAuth({ username: e.target.value })}
              placeholder="输入用户名"
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div className="space-y-2">
            <Label>密码</Label>
            <Input
              type="password"
              value={auth.password || ''}
              onChange={(e) => updateAuth({ password: e.target.value })}
              placeholder="输入密码"
              className="bg-slate-800 border-slate-700"
            />
          </div>
        </div>
      )}

      {/* 无认证 */}
      {auth.type === 'none' && (
        <div className="text-center py-8 text-slate-500">
          当前请求不使用认证
        </div>
      )}
    </div>
  )
}
