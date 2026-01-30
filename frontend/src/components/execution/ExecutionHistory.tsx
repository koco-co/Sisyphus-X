/**
 * 执行历史组件
 *
 * 功能：
 * - 展示测试用例的执行历史
 * - 查看历史结果
 * - 对比不同执行
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

interface ExecutionHistoryProps {
  testCaseId: number
  executions?: Array<{
    id: number
    status: string
    duration?: number
    started_at: string
    completed_at?: string
  }>
  onViewResult?: (executionId: number) => void
}

export function ExecutionHistory({
  testCaseId,
  executions = [],
  onViewResult
}: ExecutionHistoryProps) {
  const [selectedExecution, setSelectedExecution] = useState<number | null>(null)

  if (executions.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-400">
        <p>暂无执行记录</p>
      </Card>
    )
  }

  return (
    <div className="execution-history space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">执行历史</h3>
        <span className="text-sm text-gray-500">共 {executions.length} 条记录</span>
      </div>

      <div className="space-y-2">
        {executions.map((execution) => {
          const isSuccess = execution.status === 'success'

          return (
            <Card
              key={execution.id}
              className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                selectedExecution === execution.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedExecution(execution.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isSuccess ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}

                  <div>
                    <div className="font-medium">
                      执行 #{execution.id}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {new Date(execution.started_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant={isSuccess ? 'default' : 'destructive'}>
                    {execution.status}
                  </Badge>

                  {execution.duration && (
                    <span className="text-sm text-gray-600">
                      {execution.duration.toFixed(2)}s
                    </span>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewResult?.(execution.id)
                    }}
                  >
                    查看详情
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
