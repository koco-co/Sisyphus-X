/**
 * 变量解析器
 * 支持 {{variable}} 和 {{$variable}} 语法
 */

export interface VariableContext {
  envVars?: Record<string, string>
  additionalVars?: Record<string, string>
}

/**
 * 系统变量生成器
 */
const systemVars: Record<string, (...args: any[]) => string> = {
  $timestamp: () => String(Math.floor(Date.now() / 1000)),
  $timestampMs: () => String(Date.now()),
  $date: (format = 'YYYY-MM-DD') => {
    const now = new Date()
    return format
      .replace('YYYY', String(now.getFullYear()))
      .replace('MM', String(now.getMonth() + 1).padStart(2, '0'))
      .replace('DD', String(now.getDate()).padStart(2, '0'))
      .replace('HH', String(now.getHours()).padStart(2, '0'))
      .replace('mm', String(now.getMinutes()).padStart(2, '0'))
      .replace('ss', String(now.getSeconds()).padStart(2, '0'))
  },
  $randomInt: (min = 1, max = 100) => {
    return String(Math.floor(Math.random() * (max - min + 1)) + min)
  },
  $guid: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }
}

/**
 * 替换系统变量
 */
function replaceSystemVars(text: string): string {
  // 匹配 {{$varName}} 或 {{$varName(args)}} 格式
  return text.replace(/\{\{(\$[\w]+)(?:\(([^)]*)\))?\}\}/g, (_, varName, args) => {
    const func = systemVars[varName]
    if (!func) {
      return _ // 未知系统变量，保持原样
    }

    // 解析参数
    const params = args ? args.split(',').map(a => a.trim().replace(/^['"`]|['"`]$/g, '')) : []
    try {
      return func(...params)
    } catch {
      return _
    }
  })
}

/**
 * 替换环境变量
 */
function replaceEnvVars(
  text: string,
  envVars: Record<string, string> = {},
  additionalVars: Record<string, string> = {}
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    // 优先使用附加变量
    if (additionalVars[varName] !== undefined) {
      return additionalVars[varName]
    }
    // 其次使用环境变量
    if (envVars[varName] !== undefined) {
      return envVars[varName]
    }
    // 未找到变量，保持原样
    return _
  })
}

/**
 * 完整变量替换
 * @param text - 包含变量的文本
 * @param context - 变量上下文
 * @returns 替换后的文本和使用的变量列表
 */
export function replaceVariables(
  text: string,
  context: VariableContext = {}
): { result: string; variablesUsed: string[] } {
  const variablesUsed: string[] = []

  // 1. 先替换系统变量
  let result = replaceSystemVars(text)

  // 2. 再替换环境变量
  result = replaceEnvVars(result, context.envVars, context.additionalVars)

  // 3. 提取使用的变量名
  const varMatches = text.match(/\{\{(\$\w+|\w+)\}\}/g)
  if (varMatches) {
    varMatches.forEach((match) => {
      const varName = match.replace(/^\{\{|\}\}$/g, '')
      if (!variablesUsed.includes(varName)) {
        variablesUsed.push(varName)
      }
    })
  }

  return { result, variablesUsed }
}

/**
 * 验证变量语法
 */
export function validateVariables(text: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 检查未闭合的变量
  const openBraces = (text.match(/\{\{/g) || []).length
  const closeBraces = (text.match(/\}\}/g) || []).length
  if (openBraces !== closeBraces) {
    errors.push('变量括号未闭合')
  }

  // 检查系统变量格式
  const invalidSystemVar = text.match(/\{\{\$[^\}]*[^\w\)\s][^\}]*\}\}/)
  if (invalidSystemVar) {
    errors.push(`无效的系统变量格式: ${invalidSystemVar[0]}`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 提取文本中的所有变量
 */
export function extractVariables(text: string): string[] {
  const vars = new Set<string>()
  const matches = text.match(/\{\{(\$\w+|\w+)\}\}/g) || []
  matches.forEach((match) => {
    const varName = match.replace(/^\{\{|\}\}$/g, '')
    vars.add(varName)
  })
  return Array.from(vars)
}
