import { describe, expect, it } from 'vitest'

import { hydrateScenarioStepParameters, serializeScenarioStepParameters } from './stepParameterUtils'

describe('stepParameterUtils', () => {
  it('hydrates legacy request parameters into editor-friendly config', () => {
    const result = hydrateScenarioStepParameters({
      method: 'GET',
      url: 'http://localhost:8000/health',
      headers: { 'X-Test': 'yes' },
      validate: [{ target: 'status_code', comparator: 'eq', expected: 200 }],
      extract: [{ name: 'status', type: 'json', expression: '$.status', scope: 'global' }],
    })

    expect(result.config).toEqual({
      method: 'GET',
      url: 'http://localhost:8000/health',
      headers: [{ key: 'X-Test', value: 'yes' }],
    })
    expect(result.assertions).toEqual([{ type: 'status_code', expression: '', expected: '200', message: 'equals' }])
    expect(result.extractions).toEqual([{ name: 'status', source: 'response_json', expression: '$.status', variableType: 'global' }])
  })

  it('serializes editor state back into normalized scenario parameters', () => {
    const result = serializeScenarioStepParameters({
      resourceId: undefined,
      config: {
        method: 'GET',
        url: 'http://localhost:8000/health',
        headers: [{ key: 'X-Test', value: 'yes' }],
      },
      assertions: [{ type: 'status_code', expression: '', expected: '200', message: 'equals' }],
      extractions: [{ name: 'status', source: 'response_json', expression: '$.status', variableType: 'global' }],
    })

    expect(result).toEqual({
      config: {
        method: 'GET',
        url: 'http://localhost:8000/health',
        headers: [{ key: 'X-Test', value: 'yes' }],
      },
      assertions: [{ type: 'status_code', expression: '', expected: '200', message: 'equals' }],
      extractions: [{ name: 'status', source: 'response_json', expression: '$.status', variableType: 'global' }],
    })
  })
})
