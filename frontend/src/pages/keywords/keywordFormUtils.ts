const KNOWN_KEYWORD_TYPES = new Set(['request', 'assertion', 'extract', 'database', 'custom'])

export function getKeywordTypeValue(className?: string | null): string {
  if (!className) {
    return 'custom'
  }
  return KNOWN_KEYWORD_TYPES.has(className) ? className : 'custom'
}

export function getKeywordClassNameForSubmit(typeValue: string, initialClassName?: string | null): string {
  if (typeValue === 'custom' && initialClassName && !KNOWN_KEYWORD_TYPES.has(initialClassName)) {
    return initialClassName
  }
  return typeValue
}
