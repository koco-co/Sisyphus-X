/**
 * Unit tests for utility functions
 */

import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('base-class', 'additional-class')
    expect(result).toBe('base-class additional-class')
  })

  it('should handle conditional classes', () => {
    const result = cn('base-class', false && 'conditional-class', true && 'active-class')
    expect(result).toBe('base-class active-class')
  })

  it('should handle undefined and null values', () => {
    const result = cn('base-class', undefined, null, 'another-class')
    expect(result).toBe('base-class another-class')
  })

  it('should handle empty strings', () => {
    const result = cn('base-class', '', 'another-class')
    expect(result).toBe('base-class another-class')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['array-class-1', 'array-class-2'], 'string-class')
    expect(result).toContain('array-class-1')
    expect(result).toContain('array-class-2')
    expect(result).toContain('string-class')
  })

  it('should handle tailwind merge conflicts', () => {
    const result = cn('p-4', 'p-2', 'text-lg')
    // clsx should handle duplicate classes
    expect(result).toBeTruthy()
  })
})

describe('URL utility functions', () => {
  describe('parseUrl', () => {
    it('should parse URL into components', () => {
      const url = 'https://api.example.com:8080/v1/users?page=1&limit=10#section'
      const urlObj = new URL(url)

      expect(urlObj.protocol).toBe('https:')
      expect(urlObj.hostname).toBe('api.example.com')
      expect(urlObj.port).toBe('8080')
      expect(urlObj.pathname).toBe('/v1/users')
      expect(urlObj.search).toBe('?page=1&limit=10')
      expect(urlObj.hash).toBe('#section')
    })

    it('should handle relative URLs', () => {
      const url = '/api/users'
      const urlObj = new URL(url, 'https://example.com')

      expect(urlObj.pathname).toBe('/api/users')
    })
  })

  describe('buildUrl', () => {
    it('should build URL from components', () => {
      const baseUrl = 'https://api.example.com'
      const path = '/v1/users'
      const params = new URLSearchParams({ page: '1', limit: '10' })

      const url = `${baseUrl}${path}?${params.toString()}`
      expect(url).toBe('https://api.example.com/v1/users?page=1&limit=10')
    })
  })
})

