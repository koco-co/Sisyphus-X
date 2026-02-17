import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, HelpCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import MonacoEditor from '@monaco-editor/react'

// TypeScript 类型定义
interface ParameterInfo {
    name: string
    type: string
    description: string
}

interface ReturnValueInfo {
    type: string
    description: string
}

interface ParsedDocstring {
    class_name: string
    method_name: string
    description: string
    parameters: ParameterInfo[]
    return_value: ReturnValueInfo
}

interface GlobalParam {
    id: string
    class_name: string
    method_name: string
    code: string
    description: string | null
    parameters: ParameterInfo[] | null
    return_value: ReturnValueInfo | null
    created_at: string
    updated_at: string
}

interface EditGlobalParamDialogProps {
    isOpen: boolean
    param: GlobalParam
    onClose: () => void
    onSubmit: (result: ParsedDocstring & { code: string }) => void
    isSubmitting: boolean
}

export default function EditGlobalParamDialog({
    isOpen,
    param,
    onClose,
    onSubmit,
    isSubmitting
}: EditGlobalParamDialogProps) {
    const [code, setCode] = useState(param.code)
    const [parsedResult, setParsedResult] = useState<ParsedDocstring | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const { toast } = useToast()
    const [showDocstringHelp, setShowDocstringHelp] = useState(false)

    // 当 param 改变时更新代码
    useEffect(() => {
        setCode(param.code)
    }, [param])

    // 解析 Google docstring (与创建对话框相同的逻辑)
    const parseDocstring = (pythonCode: string): ParsedDocstring | null => {
        try {
            // 提取类名
            const classMatch = pythonCode.match(/class\s+(\w+):/)
            if (!classMatch) return null
            const className = classMatch[1]

            // 提取方法名
            const methodMatch = pythonCode.match(/def\s+(\w+)\s*\(/)
            if (!methodMatch) return null
            const methodName = methodMatch[1]

            // 提取方法文档字符串
            const methodDocMatch = pythonCode.match(
                new RegExp(`def\\s+${methodName}\\s*\\([^)]*\\)[^:]*:\\s*"""([\\s\\S]*?)"""`)
            )
            if (!methodDocMatch) {
                return {
                    class_name: className,
                    method_name: methodName,
                    description: '-',
                    parameters: [],
                    return_value: { type: '-', description: '-' }
                }
            }

            const docstring = methodDocMatch[1].trim()

            // 提取功能描述
            const descMatch = docstring.match(/^([\s\S]*?)(?=Args:|Returns:|Example:|$)/)
            const description = descMatch ? descMatch[1].trim() : '-'

            // 提取 Args 参数
            const argsMatch = docstring.match(/Args:\s*\n([\s\S]*?)(?=Returns:|Example:|$)/)
            const parameters: ParameterInfo[] = []
            if (argsMatch) {
                const argLines = argsMatch[1].trim().split('\n')
                argLines.forEach((line) => {
                    const argMatch = line.match(/\s*(\w+)\s*\(([^)]+)\):\s*(.*)/)
                    if (argMatch) {
                        parameters.push({
                            name: argMatch[1],
                            type: argMatch[2],
                            description: argMatch[3].trim()
                        })
                    }
                })
            }

            // 提取 Returns 返回值
            const returnsMatch = docstring.match(/Returns:\s*\n([\s\S]*?)(?=Example:|$)/)
            let returnValue: ReturnValueInfo = { type: '-', description: '-' }
            if (returnsMatch) {
                const returnText = returnsMatch[1].trim()
                const returnTypeMatch = returnText.match(/\(([^)]+)\):\s*(.*)/)
                if (returnTypeMatch) {
                    returnValue = {
                        type: returnTypeMatch[1],
                        description: returnTypeMatch[2].trim()
                    }
                } else {
                    returnValue = {
                        type: '-',
                        description: returnText
                    }
                }
            }

            return {
                class_name: className,
                method_name: methodName,
                description,
                parameters,
                return_value: returnValue
            }
        } catch (error) {
            console.error('Failed to parse docstring:', error)
            return null
        }
    }

    // 处理保存
    const handleSave = () => {
        if (!code.trim()) {
            toast.error('请输入代码')
            return
        }

        const parsed = parseDocstring(code)
        if (!parsed) {
            toast.error('无法解析代码，请确保使用 Google docstring 格式')
            return
        }

        setParsedResult(parsed)
        setShowConfirmDialog(true)
    }

    // 确认提交
    const handleConfirmSubmit = () => {
        if (parsedResult) {
            onSubmit({ ...parsedResult, code })
        }
    }

    if (!isOpen) return null

    return (
        <>
            <AnimatePresence>
                {isOpen && !showConfirmDialog && (
                    <>
                        {/* 背景遮罩 */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />

                        {/* 对话框 */}
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
                            >
                                {/* 头部 */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-semibold text-white">编辑全局参数</h2>
                                        <button
                                            onClick={() => setShowDocstringHelp(!showDocstringHelp)}
                                            className="p-1 text-slate-400 hover:text-cyan-400 transition-colors"
                                            title="查看 Google docstring 规范"
                                        >
                                            <HelpCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Google docstring 帮助 */}
                                {showDocstringHelp && (
                                    <div className="px-6 py-4 bg-cyan-500/5 border-b border-cyan-500/10">
                                        <h3 className="text-sm font-semibold text-cyan-400 mb-2">
                                            Google docstring 规范
                                        </h3>
                                        <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap bg-slate-800/50 p-3 rounded-lg">
{`def method_name(self, param1: type1, param2: type2) -> return_type:
    """
    功能描述（简短说明方法的作用）

    Args:
        param1 (type1): 参数1描述
        param2 (type2): 参数2描述

    Returns:
        return_type: 返回值描述

    Example:
        >>> example = method_name("value")
        >>> print(example)
        "result"
    """
    pass`}
                                        </pre>
                                    </div>
                                )}

                                {/* 编辑器 */}
                                <div className="p-6">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Python 代码
                                        </label>
                                        <div className="border border-white/10 rounded-xl overflow-hidden">
                                            <MonacoEditor
                                                height="400px"
                                                language="python"
                                                theme="vs-dark"
                                                value={code}
                                                onChange={(value) => setCode(value || '')}
                                                options={{
                                                    minimap: { enabled: false },
                                                    fontSize: 14,
                                                    lineNumbers: 'on',
                                                    scrollBeyondLastLine: false,
                                                    automaticLayout: true,
                                                    tabSize: 4,
                                                    wordWrap: 'on'
                                                }}
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-slate-500">
                                            系统会自动解析 Google docstring 格式的注释，提取类名、方法名、功能描述、入参和出参信息。
                                        </p>
                                    </div>
                                </div>

                                {/* 底部按钮 */}
                                <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5 bg-slate-800/30">
                                    <button
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                        className="px-6 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 font-medium transition-all disabled:opacity-50"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSubmitting}
                                        className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                保存中...
                                            </>
                                        ) : (
                                            '下一步'
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* 确认对话框 */}
            <AnimatePresence>
                {showConfirmDialog && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />

                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl"
                            >
                                <div className="px-6 py-4 border-b border-white/5">
                                    <h2 className="text-xl font-semibold text-white">确认解析结果</h2>
                                    <p className="text-sm text-slate-400 mt-1">
                                        请确认以下自动解析的信息是否正确
                                    </p>
                                </div>

                                {parsedResult && (
                                    <div className="p-6 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                                    类名
                                                </label>
                                                <p className="text-white font-mono text-sm bg-slate-800 px-3 py-2 rounded-lg">
                                                    {parsedResult.class_name}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                                    方法名
                                                </label>
                                                <p className="text-cyan-400 font-mono text-sm bg-slate-800 px-3 py-2 rounded-lg">
                                                    {parsedResult.method_name}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                                功能描述
                                            </label>
                                            <p className="text-white text-sm bg-slate-800 px-3 py-2 rounded-lg">
                                                {parsedResult.description}
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                                入参
                                            </label>
                                            {parsedResult.parameters.length > 0 ? (
                                                <div className="bg-slate-800 rounded-lg overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-slate-700/50">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left text-slate-400 font-medium">
                                                                    参数名
                                                                </th>
                                                                <th className="px-3 py-2 text-left text-slate-400 font-medium">
                                                                    类型
                                                                </th>
                                                                <th className="px-3 py-2 text-left text-slate-400 font-medium">
                                                                    描述
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {parsedResult.parameters.map((param, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="px-3 py-2 text-white font-mono">
                                                                        {param.name}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-cyan-400 font-mono">
                                                                        {param.type}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-slate-400">
                                                                        {param.description}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 text-sm bg-slate-800 px-3 py-2 rounded-lg">
                                                    -
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                                出参
                                            </label>
                                            <div className="bg-slate-800 px-3 py-2 rounded-lg">
                                                <p className="text-cyan-400 font-mono text-sm">
                                                    {parsedResult.return_value.type}
                                                </p>
                                                <p className="text-slate-400 text-sm mt-1">
                                                    {parsedResult.return_value.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5 bg-slate-800/30">
                                    <button
                                        onClick={() => setShowConfirmDialog(false)}
                                        disabled={isSubmitting}
                                        className="px-6 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 font-medium transition-all disabled:opacity-50"
                                    >
                                        返回修改
                                    </button>
                                    <button
                                        onClick={handleConfirmSubmit}
                                        disabled={isSubmitting}
                                        className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                保存中...
                                            </>
                                        ) : (
                                            '确认保存'
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
