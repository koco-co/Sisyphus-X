/**
 * 关键字编辑器组件
 *
 * 功能：
 * - 编辑关键字基本信息
 * - 编辑 Python 代码
 * - 定义参数
 * - 测试关键字
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Save, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface KeywordEditorProps {
  keywordId?: number
  projectId: number
  initialData?: {
    name?: string
    func_name?: string
    category?: string
    description?: string
    function_code?: string
    params_schema?: Record<string, any>
  }
  onSave?: (data: any) => Promise<void>
}

export function KeywordEditor({
  keywordId,
  projectId,
  initialData,
  onSave
}: KeywordEditorProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    func_name: initialData?.func_name || '',
    category: initialData?.category || 'custom',
    description: initialData?.description || '',
    function_code: initialData?.function_code || `def ${initialData?.func_name || 'custom_keyword'}():
    """自定义关键字"""
    # 在这里实现你的逻辑
    pass
`,
    params_schema: initialData?.params_schema || {}
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validation, setValidation] = useState<{
    valid: boolean
    error?: string
  } | null>(null)

  const [testResult, setTestResult] = useState<{
    success: boolean
    result?: any
    error?: string
  } | null>(null)

  const [isTesting, setIsTesting] = useState(false)

  const handleValidateCode = async () => {
    setIsValidating(true)
    try {
      // TODO: 调用后端验证 API
      // const result = await keywordsApi.validate(formData.function_code)
      // setValidation(result)

      // 简单的本地语法检查
      try {
        // 尝试编译代码
        new Function(formData.function_code)
        setValidation({ valid: true })
      } catch (err: any) {
        setValidation({ valid: false, error: err.message })
      }
    } catch (error) {
      console.error('验证失败:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleTestKeyword = async () => {
    setIsTesting(true)
    try {
      // TODO: 调用后端测试 API
      // const result = await keywordsApi.test(keywordId, testParams)
      // setTestResult(result)

      // 简单的本地测试
      try {
        const func = new Function(formData.function_code)
        const result = func()
        setTestResult({ success: true, result })
      } catch (err: any) {
        setTestResult({ success: false, error: err.message })
      }
    } catch (error) {
      console.error('测试失败:', error)
      setTestResult({ success: false, error: '测试失败' })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      await onSave(formData)
      console.log('✅ 关键字已保存')
    } catch (error) {
      console.error('❌ 保存失败:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="keyword-editor space-y-6">
      {/* 基本信息 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">关键字编辑器</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              关键字名称 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="例如：自定义断言"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              函数名 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="例如：custom_assertion"
              value={formData.func_name}
              onChange={(e) => setFormData({ ...formData, func_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">分类</label>
            <Input
              placeholder="例如：断言"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">描述</label>
            <Input
              placeholder="关键字功能描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">描述</label>
          <Textarea
            placeholder="详细描述关键字的用途和使用方法"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />
        </div>
      </Card>

      {/* 函数代码 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">函数代码</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidateCode}
            disabled={isValidating}
          >
            {isValidating ? (
              <>验证中...</>
            ) : (
              <>验证代码</>
            )}
          </Button>
        </div>

        {/* 验证结果 */}
        {validation && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            validation.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {validation.valid ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span className="text-sm">
              {validation.valid ? '代码语法正确' : validation.error}
            </span>
          </div>
        )}

        <Textarea
          value={formData.function_code}
          onChange={(e) => setFormData({ ...formData, function_code: e.target.value })}
          rows={15}
          className="font-mono text-sm"
          placeholder="def custom_keyword():
    pass"
        />
      </Card>

      {/* 测试区域 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">测试关键字</h3>
          <Button
            size="sm"
            onClick={handleTestKeyword}
            disabled={isTesting || !validation?.valid}
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                测试中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                运行测试
              </>
            )}
          </Button>
        </div>

        {/* 测试结果 */}
        {testResult && (
          <div className={`p-4 rounded-lg ${
            testResult.success ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
          }`}>
            <div className="font-medium mb-2">
              {testResult.success ? '✅ 测试通过' : '❌ 测试失败'}
            </div>
            {testResult.result && (
              <pre className="text-sm overflow-auto">
                {JSON.stringify(testResult.result, null, 2)}
              </pre>
            )}
            {testResult.error && (
              <p className="text-sm">{testResult.error}</p>
            )}
          </div>
        )}
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSave}
          disabled={isSaving || !formData.name || !formData.func_name}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              保存关键字
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
