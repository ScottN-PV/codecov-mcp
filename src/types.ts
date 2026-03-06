export interface Config {
  token?: string
  baseUrl: string
  service?: string
  defaultOwner?: string
  defaultRepo?: string
  timeoutMs: number
  maxRetries: number
  cacheTtlMs: number
  enableAdminTools: boolean
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface GitRemoteInfo {
  service: string
  owner: string
  repo: string
}

export type CoverageValue = number | null

export type QueryParams = Record<string, string | number | boolean>

export interface CoverageTotals {
  files: number
  lines: number
  hits: number
  misses: number
  partials: number
  coverage: number | null
  branches: number
  methods: number
  sessions: number
  complexity: number | null
  complexityTotal: number | null
  complexityRatio: number | null
  diff: Record<string, unknown> | null
}
