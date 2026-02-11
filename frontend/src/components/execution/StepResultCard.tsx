/**
 * 步骤结果卡片组件
 *
 * 功能：
 * - 显示单个步骤的执行结果
 * - 展开/折叠详细信息
 * - 显示错误信息
 */

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react'

interface StepResultCardProps {
  step: {
    name: string
    status: string
    duration: number
    error?: string
    performance?: {
      total_time: number
      dns_time?: number
      tcp_time?: number
    }
  }
  index: number
}

export function StepResultCard({ step, index }: StepResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const isSuccess = step.status === 'success' || step.status === 'passed'

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 步骤头部 */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-sm text-gray-500 w-8">#{index + 1}</span>

        {isSuccess ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600" />
        )}

        <span className="flex-1 font-medium">{step.name}</span>

        <Badge variant={isSuccess ? 'default' : 'destructive'}>
          {step.status}
        </Badge>

        <span className="text-sm text-gray-500">
          {step.duration.toFixed(3)}s
        </span>

        {step.performance && (
          <span className="text-sm text-gray-400">
            ({step.performance.total_time.toFixed(0)}ms)
          </span>
        )}

        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* 详细信息 */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 border-t space-y-3">
          {/* 错误信息 */}
          {step.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-medium text-red-800 mb-1">错误信息:</div>
              <div className="text-sm text-red-700 font-mono">{step.error}</div>
            </div>
          )}

          {/* 性能详情 */}
          {step.performance && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">总耗时</div>
                <div className="font-medium">{step.performance.total_time.toFixed(2)}ms</div>
              </div>
              {step.performance.dns_time && (
                <div>
                  <div className="text-sm text-gray-500">DNS</div>
                  <div className="font-medium">{step.performance.dns_time.toFixed(2)}ms</div>
                </div>
              )}
              {step.performance.tcp_time && (
                <div>
                  <div className="text-sm text-gray-500">TCP</div>
                  <div className="font-medium">{step.performance.tcp_time.toFixed(2)}ms</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
