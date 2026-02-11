import { useMemo } from 'react'
import { replaceVariables, extractVariables } from '../utils/variableParser'

export interface VariableReplacementOptions {
  envVars?: Record<string, string>
  additionalVars?: Record<string, string>
}

/**
 * 变量替换 Hook
 */
export function useVariableReplacement(options: VariableReplacementOptions = {}) {
  const { envVars = {}, additionalVars = {} } = options

  /**
   * 替换字符串中的变量
   */
  const replace = (text: string): string => {
    const { result } = replaceVariables(text, { envVars, additionalVars })
    return result
  }

  /**
   * 替换对象中的所有变量（递归）
   */
  const replaceObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return replace(obj)
    }

    if (Array.isArray(obj)) {
      return obj.map(replaceObject)
    }

    if (obj && typeof obj === 'object') {
      const result: any = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = replaceObject(obj[key])
        }
      }
      return result
    }

    return obj
  }

  /**
   * 提取文本中的变量
   */
  const extract = (text: string): string[] => {
    return extractVariables(text)
  }

  /**
   * 预览替换结果
   */
  const preview = (text: string) => {
    return replaceVariables(text, { envVars, additionalVars })
  }

  /**
   * 获取所有可用的变量
   */
  const availableVariables = useMemo(() => {
    return {
      env: envVars,
      additional: additionalVars,
      all: { ...envVars, ...additionalVars }
    }
  }, [envVars, additionalVars])

  return {
    replace,
    replaceObject,
    extract,
    preview,
    availableVariables
  }
}
