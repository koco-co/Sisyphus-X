/**
 * 关键字 Table 组件
 *
 * 功能：使用 Table 展示关键字列表，替代 Card 列表
 *
 * 参考：frontend/src/pages/global-params/index.tsx (266-342行)
 */

import { motion } from 'framer-motion'
import { Loader2, Code } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KeywordRow } from './KeywordRow'
import type { Keyword } from '../types'

interface KeywordTableProps {
  keywords: Keyword[]
  isLoading: boolean
  onEdit: (keyword: Keyword) => void
  onDelete: (keyword: Keyword) => void
  onToggleStatus: (id: string) => void
  onCopyMethodName?: (methodName: string) => void
}

export function KeywordTable({
  keywords,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
  onCopyMethodName,
}: KeywordTableProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <motion.div
      className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {isLoading ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          加载中...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">名称</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">方法名</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">类名</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">类型</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">状态</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">更新时间</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {keywords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Code className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">暂无关键字</p>
                      <p className="text-sm">创建您的第一个关键字</p>
                    </div>
                  </td>
                </tr>
              ) : (
                keywords.map((keyword, index) => (
                  <KeywordRow
                    key={keyword.id}
                    keyword={keyword}
                    index={index}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleStatus={onToggleStatus}
                    onCopyMethodName={onCopyMethodName}
                    formatDate={formatDate}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}
