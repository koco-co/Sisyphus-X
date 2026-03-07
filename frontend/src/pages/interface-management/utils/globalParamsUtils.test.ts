import { describe, expect, it } from 'vitest'

import { normalizeGlobalParams } from './globalParamsUtils'

describe('globalParamsUtils', () => {
  it('normalizes list responses from object payloads', () => {
    expect(normalizeGlobalParams({ total: 1, items: [{ code: 'foo', description: 'bar' }] })).toEqual([{ code: 'foo', description: 'bar' }])
    expect(normalizeGlobalParams([{ code: 'foo' }])).toEqual([{ code: 'foo' }])
    expect(normalizeGlobalParams(null)).toEqual([])
  })
})
