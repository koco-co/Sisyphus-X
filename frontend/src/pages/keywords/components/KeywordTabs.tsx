/**
 * 关键字 Tabs 组件
 *
 * 功能：切换自定义关键字和内置关键字视图
 *
 * 参考：frontend/src/pages/api-automation/ProjectSettings.tsx (326-340行)
 */

import { Code, FileCode } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabType = 'custom' | 'builtin'

interface KeywordTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  'data-testid'?: string
}

const TABS = [
  { id: 'custom' as const, label: '自定义关键字', icon: Code },
  { id: 'builtin' as const, label: '内置关键字', icon: FileCode },
]

export function KeywordTabs({ activeTab, onTabChange, 'data-testid': dataTestid }: KeywordTabsProps) {
  return (
    <div className="flex gap-2 bg-slate-900/50 p-1 rounded-2xl w-fit" data-testid={dataTestid}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all",
            activeTab === tab.id
              ? "bg-cyan-500/20 text-cyan-400"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
          data-testid={`tab-${tab.id}`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  )
}
