import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resolveRepoParams,
  resolveOwnerParams,
  resolveServiceParam,
  _resetGitRemoteCache,
} from '../../src/utils/resolve-params.js'
import type { Config } from '../../src/types.js'
import { CodecovError } from '../../src/utils/errors.js'

// Mock git-remote to return null so we test pure fallback logic
vi.mock('../../src/utils/git-remote.js', () => ({
  detectGitRemote: () => null,
}))

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    baseUrl: 'https://api.codecov.io',
    timeoutMs: 30000,
    maxRetries: 3,
    cacheTtlMs: 300000,
    ...overrides,
  }
}

describe('resolveRepoParams', () => {
  beforeEach(() => {
    _resetGitRemoteCache()
  })

  it('uses tool args first', () => {
    const config = makeConfig({ service: 'gitlab', defaultOwner: 'env-owner', defaultRepo: 'env-repo' })
    const result = resolveRepoParams(config, { service: 'github', owner: 'arg-owner', repo: 'arg-repo' })
    expect(result).toEqual({ service: 'github', owner: 'arg-owner', repo: 'arg-repo' })
  })

  it('falls back to config values', () => {
    const config = makeConfig({ service: 'github', defaultOwner: 'cfg-owner', defaultRepo: 'cfg-repo' })
    const result = resolveRepoParams(config, {})
    expect(result).toEqual({ service: 'github', owner: 'cfg-owner', repo: 'cfg-repo' })
  })

  it('throws when service cannot be resolved', () => {
    const config = makeConfig()
    expect(() => resolveRepoParams(config, { owner: 'o', repo: 'r' }))
      .toThrow(CodecovError)
  })

  it('throws when owner cannot be resolved', () => {
    const config = makeConfig({ service: 'github' })
    expect(() => resolveRepoParams(config, { repo: 'r' }))
      .toThrow(CodecovError)
  })

  it('throws when repo cannot be resolved', () => {
    const config = makeConfig({ service: 'github', defaultOwner: 'o' })
    expect(() => resolveRepoParams(config, {}))
      .toThrow(CodecovError)
  })
})

describe('resolveOwnerParams', () => {
  beforeEach(() => {
    _resetGitRemoteCache()
  })

  it('uses tool args first', () => {
    const config = makeConfig({ service: 'gitlab', defaultOwner: 'env-owner' })
    const result = resolveOwnerParams(config, { service: 'github', owner: 'arg-owner' })
    expect(result).toEqual({ service: 'github', owner: 'arg-owner' })
  })

  it('falls back to config values', () => {
    const config = makeConfig({ service: 'github', defaultOwner: 'cfg-owner' })
    const result = resolveOwnerParams(config, {})
    expect(result).toEqual({ service: 'github', owner: 'cfg-owner' })
  })

  it('throws when service cannot be resolved', () => {
    const config = makeConfig({ defaultOwner: 'o' })
    expect(() => resolveOwnerParams(config, {}))
      .toThrow(CodecovError)
  })

  it('throws when owner cannot be resolved', () => {
    const config = makeConfig({ service: 'github' })
    expect(() => resolveOwnerParams(config, {}))
      .toThrow(CodecovError)
  })
})

describe('resolveServiceParam', () => {
  beforeEach(() => {
    _resetGitRemoteCache()
  })

  it('uses tool arg first', () => {
    const config = makeConfig({ service: 'gitlab' })
    expect(resolveServiceParam(config, { service: 'github' })).toBe('github')
  })

  it('falls back to config', () => {
    const config = makeConfig({ service: 'bitbucket' })
    expect(resolveServiceParam(config, {})).toBe('bitbucket')
  })

  it('throws when service cannot be resolved', () => {
    const config = makeConfig()
    expect(() => resolveServiceParam(config, {}))
      .toThrow(CodecovError)
  })
})
