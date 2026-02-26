/**
 * 后续规划模块占位页（需求文档 §9）
 * 用于 /cases、/data、/functional-test/* 等暂未开放的入口
 */
import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'

export default function PlaceholderPage() {
  const location = useLocation()
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
      <Construction className="w-16 h-16 mb-4 text-cyan-500/60" />
      <h2 className="text-xl font-medium text-white/90 mb-2">功能规划中</h2>
      <p className="text-sm mb-1">该模块为后续迭代内容，当前版本仅做结构预留。</p>
      <p className="text-xs text-slate-500">路径: {location.pathname}</p>
    </div>
  )
}
