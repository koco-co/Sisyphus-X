import { describe, expect, it } from 'vitest'

import { getKeywordTypeValue, getKeywordClassNameForSubmit } from './keywordFormUtils'

describe('keywordFormUtils', () => {
  it('maps unknown class_name to custom type for edit dialog', () => {
    expect(getKeywordTypeValue('AcceptanceKeyword')).toBe('custom')
    expect(getKeywordTypeValue('request')).toBe('request')
  })

  it('preserves custom business class_name when submit type stays custom', () => {
    expect(getKeywordClassNameForSubmit('custom', 'AcceptanceKeyword')).toBe('AcceptanceKeyword')
    expect(getKeywordClassNameForSubmit('request', 'AcceptanceKeyword')).toBe('request')
  })
})
