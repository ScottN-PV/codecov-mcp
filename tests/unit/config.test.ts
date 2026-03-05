import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadConfig } from '../../src/config.js'

describe('loadConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns defaults when no env vars set', () => {
    delete process.env.CODECOV_TOKEN
    delete process.env.CODECOV_API_BASE_URL
    delete process.env.CODECOV_SERVICE
    const config = loadConfig()
    expect(config.token).toBeUndefined()
    expect(config.baseUrl).toBe('https://api.codecov.io')
    expect(config.service).toBeUndefined()
    expect(config.timeoutMs).toBe(30000)
    expect(config.maxRetries).toBe(3)
    expect(config.cacheTtlMs).toBe(300000)
  })

  it('reads token from env', () => {
    process.env.CODECOV_TOKEN = 'test-token-123'
    const config = loadConfig()
    expect(config.token).toBe('test-token-123')
  })

  it('reads base URL and strips trailing slash', () => {
    process.env.CODECOV_API_BASE_URL = 'https://my-codecov.example.com/'
    const config = loadConfig()
    expect(config.baseUrl).toBe('https://my-codecov.example.com')
  })

  it('reads service, owner, repo from env', () => {
    process.env.CODECOV_SERVICE = 'github'
    process.env.CODECOV_OWNER = 'my-org'
    process.env.CODECOV_REPO = 'my-repo'
    const config = loadConfig()
    expect(config.service).toBe('github')
    expect(config.defaultOwner).toBe('my-org')
    expect(config.defaultRepo).toBe('my-repo')
  })

  it('parses numeric env vars', () => {
    process.env.CODECOV_TIMEOUT_MS = '60000'
    process.env.CODECOV_MAX_RETRIES = '5'
    process.env.CODECOV_CACHE_TTL_MS = '600000'
    const config = loadConfig()
    expect(config.timeoutMs).toBe(60000)
    expect(config.maxRetries).toBe(5)
    expect(config.cacheTtlMs).toBe(600000)
  })

  it('falls back to defaults for invalid numeric env vars', () => {
    process.env.CODECOV_TIMEOUT_MS = 'not-a-number'
    const config = loadConfig()
    expect(config.timeoutMs).toBe(30000)
  })
})
