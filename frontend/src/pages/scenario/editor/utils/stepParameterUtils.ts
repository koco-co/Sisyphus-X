type KeyValueItem = { key: string; value: string }

type StepAssertion = { type: string; expression: string; expected?: string; message?: string }
type StepExtraction = { name: string; source: string; expression: string; variableType?: string }

function objectToKeyValueArray(obj: Record<string, unknown>): KeyValueItem[] {
  return Object.entries(obj).map(([key, value]) => ({ key, value: String(value ?? '') }))
}

function comparatorToMessage(comparator?: string): string {
  const mapping: Record<string, string> = {
    eq: 'equals',
    neq: 'not_equals',
    gt: 'greater_than',
    lt: 'less_than',
    contains: 'contains',
  }
  return mapping[comparator || ''] || 'equals'
}

function targetToAssertionType(target?: string): string {
  const mapping: Record<string, string> = {
    json: 'response_json',
    header: 'response_header',
    status_code: 'status_code',
  }
  return mapping[target || ''] || 'response_json'
}

function extractTypeToSource(type?: string): string {
  const mapping: Record<string, string> = {
    json: 'response_json',
    header: 'response_header',
  }
  return mapping[type || ''] || 'response_json'
}

export function hydrateScenarioStepParameters(parameters?: Record<string, unknown>) {
  const source = parameters || {}
  const configSource = (source.config && typeof source.config === 'object' ? source.config : source) as Record<string, unknown>

  const config: Record<string, unknown> = {}
  if (configSource.method) config.method = configSource.method
  if (configSource.url) config.url = configSource.url
  if (configSource.headers && typeof configSource.headers === 'object' && !Array.isArray(configSource.headers)) {
    config.headers = objectToKeyValueArray(configSource.headers as Record<string, unknown>)
  } else if (Array.isArray(configSource.headers)) {
    config.headers = configSource.headers
  }
  if (configSource.body !== undefined) config.body = configSource.body
  if (configSource.json !== undefined && config.body === undefined) {
    config.body = JSON.stringify(configSource.json, null, 2)
  }

  const assertions = Array.isArray(source.assertions)
    ? (source.assertions as StepAssertion[])
    : Array.isArray(source.validate)
      ? (source.validate as Array<Record<string, unknown>>).map((rule) => ({
          type: targetToAssertionType(rule.target as string | undefined),
          expression: String(rule.expression || ''),
          expected: String(rule.expected ?? ''),
          message: comparatorToMessage(rule.comparator as string | undefined),
        }))
      : []

  const extractions = Array.isArray(source.extractions)
    ? (source.extractions as StepExtraction[])
    : Array.isArray(source.extract)
      ? (source.extract as Array<Record<string, unknown>>).map((rule) => ({
          name: String(rule.name || ''),
          source: extractTypeToSource(rule.type as string | undefined),
          expression: String(rule.expression || ''),
          variableType: String(rule.scope || 'global'),
        }))
      : []

  return {
    resourceId: typeof source.resourceId === 'string' ? source.resourceId : undefined,
    config,
    assertions,
    extractions,
  }
}

export function serializeScenarioStepParameters(step: {
  resourceId?: string
  config: Record<string, unknown>
  assertions: StepAssertion[]
  extractions: StepExtraction[]
}) {
  return {
    ...(step.resourceId ? { resourceId: step.resourceId } : {}),
    config: step.config,
    assertions: step.assertions,
    extractions: step.extractions,
  }
}
