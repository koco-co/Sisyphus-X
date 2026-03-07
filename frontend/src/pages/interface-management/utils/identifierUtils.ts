export function normalizeResourceId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const normalized = String(value).trim()
  return normalized ? normalized : null
}

export function toSelectValue(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}
