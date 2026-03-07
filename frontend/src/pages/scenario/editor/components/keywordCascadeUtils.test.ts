import { describe, expect, it } from 'vitest'

import { shouldShowInterfaceSelector } from './keywordCascadeUtils'

describe('keywordCascadeUtils', () => {
  it('shows interface selector for request keywords in both old and current labels', () => {
    expect(shouldShowInterfaceSelector('request', '发送请求')).toBe(true)
    expect(shouldShowInterfaceSelector('request', 'HTTP请求')).toBe(true)
    expect(shouldShowInterfaceSelector('custom', '发送请求')).toBe(false)
  })
})
