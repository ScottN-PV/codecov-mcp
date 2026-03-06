import type { Config, PaginatedResponse, QueryParams } from './types.js'
import { LRUCache } from './cache.js'
import { CodecovError, formatApiError, requireToken } from './utils/errors.js'

export class CodecovClient {
  private readonly config: Config
  private readonly cache: LRUCache

  constructor(config: Config, cache: LRUCache) {
    this.config = config
    this.cache = cache
  }

  async get<T>(path: string, params?: QueryParams): Promise<T> {
    const url = this.buildUrl(path, params)
    const cacheKey = url.toString()

    const cached = this.cache.get<T>(cacheKey)
    if (cached !== undefined) return cached

    const result = await this.request<T>('GET', url)
    this.cache.set(cacheKey, result)
    return result
  }

  async list<T>(path: string, params?: QueryParams): Promise<PaginatedResponse<T>> {
    return this.get<PaginatedResponse<T>>(path, params)
  }

  async patch<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(path)
    const result = await this.request<T>('PATCH', url, JSON.stringify(body))
    // Invalidate cache for the resource path
    this.cache.invalidate(path)
    return result
  }

  async postPublic<T>(url: string, body: string, contentType = 'application/yaml'): Promise<T> {
    // Public endpoints (like validate_yaml) — no auth required
    const response = await this.fetchWithRetry(new URL(url), {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    })
    const text = await response.text()
    try {
      return JSON.parse(text) as T
    } catch {
      // Handle non-JSON responses (e.g. validate returns "Valid!\n\n{json}")
      const jsonMatch = /\{[\s\S]*\}/.exec(text)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as T
        } catch { /* regex captured non-JSON; fall through */ }
      }
      throw new Error(`Unexpected response: ${text.slice(0, 200)}`)
    }
  }

  private buildUrl(path: string, params?: QueryParams): URL {
    const url = new URL(`${this.config.baseUrl}${path}`)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value))
        }
      }
    }
    return url
  }

  private async request<T>(method: string, url: URL, body?: string): Promise<T> {
    const token = requireToken(this.config.token)
    const response = await this.fetchWithRetry(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
    })

    return response.json() as Promise<T>
  }

  private async fetchWithRetry(url: URL, init: RequestInit): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const result = await this.tryFetch(url, init)

      if (result.response) return result.response

      lastError = result.error
      if (!result.retryable || attempt >= this.config.maxRetries) break

      const delay = Math.min(1000 * Math.pow(2, attempt), 10_000)
      await sleep(delay)
    }

    throw lastError ?? new CodecovError('Request failed after retries')
  }

  private async tryFetch(url: URL, init: RequestInit): Promise<{
    response?: Response
    error: Error
    retryable: boolean
  }> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs)

      const response = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(timeoutId)

      if (response.ok) return { response, error: null as never, retryable: false }

      if (response.status === 429 || response.status >= 500) {
        return { error: formatApiError(response.status, url.pathname), retryable: true }
      }

      const bodyText = await response.text().catch(() => '')
      throw formatApiError(response.status, url.pathname, bodyText)
    } catch (err) {
      if (err instanceof CodecovError) throw err
      const error = err instanceof Error ? err : new Error(String(err))
      return { error, retryable: true }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
