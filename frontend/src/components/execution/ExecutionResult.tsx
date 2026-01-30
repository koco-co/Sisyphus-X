/**
 * 执行结果展示组件
 *
 * 功能：
 * - 展示测试用例执行结果
 * - 显示步骤详情
 * - 展示性能指标
 * - 显示统计信息
 */

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'
import { StepResultCard } from './StepResultCard'

interface ExecutionResultProps {
  result: {
    success: boolean
    test_case: {
      name: string
      status: string
      duration: number
    }
    steps: Array<{
      name: string
      status: string
      duration: number
      error?: string
      performance?: {
        total_time: number
        dns_time?: number
        tcp_time?: number
        tls_time?: number
        server_time?: number
      }
    }>
    statistics: {
      total_steps: number
      passed_steps: number
      failed_steps: number
      pass_rate: number
    }
  }
}

export function ExecutionResult({ result }: ExecutionResultProps) {
  const { success, test_case, steps, statistics } = result

  return (
    <div className="execution-result space-y-6">
      {/* 测试用例结果概览 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {success ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
            <div>
              <h2 className="text-xl font-bold">{test_case.name}</h2>
              <p className="text-sm text-gray-500">
                状态: {success ? '通过' : '失败'}
              </p>
            </div>
          </div>

          <Badge variant={success ? 'default' : 'destructive'} className="text-lg px-4 py-2">
            {test_case.status.toUpperCase()}
          </Badge>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{statistics.total_steps}</div>
            <div className="text-sm text-gray-500">总步骤数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{statistics.passed_steps}</div>
            <div className="text-sm text-gray-500">通过</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{statistics.failed_steps}</div>
            <div className="text-sm text-gray-500">失败</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{statistics.pass_rate.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">通过率</div>
          </div>
        </div>

        {/* 执行时间 */}
        <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>总耗时: {test_case.duration.toFixed(2)} 秒</span>
        </div>
      </Card>

      {/* 步骤详情 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">步骤详情</h3>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <StepResultCard
              key={index}
              step={step}
              index={index}
            />
          ))}
        </div>
      </Card>

      {/* 性能指标汇总 */}
      {steps.some(s => s.performance) && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5" />
            <h3 className="text-lg font-semibold">性能指标</h3>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => (
              step.performance && (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm font-medium">{step.name}</span>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>总计: {step.performance.total_time.toFixed(0)}ms</span>
                    {step.performance.dns_time && <span>DNS: {step.performance.dns_time.toFixed(0)}ms</span>}
                    {step.performance.tcp_time && <span>TCP: {step.performance.tcp_time.toFixed(0)}ms</span>}
                    {step.performance.tls_time && <span>TLS: {step.performance.tls_time.toFixed(0)}ms</span>}
                    {step.performance.server_time && <span>服务器: {step.performance.server_time.toFixed(0)}ms</span>}
                  </div>
                </div>
              )
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
