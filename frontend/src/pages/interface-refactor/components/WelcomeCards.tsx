import { Plus, FileText, Clock, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface WelcomeCardsProps {
  recentInterfaces?: Array<{
    id: number
    name: string
    method: string
  }>
  projectId: number
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400',
  POST: 'bg-amber-500/20 text-amber-400',
  PUT: 'bg-cyan-500/20 text-cyan-400',
  DELETE: 'bg-red-500/20 text-red-400',
  PATCH: 'bg-violet-500/20 text-violet-400',
}

export function WelcomeCards({ recentInterfaces = [], projectId }: WelcomeCardsProps) {
  const navigate = useNavigate()

  const handleNewRequest = () => {
    navigate(`/api/interfaces/new?projectId=${projectId}`)
  }

  const handleImportCurl = () => {
    // TODO: 触发 cURL 导入弹窗
    navigate(`/api/interfaces/new?projectId=${projectId}&mode=curl`)
  }

  const handleOpenInterface = (id: number) => {
    navigate(`/api/interfaces/${id}`)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            接口管理
          </h1>
          <p className="text-slate-400 text-lg">
            创建、管理和调试 API 接口
          </p>
        </div>

        {/* 操作卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* 新建请求 */}
          <motion.button
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNewRequest}
            className="group relative bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-2xl p-8 text-left hover:border-cyan-500/40 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Plus className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  新建请求
                </h3>
                <p className="text-slate-400 mb-4">
                  创建一个新的 API 接口请求
                </p>
                <div className="flex items-center text-cyan-400 text-sm font-medium">
                  立即创建
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.button>

          {/* 导入 cURL */}
          <motion.button
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleImportCurl}
            className="group relative bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-8 text-left hover:border-amber-500/40 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <FileText className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  导入 cURL
                </h3>
                <p className="text-slate-400 mb-4">
                  从 cURL 命令快速导入接口
                </p>
                <div className="flex items-center text-amber-400 text-sm font-medium">
                  立即导入
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.button>
        </div>

        {/* 最近使用 */}
        {recentInterfaces.length > 0 && (
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-white">
                最近使用
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {recentInterfaces.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ x: 4 }}
                  onClick={() => handleOpenInterface(item.id)}
                  className="flex items-center gap-4 p-4 bg-slate-800/50 border border-white/5 rounded-xl hover:bg-slate-800 hover:border-cyan-500/30 transition-all text-left group"
                >
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold",
                    METHOD_COLORS[item.method] || METHOD_COLORS['GET']
                  )}>
                    {item.method}
                  </span>
                  <span className="flex-1 text-slate-300 group-hover:text-white">
                    {item.name}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400" />
                </motion.button>
              ))}
            </div>

            <button
              onClick={() => navigate(`/api/interfaces?projectId=${projectId}`)}
              className="mt-4 text-center w-full py-3 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
            >
              查看全部接口 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
