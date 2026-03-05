/**
 * 页面标题组件
 *
 * 功能：显示页面标题、描述和创建按钮
 * 布局与 ProjectManagement.tsx 保持一致
 */

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description: string
  icon?: ReactNode
  onCreateClick?: () => void
  createButtonText?: string
  showCreateButton?: boolean
  'data-testid'?: string
}

export function PageHeader({
  title,
  description,
  icon,
  onCreateClick,
  createButtonText = '新建',
  showCreateButton = true,
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
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          {icon}
          {title}
        </h1>
        <p className="text-slate-400">{description}</p>
      </div>

      {showCreateButton && onCreateClick && (
        <motion.button
          onClick={onCreateClick}
          className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-cyan-500/20"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          data-testid="create-keyword-button"
        >
          <Plus className="w-5 h-5" />
          {createButtonText}
        </motion.button>
      )}
    </motion.header>
  )
}
