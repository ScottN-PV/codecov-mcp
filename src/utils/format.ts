/**
 * Convert snake_case keys to camelCase in an object (shallow).
 * API responses use snake_case; tool outputs use camelCase.
 */
export function normalizeKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = value
  }
  return result
}

/**
 * Recursively normalize keys in an object or array.
 */
export function normalizeKeysDeep(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(normalizeKeysDeep)
  }
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[toCamelCase(key)] = normalizeKeysDeep(value)
    }
    return result
  }
  return data
}

function toCamelCase(str: string): string {
  return str.replaceAll(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}