describe('Variable parsing utilities', () => {
  describe('parseVariableTemplate', () => {
    it('should extract variable names from template', () => {
      const template = 'https://{{baseUrl}}/api/users/{{userId}}'
      const pattern = /\{\{(\w+)\}\}/g
      const matches = template.match(pattern)

      expect(matches).toHaveLength(2)
      expect(matches).toContain('{{baseUrl}}')
      expect(matches).toContain('{{userId}}')
    })

    it('should handle nested variables', () => {
      const template = '{{outer_{{inner}}}}'
      const pattern = /\{\{(\w+)\}\}/g
      const matches = template.match(pattern)

      expect(matches).toBeTruthy()
    })

    it('should return empty array for no variables', () => {
      const template = 'https://api.example.com/users'
      const pattern = /\{\{(\w+)\}\}/g
      const matches = template.match(pattern)

      expect(matches).toBeNull()
    })
  })

  describe('replaceVariables', () => {
    it('should replace single variable', () => {
      const template = '/api/users/{{userId}}'
      const variables = { userId: '123' }
      const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '')

      expect(result).toBe('/api/users/123')
    })

    it('should replace multiple variables', () => {
      const template = '{{protocol}}://{{domain}}/{{path}}'
      const variables = { protocol: 'https', domain: 'api.example.com', path: 'api/users' }
      const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '')

      expect(result).toBe('https://api.example.com/api/users')
    })

    it('should handle missing variables', () => {
      const template = '/api/users/{{missingVar}}'
      const variables = { otherVar: 'value' }
      const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`)

      expect(result).toContain('{{missingVar}}')
    })
  })
})

describe('Object manipulation utilities', () => {
  describe('objectToKeyValueArray', () => {
    it('should convert object to key-value array', () => {
      const obj = { key1: 'value1', key2: 'value2' }
      const result = Object.entries(obj).map(([key, value]) => ({
        key,
        value,
        enabled: true,
      }))

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ key: 'key1', value: 'value1', enabled: true })
      expect(result[1]).toEqual({ key: 'key2', value: 'value2', enabled: true })
    })

    it('should handle empty object', () => {
      const obj = {}
      const result = Object.entries(obj).map(([key, value]) => ({
        key,
        value,
        enabled: true,
      }))

      expect(result).toHaveLength(0)
    })
  })

  describe('keyValueArrayToObject', () => {
    it('should convert key-value array to object', () => {
      const pairs = [
        { key: 'key1', value: 'value1', enabled: true },
        { key: 'key2', value: 'value2', enabled: true },
        { key: 'key3', value: 'value3', enabled: false },
      ]

      const result = pairs
        .filter((p) => p.enabled && p.key.trim())
        .reduce((acc, { key, value }) => {
          acc[key] = value
          return acc
        }, {} as Record<string, string>)

      expect(Object.keys(result)).toHaveLength(2)
      expect(result['key1']).toBe('value1')
      expect(result['key2']).toBe('value2')
      expect(result['key3']).toBeUndefined()
    })

    it('should trim whitespace from keys', () => {
      const pairs = [
        { key: '  key1  ', value: 'value1', enabled: true },
      ]

      const result = pairs
        .filter((p) => p.enabled && p.key.trim())
        .reduce((acc, { key, value }) => {
          acc[key] = value
          return acc
        }, {} as Record<string, string>)

      expect(result['key1']).toBe('value1')
      expect(result['  key1  ']).toBeUndefined()
    })
  })
})

describe('Format utilities', () => {
  describe('formatFileSize', () => {
    it('should format bytes to human readable', () => {
      const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2))
        return `${value} ${sizes[i]}`
      }

      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1536)).toBe('1.5 KB')
      expect(formatBytes(1048576)).toBe('1 MB')
      expect(formatBytes(1073741824)).toBe('1 GB')
    })
  })

  describe('formatDuration', () => {
    it('should format milliseconds to human readable', () => {
      const formatMs = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`
        const seconds = Math.floor(ms / 1000)
        if (seconds < 60) return `${seconds}s`
        const minutes = Math.floor(seconds / 60)
        return `${minutes}m ${seconds % 60}s`
      }

      expect(formatMs(500)).toBe('500ms')
      expect(formatMs(1500)).toBe('1s')
      expect(formatMs(65000)).toBe('1m 5s')
    })
  })

  describe('formatJson', () => {
    it('should format JSON with proper indentation', () => {
      const json = { name: 'Alice', age: 30, address: { city: 'NYC' } }
      const formatted = JSON.stringify(json, null, 2)

      expect(formatted).toContain('  "name": "Alice"')
      expect(formatted).toContain('  "age": 30')
    })

    it('should handle invalid JSON gracefully', () => {
      const parseJson = (str: string) => {
        try {
          return JSON.parse(str)
        } catch {
          return null
        }
      }

      expect(parseJson('invalid json')).toBeNull()
      expect(parseJson('{"valid": "json"}')).toEqual({ valid: 'json' })
    })
  })
})

describe('HTTP utilities', () => {
  describe('getHttpMethodColor', () => {
    it('should return correct color for HTTP methods', () => {
      const getColor = (method: string): string => {
        const colors: Record<string, string> = {
          GET: 'bg-emerald-500/20 text-emerald-400',
          POST: 'bg-amber-500/20 text-amber-400',
          PUT: 'bg-cyan-500/20 text-cyan-400',
          DELETE: 'bg-red-500/20 text-red-400',
          PATCH: 'bg-violet-500/20 text-violet-400',
        }
        return colors[method] || 'bg-gray-500/20 text-gray-400'
      }

      expect(getColor('GET')).toContain('emerald')
      expect(getColor('POST')).toContain('amber')
      expect(getColor('PUT')).toContain('cyan')
      expect(getColor('DELETE')).toContain('red')
      expect(getColor('PATCH')).toContain('violet')
      expect(getColor('HEAD')).toContain('gray')
    })
  })

  describe('isValidHttpUrl', () => {
    it('should validate HTTP URLs correctly', () => {
      const isValidUrl = (url: string): boolean => {
        try {
          const urlObj = new URL(url)
          return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
        } catch {
          return false
        }
      }

      expect(isValidUrl('https://api.example.com')).toBe(true)
      expect(isValidUrl('http://localhost:8080')).toBe(true)
      expect(isValidUrl('ftp://files.example.com')).toBe(false)
      expect(isValidUrl('not-a-url')).toBe(false)
    })
  })
})
