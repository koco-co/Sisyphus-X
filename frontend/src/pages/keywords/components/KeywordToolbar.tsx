/**
 * 关键字工具栏组件
 *
 * 功能：集成所有筛选控件（项目选择、类型筛选、搜索、显示内置开关）
 *
 * 参考：frontend/src/pages/api-automation/ApiTestCaseList.tsx (169-221行)
 */

import { Search, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KeywordToolbarProps {
  // 项目相关
  projects: Array<{ id: string; name: string; key: string }>
  selectedProject: string | null
  onProjectChange: (projectId: string | null) => void
  projectsLoading?: boolean

  // 类型筛选
  selectedType: string
  onTypeChange: (type: string) => void
  typeOptions?: string[]

  // 搜索
  searchTerm: string
  onSearchChange: (term: string) => void
  searchPlaceholder?: string

  // 显示内置关键字
  showBuiltIn: boolean
  onToggleBuiltIn: () => void

  // 额外的操作按钮
  extraActions?: React.ReactNode

  // 测试ID
  'data-testid'?: string
}

export function KeywordToolbar({
  projects,
  selectedProject,
  onProjectChange,
  projectsLoading = false,
  selectedType,
  onTypeChange,
  typeOptions = ['all', 'request', 'assertion', 'extract', 'db', 'custom'],
  searchTerm,
  onSearchChange,
  searchPlaceholder = '搜索关键字名称或方法名...',
  showBuiltIn,
  onToggleBuiltIn,
  extraActions,
  'data-testid': dataTestid,
}: KeywordToolbarProps) {
  return (
    <div className="glass rounded-2xl p-4 mb-8" data-testid={dataTestid}>
      <div className="flex flex-wrap gap-4 items-center">
        {/* 项目选择器 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-white whitespace-nowrap">
            项目：
          </label>
          {projectsLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-sm text-slate-400">加载中...</span>
            </div>
          ) : (
            <select
              value={selectedProject || ''}
              onChange={(e) => onProjectChange(e.target.value || null)}
              className="w-48 h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              data-testid="project-select"
            >
              <option value="" className="bg-slate-900">全部项目</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id} className="bg-slate-900">
                  {project.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 类型筛选 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-white whitespace-nowrap">
            类型：
          </label>
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-40 h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
            data-testid="type-select"
          >
            {typeOptions.map((type) => (
              <option key={type} value={type} className="bg-slate-900">
                {type === 'all' ? '全部类型' : type}
              </option>
            ))}
          </select>
        </div>

        {/* 搜索框 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-10 bg-slate-900 border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            data-testid="keyword-search-input"
          />
        </div>

        {/* 显示内置关键字开关 */}
        <button
          onClick={onToggleBuiltIn}
          className={cn(
            "px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap",
            showBuiltIn
              ? "bg-cyan-500 text-white"
              : "bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
          )}
        >
          {showBuiltIn ? (
            <ToggleRight className="w-5 h-5" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
          显示内置
        </button>

        {/* 额外操作按钮 */}
        {extraActions}
      </div>
    </div>
  )
}
