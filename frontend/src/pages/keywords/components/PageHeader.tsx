/**
 * 页面标题组件
 *
 * 功能：显示页面标题、描述和创建按钮
 *
 * 参考：frontend/src/pages/api-automation/ApiTestCaseList.tsx (145-166行)
 */

import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  title: string
  description: string
  onCreateClick: () => void
  createButtonText: string
  'data-testid'?: string
}

export function PageHeader({
  title,
  description,
  onCreateClick,
  createButtonText,
  'data-testid': dataTestid
}: PageHeaderProps) {
  return (
    <motion.header
      className="flex justify-between items-center"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid={dataTestid}
    >
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          {title}
        </h1>
        <p className="text-slate-400 mt-2">{description}</p>
      </div>

      <motion.button
        onClick={onCreateClick}
        className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-2xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        data-testid="create-keyword-button"
      >
        <Plus className="w-5 h-5" />
        {createButtonText}
      </motion.button>
    </motion.header>
  )
}
