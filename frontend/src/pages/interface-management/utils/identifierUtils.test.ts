import { describe, expect, it } from 'vitest'

import { normalizeResourceId, toSelectValue } from './identifierUtils'

describe('identifierUtils', () => {
  it('keeps uuid-like ids as strings instead of truncating them', () => {
    expect(normalizeResourceId('6da5118b-77c5-47f1-8d87-1652674173ec')).toBe('6da5118b-77c5-47f1-8d87-1652674173ec')
  })

  it('returns null for empty values and stringifies valid values', () => {
    expect(normalizeResourceId('')).toBeNull()
    expect(normalizeResourceId(null)).toBeNull()
    expect(toSelectValue('abc')).toBe('abc')
    expect(toSelectValue(null)).toBe('')
  })
})
