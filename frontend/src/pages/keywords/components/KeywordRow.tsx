/**
 * 关键字行组件
 *
 * 功能：显示单个关键字的详细信息
 *
 * 参考：frontend/src/pages/api-automation/ApiTestCaseList.tsx (249-351行)
 */

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Power, PowerOff, Edit, Trash2, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Keyword } from '../types'

interface KeywordRowProps {
  keyword: Keyword
  index: number
  onEdit: (keyword: Keyword) => void
  onDelete: (keyword: Keyword) => void
  onToggleStatus: (id: string) => void
  onCopyMethodName?: (methodName: string) => void
  formatDate: (dateStr: string) => string
}

export function KeywordRow({
  keyword,
  index,
  onEdit,
  onDelete,
  onToggleStatus,
  onCopyMethodName,
  formatDate,
}: KeywordRowProps) {
  return (
    <motion.tr
      key={keyword.id}
      className="hover:bg-white/5 transition-colors group"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* 名称 */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{keyword.name}</span>
          {keyword.description && (
            <span className="text-slate-500 text-sm truncate max-w-xs">
              {keyword.description}
            </span>
          )}
        </div>
      </td>

      {/* 方法名 */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <code className="text-cyan-400 font-mono text-sm">
            {keyword.method_name}
          </code>
          {onCopyMethodName && (
            <button
              onClick={() => onCopyMethodName(keyword.method_name)}
              className="p-1 text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              title="复制方法名"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>

      {/* 类名 */}
      <td className="px-6 py-4">
        <code className="text-slate-400 font-mono text-sm">{keyword.class_name}</code>
      </td>

      {/* 类型 */}
      <td className="px-6 py-4">
        <Badge variant={keyword.is_built_in ? 'secondary' : 'default'}>
          {keyword.is_built_in ? '内置' : '自定义'}
        </Badge>
      </td>

      {/* 状态 */}
      <td className="px-6 py-4">
        <Badge
          variant={keyword.is_enabled ? 'default' : 'secondary'}
          className={cn(
            "gap-1.5",
            keyword.is_enabled
              ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"
          )}
        >
          {keyword.is_enabled ? '已启用' : '已禁用'}
        </Badge>
      </td>

      {/* 更新时间 */}
      <td className="px-6 py-4">
        <span className="text-slate-400 text-sm">{formatDate(keyword.updated_at)}</span>
      </td>

      {/* 操作 */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 justify-end">
          {/* 切换状态 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleStatus(keyword.id)}
            className={cn(
              "transition-colors",
              keyword.is_enabled
                ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                : "text-slate-400 hover:text-slate-300 hover:bg-slate-500/10"
            )}
            title={keyword.is_enabled ? '禁用' : '启用'}
          >
            {keyword.is_enabled ? (
              <Power className="w-4 h-4" />
            ) : (
              <PowerOff className="w-4 h-4" />
            )}
          </Button>

          {/* 编辑 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(keyword)}
            className="text-slate-400 hover:text-white hover:bg-white/5"
            title="编辑"
          >
            <Edit className="w-4 h-4" />
          </Button>

          {/* 删除 */}
          {!keyword.is_built_in && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(keyword)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </td>
    </motion.tr>
  )
}
