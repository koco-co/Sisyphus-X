/**
 * 关键字编辑器组件
 *
 * 功能：
 * - 编辑关键字基本信息
 * - 编辑 Python 代码
 * - 定义参数
 * - 测试关键字
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { MonacoEditor } from '@/components/ui/MonacoEditor'
import { Save, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface KeywordEditorProps {
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
  initialData,
  onSave
}: KeywordEditorProps) {
  const { t } = useTranslation()
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
        <h2 className="text-lg font-semibold mb-4">{t('keywords.keywordInfo')}</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('keywords.keywordName')} <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder={t('keywords.newKeyword')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              data-testid="keyword-name-input"
            />
            {!formData.name && (
              <p className="text-red-500 text-sm mt-1" data-testid="keyword-name-error">{t('keywords.keywordRequired')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('keywords.keywordType')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="border rounded-lg px-3 py-2 w-full"
              data-testid="keyword-type-select"
            >
              <option value="action">操作 (action)</option>
              <option value="assertion">断言 (assertion)</option>
              <option value="setup">前置 (setup)</option>
              <option value="teardown">后置 (teardown)</option>
              <option value="custom">自定义 (custom)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('keywords.methodName')} <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="例如：custom_assertion"
              value={formData.func_name}
              onChange={(e) => setFormData({ ...formData, func_name: e.target.value })}
              data-testid="keyword-func-name-input"
            />
            {!formData.func_name && (
              <p className="text-red-500 text-sm mt-1">{t('keywords.funcNameRequired')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('keywords.description')}</label>
            <Input
              placeholder={t('keywords.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="keyword-description-input"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">{t('keywords.detailedDesc')}</label>
          <Textarea
            placeholder={t('keywords.detailedDesc')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            data-testid="keyword-description-textarea"
          />
        </div>
      </Card>

      {/* 函数代码 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('keywords.functionCode')}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidateCode}
            disabled={isValidating}
          >
            {isValidating ? (
              <>{t('keywords.validating')}</>
            ) : (
              <>{t('keywords.validateCode')}</>
            )}
          </Button>
        </div>

        {/* 验证结果 */}
        {validation && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            validation.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`} data-testid={validation.valid ? 'validation-success' : 'syntax-error-message'}>
            {validation.valid ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span className="text-sm">
              {validation.valid ? t('keywords.syntaxCorrect') : validation.error}
            </span>
          </div>
        )}

        <div className="h-[400px] border rounded-lg overflow-hidden">
          <MonacoEditor
            value={formData.function_code}
            onChange={(value) => setFormData({ ...formData, function_code: value })}
            language="python"
            height="100%"
          />
        </div>
      </Card>

      {/* 测试区域 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('keywords.testArea')}</h3>
          <Button
            size="sm"
            onClick={handleTestKeyword}
            disabled={isTesting || !validation?.valid}
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('keywords.runningTest')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                {t('keywords.testKeyword')}
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
              {testResult.success ? `✅ ${t('keywords.testPassed')}` : `❌ ${t('keywords.testFailed')}`}
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
          data-testid="submit-keyword-button"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('common.saving')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t('keywords.saveKeyword')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
