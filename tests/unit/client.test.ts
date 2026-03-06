import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CodecovClient } from '../../src/client.js'
import { LRUCache } from '../../src/cache.js'
import type { Config } from '../../src/types.js'
import { CodecovError } from '../../src/utils/errors.js'

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    token: 'test-token',
    baseUrl: 'https://api.codecov.io',
    timeoutMs: 5000,
    maxRetries: 0,
    cacheTtlMs: 300000,
    ...overrides,
  }
}

describe('CodecovClient', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('get', () => {
    it('makes authenticated GET request', async () => {
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ name: 'test-repo' }), { status: 200 }))

      const client = new CodecovClient(makeConfig(), new LRUCache(300000))
      const result = await client.get<{ name: string }>('/api/v2/github/owner/repos/test/')

      expect(fetchSpy).toHaveBeenCalledOnce()
      const [url, init] = fetchSpy.mock.calls[0]
      expect(url.toString()).toContain('/api/v2/github/owner/repos/test/')
      expect((init as RequestInit).headers).toHaveProperty('Authorization', 'Bearer test-token')
      expect(result).toEqual({ name: 'test-repo' })
    })

    it('appends query params', async () => {
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))

      const client = new CodecovClient(makeConfig(), new LRUCache(300000))
      await client.get('/api/v2/github/owner/repos/', { page: 2, active: true })

      const [url] = fetchSpy.mock.calls[0]
      const parsedUrl = new URL(url.toString())
      expect(parsedUrl.searchParams.get('page')).toBe('2')
      expect(parsedUrl.searchParams.get('active')).toBe('true')
    })

    it('caches GET responses', async () => {
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ cached: true }), { status: 200 }))

      const client = new CodecovClient(makeConfig(), new LRUCache(300000))
      const first = await client.get('/api/v2/test/')
      const second = await client.get('/api/v2/test/')

      expect(fetchSpy).toHaveBeenCalledOnce()
      expect(first).toEqual(second)
    })

    it('throws CodecovError on 401', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

      const client = new CodecovClient(makeConfig(), new LRUCache(300000))
      await expect(client.get('/test')).rejects.toThrow(CodecovError)
    })

    it('throws CodecovError on 404', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('Not Found', { status: 404 }))

      const client = new CodecovClient(makeConfig(), new LRUCache(300000))
      await expect(client.get('/test')).rejects.toThrow(CodecovError)
    })

    it('throws when token is missing', async () => {
      const client = new CodecovClient(makeConfig({ token: undefined }), new LRUCache(300000))
      await expect(client.get('/test')).rejects.toThrow('CODECOV_TOKEN is not set')
    })
  })

  describe('list', () => {
    it('returns paginated response', async () => {
      const response = { count: 2, next: null, previous: null, results: [{ id: 1 }, { id: 2 }] }
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(response), { status: 200 }))

      const client = new CodecovClient(makeConfig(), new LRUCache(300000))
      const result = await client.list('/api/v2/test/')

      expect(result.count).toBe(2)
      expect(result.results).toHaveLength(2)
    })
  })

  describe('patch', () => {
    it('makes authenticated PATCH request', async () => {
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ activated: true }), { status: 200 }))

      const client = new CodecovClient(makeConfig(), new LRUCache(300000))
      const result = await client.patch<{ activated: boolean }>('/api/v2/test/', { activated: true })

      const [, init] = fetchSpy.mock.calls[0]
      expect((init as RequestInit).method).toBe('PATCH')
      expect(result).toEqual({ activated: true })
    })

    it('invalidates cache on PATCH', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response(JSON.stringify({ v: 1 }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ v: 2 }), { status: 200 }))

      const cache = new LRUCache(300000)
      const client = new CodecovClient(makeConfig(), cache)

      await client.get('/api/v2/test/')
      expect(cache.size).toBe(1)

      await client.patch('/api/v2/test/', { updated: true })
      expect(cache.size).toBe(0)
    })
  })

  describe('postPublic', () => {
    it('makes unauthenticated POST request', async () => {
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ valid: true }), { status: 200 }))

      const client = new CodecovClient(makeConfig({ token: undefined }), new LRUCache(300000))
      const result = await client.postPublic<{ valid: boolean }>('https://api.codecov.io/validate', 'yaml: content')

      const [, init] = fetchSpy.mock.calls[0]
      expect((init as RequestInit).headers).not.toHaveProperty('Authorization')
      expect((init as RequestInit).headers).toHaveProperty('Content-Type', 'application/yaml')
      expect(result).toEqual({ valid: true })
    })

    it('handles text-prefixed JSON response (e.g. "Valid!\\n\\n{json}")', async () => {
      const body = 'Valid!\n\n{"result": "All good"}'
      fetchSpy.mockResolvedValueOnce(new Response(body, { status: 200 }))

      const client = new CodecovClient(makeConfig({ token: undefined }), new LRUCache(300000))
      const result = await client.postPublic<{ result: string }>('https://api.codecov.io/validate', 'yaml: content')

      expect(result).toEqual({ result: 'All good' })
    })

    it('throws on completely non-JSON response', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('Something went wrong', { status: 200 }))

      const client = new CodecovClient(makeConfig({ token: undefined }), new LRUCache(300000))
      await expect(
        client.postPublic('https://api.codecov.io/validate', 'bad: yaml'),
      ).rejects.toThrow('Unexpected response')
    })
  })

  describe('retry', () => {
    it('retries on 429', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response('Rate limited', { status: 429 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

      const client = new CodecovClient(makeConfig({ maxRetries: 1 }), new LRUCache(300000))
      const result = await client.get('/test')

      expect(fetchSpy).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ ok: true })
    })

    it('retries on 500', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

      const client = new CodecovClient(makeConfig({ maxRetries: 1 }), new LRUCache(300000))
      const result = await client.get('/test')

      expect(fetchSpy).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ ok: true })
    })

    it('gives up after max retries', async () => {
      fetchSpy.mockResolvedValue(new Response('Server Error', { status: 500 }))

      const client = new CodecovClient(makeConfig({ maxRetries: 1 }), new LRUCache(300000))
      await expect(client.get('/test')).rejects.toThrow()

      expect(fetchSpy).toHaveBeenCalledTimes(2) // initial + 1 retry
    })
  })
})
