export interface GlobalParamLike {
  code?: string
  description?: string
}

export function normalizeGlobalParams(payload: unknown): GlobalParamLike[] {
  if (Array.isArray(payload)) {
    return payload as GlobalParamLike[]
  }

  if (payload && typeof payload === 'object' && 'items' in payload) {
    const items = (payload as { items?: unknown }).items
    return Array.isArray(items) ? (items as GlobalParamLike[]) : []
  }

  return []
}
