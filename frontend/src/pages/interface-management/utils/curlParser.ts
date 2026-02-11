/**
 * cURL 解析器
 * 将 cURL 命令解析为请求配置对象
 */

export interface ParsedCurlRequest {
  method: string
  url: string
  headers: Record<string, string>
  body?: any
  body_type: 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'none'
  params: Record<string, string>
  auth?: {
    type: 'none' | 'bearer' | 'api_key' | 'basic'
    token?: string
    key?: string
    value?: string
    add_to?: 'header' | 'query'
    username?: string
    password?: string
  }
}

/**
 * 解析 cURL 命令
 */
export function parseCurlCommand(curlCommand: string): ParsedCurlRequest {
  const result: ParsedCurlRequest = {
    method: 'GET',
    url: '',
    headers: {},
    body_type: 'none',
    params: {},
    auth: { type: 'none' }
  }

  // 移除行 continuation 反斜杠
  const normalizedCmd = curlCommand.replace(/\\\s*\n/g, ' ').trim()

  // 提取方法
  const methodMatch = normalizedCmd.match(/-X\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/i)
  if (methodMatch) {
    result.method = methodMatch[1].toUpperCase()
  }

  // 提取 URL
  const urlMatch = normalizedCmd.match(/curl\s+(?:-[A-Za-z]\s+)*(['"`]?)(https?:\/\/[^\s'"`]+)\1/)
  if (urlMatch) {
    result.url = urlMatch[2]
  }

  // 提取 headers
  const headerRegex = /-H\s+['"`]([^'"`]+):\s*([^'"`]*)['"`]/gi
  let headerMatch
  while ((headerMatch = headerRegex.exec(normalizedCmd)) !== null) {
    const key = headerMatch[1].trim()
    const value = headerMatch[2].trim()
    result.headers[key] = value

    // 检测 Bearer Token 认证
    if (key.toLowerCase() === 'authorization' && value.toLowerCase().startsWith('bearer ')) {
      result.auth = {
        type: 'bearer',
        token: value.substring(7)
      }
    }
  }

  // 提取 Basic Auth
  const userMatch = normalizedCmd.match(/-u\s+['"`]?([^'"`:\s]+):([^'"`\s]*)['"`]?/)
  if (userMatch) {
    result.auth = {
      type: 'basic',
      username: userMatch[1],
      password: userMatch[2]
    }
  }

  // 提取 data (POST body)
  const dataMatch = normalizedCmd.match(/-d\s+['"`]([^'"`]*)['"`]/i)
  const dataRawMatch = normalizedCmd.match(/--data-raw\s+['"`]([^'"`]*)['"`]/i)

  let bodyData: string | null = null
  if (dataMatch) {
    bodyData = dataMatch[1]
  } else if (dataRawMatch) {
    bodyData = dataRawMatch[1]
  }

  // 尝试解析为 JSON
  if (bodyData) {
    try {
      const parsed = JSON.parse(bodyData)
      result.body = parsed
      result.body_type = 'json'
    } catch {
      // 不是 JSON，检查是否为 form-data
      if (normalizedCmd.includes('-F') || normalizedCmd.includes('--form')) {
        result.body_type = 'form-data'
        // 解析 form-data 字段
        const formFields: Record<string, string> = {}
        const formRegex = /-F\s+['"`]?([^='"`\s]+)=?([^'"`\s]*)['"`]?/gi
        let formMatch
        while ((formMatch = formRegex.exec(normalizedCmd)) !== null) {
          formFields[formMatch[1]] = formMatch[2] || ''
        }
        result.body = formFields
      } else {
        // 纯文本
        result.body = bodyData
        result.body_type = 'raw'
      }
    }

    // 非 GET 请求如果有 body，设置方法为 POST（如果未指定）
    if (result.method === 'GET' && bodyData) {
      result.method = 'POST'
    }
  }

  // 从 URL 提取 query 参数
  try {
    const urlObj = new URL(result.url)
    urlObj.searchParams.forEach((value, key) => {
      result.params[key] = value
    })
    // 移除 query 参数后的 URL
    result.url = urlObj.origin + urlObj.pathname
  } catch {
    // URL 解析失败，保持原样
  }

  return result
}
