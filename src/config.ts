import type { Config } from './types.js'

const DEFAULT_BASE_URL = 'https://api.codecov.io'
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_CACHE_TTL_MS = 300_000 // 5 minutes

export function loadConfig(): Config {
  return {
    token: process.env.CODECOV_TOKEN || undefined,
    baseUrl: (process.env.CODECOV_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    service: process.env.CODECOV_SERVICE || undefined,
    defaultOwner: process.env.CODECOV_OWNER || undefined,
    defaultRepo: process.env.CODECOV_REPO || undefined,
    timeoutMs: parseIntEnv('CODECOV_TIMEOUT_MS', DEFAULT_TIMEOUT_MS),
    maxRetries: parseIntEnv('CODECOV_MAX_RETRIES', DEFAULT_MAX_RETRIES),
    cacheTtlMs: parseIntEnv('CODECOV_CACHE_TTL_MS', DEFAULT_CACHE_TTL_MS),
  }
}

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = parseInt(raw, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}
