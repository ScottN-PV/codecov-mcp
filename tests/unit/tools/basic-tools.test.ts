import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { registerOwnerTools } from '../../../src/tools/owners.js'
import { registerUserTools } from '../../../src/tools/users.js'
import { registerRepoTools } from '../../../src/tools/repos.js'
import { registerBranchTools } from '../../../src/tools/branches.js'
import { registerCommitTools } from '../../../src/tools/commits.js'
import { registerPullTools } from '../../../src/tools/pulls.js'
import { registerFlagTools } from '../../../src/tools/flags.js'
import { registerComponentTools } from '../../../src/tools/components.js'
import { registerTestAnalyticsTools } from '../../../src/tools/test-analytics.js'
import { registerEvaluationTools } from '../../../src/tools/evaluations.js'
import { createTestClient, paginatedResponse } from '../../helpers.js'
import type { CodecovClient } from '../../../src/client.js'

vi.mock('../../../src/utils/git-remote.js', () => ({
  detectGitRemote: () => ({ service: 'github', owner: 'test-owner', repo: 'test-repo' }),
}))

describe('owner tools', () => {
  let client: Client
  let mockClient: CodecovClient & { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const ctx = await createTestClient(registerOwnerTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })
  afterEach(() => vi.restoreAllMocks())

  it('list_owners returns paginated owners', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([{ username: 'org1' }]))
    const result = await client.callTool({ name: 'list_owners', arguments: {} })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.count).toBe(1)
    expect(data.owners).toHaveLength(1)
  })

  it('get_owner returns owner details', async () => {
    mockClient.get.mockResolvedValueOnce({ username: 'org1', name: 'My Org' })
    const result = await client.callTool({ name: 'get_owner', arguments: { owner: 'org1' } })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.username).toBe('org1')
  })
})

describe('user tools', () => {
  let client: Client
  let mockClient: CodecovClient & { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn>; patch: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const ctx = await createTestClient(registerUserTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })
  afterEach(() => vi.restoreAllMocks())

  it('list_users returns filtered users', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([{ username: 'user1', activated: true }]))
    const result = await client.callTool({ name: 'list_users', arguments: { activated: true } })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.users).toHaveLength(1)
  })

  it('get_user returns user details', async () => {
    mockClient.get.mockResolvedValueOnce({ username: 'user1', is_admin: false })
    const result = await client.callTool({ name: 'get_user', arguments: { user_id: 'user1' } })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.username).toBe('user1')
  })
})

describe('admin user tools (enableAdminTools=true)', () => {
  let client: Client
  let mockClient: CodecovClient & { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn>; patch: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const { makeConfig } = await import('../../helpers.js')
    const ctx = await createTestClient(registerUserTools, makeConfig({ enableAdminTools: true }))
    client = ctx.client
    mockClient = ctx.mockClient
  })
  afterEach(() => vi.restoreAllMocks())

  it('update_user patches activation status', async () => {
    mockClient.patch.mockResolvedValueOnce({ username: 'user1', activated: false })
    const result = await client.callTool({
      name: 'update_user',
      arguments: { user_id: 'user1', activated: false, confirm: true },
    })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.activated).toBe(false)
  })

  it('list_user_sessions returns sessions', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([{ session_id: 's1' }]))
    const result = await client.callTool({ name: 'list_user_sessions', arguments: {} })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.sessions).toHaveLength(1)
  })

  it('admin tools are not registered when enableAdminTools is false', async () => {
    const { makeConfig: mk } = await import('../../helpers.js')
    const ctx = await createTestClient(registerUserTools, mk({ enableAdminTools: false }))
    const { tools } = await ctx.client.listTools()
    const names = tools.map(t => t.name)
    expect(names).not.toContain('update_user')
    expect(names).not.toContain('list_user_sessions')
    expect(names).toContain('list_users')
    expect(names).toContain('get_user')
  })
})

describe('repo tools', () => {
  let client: Client
  let mockClient: CodecovClient & { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const ctx = await createTestClient(registerRepoTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })
  afterEach(() => vi.restoreAllMocks())

  it('list_repos returns filtered repos', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([{ name: 'repo1', active: true }]))
    const result = await client.callTool({ name: 'list_repos', arguments: { active: true } })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.repos).toHaveLength(1)
  })

  it('get_repo returns repo details', async () => {
    mockClient.get.mockResolvedValueOnce({ name: 'repo1', branch: 'main', totals: { coverage: 85 } })
    const result = await client.callTool({ name: 'get_repo', arguments: {} })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.name).toBe('repo1')
  })

  it('get_repo_config returns config', async () => {
    mockClient.get.mockResolvedValueOnce({ upload: { require_ci_to_pass: true } })
    const result = await client.callTool({ name: 'get_repo_config', arguments: {} })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.upload).toBeDefined()
  })
})

describe('branch tools', () => {
  let client: Client
  let mockClient: CodecovClient & { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const ctx = await createTestClient(registerBranchTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })
  afterEach(() => vi.restoreAllMocks())

  it('list_branches returns branches', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([{ name: 'main', head: { totals: { coverage: 90 } } }]))
    const result = await client.callTool({ name: 'list_branches', arguments: {} })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.branches).toHaveLength(1)
  })

  it('get_branch returns branch details', async () => {
    mockClient.get.mockResolvedValueOnce({ name: 'main', head: { commitid: 'abc123' } })
    const result = await client.callTool({ name: 'get_branch', arguments: { branch: 'main' } })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.name).toBe('main')
  })
})

describe('commit tools', () => {
  let client: Client
  let mockClient: CodecovClient & { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const ctx = await createTestClient(registerCommitTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })
  afterEach(() => vi.restoreAllMocks())

  it('list_commits returns commits', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([{ commitid: 'abc', totals: { coverage: 85 } }]))
    const result = await client.callTool({ name: 'list_commits', arguments: {} })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.commits).toHaveLength(1)
  })

  it('get_commit returns commit details', async () => {
    mockClient.get.mockResolvedValueOnce({ commitid: 'abc123', totals: { coverage: 88 } })
    const result = await client.callTool({ name: 'get_commit', arguments: { sha: 'abc123' } })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.commitid).toBe('abc123')
  })

  it('list_commit_uploads returns uploads', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([{ upload_type: 'uploaded', flags: ['unit'] }]))
    const result = await client.callTool({ name: 'list_commit_uploads', arguments: { sha: 'abc' } })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.uploads).toHaveLength(1)
  })
})

describe('pull tools', () => {
  let client: Client
  let mockClient: CodecovClient & { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const ctx = await createTestClient(registerPullTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })
  afterEach(() => vi.restoreAllMocks())

  it('list_pulls returns pulls', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([{ pullid: 1, state: 'open' }]))
    const result = await client.callTool({ name: 'list_pulls', arguments: { state: 'open' } })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.pulls).toHaveLength(1)
  })

  it('get_pull returns pull details', async () => {
    mockClient.get.mockResolvedValueOnce({ pullid: 5, state: 'merged', base_totals: { coverage: 80 } })
    const result = await client.callTool({ name: 'get_pull', arguments: { pullid: 5 } })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.pullid).toBe(5)
  })
})

describe('flag tools', () => {
  let client: Client
  let mockClient: CodecovClient & { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const ctx = await createTestClient(registerFlagTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })
  afterEach(() => vi.restoreAllMocks())

  it('list_flags returns flags', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([{ flag_name: 'unit', coverage: 90 }]))
    const result = await client.callTool({ name: 'list_flags', arguments: {} })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.flags).toHaveLength(1)
  })

  it('get_flag_coverage_trend returns trend data', async () => {
    mockClient.get.mockResolvedValueOnce({ results: [{ timestamp: '2024-01', avg: 88 }] })
    const result = await client.callTool({
      name: 'get_flag_coverage_trend',
      arguments: { flag: 'unit', interval: '30d' },
    })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.results).toHaveLength(1)
  })

  it('get_flag_coverage_trend handles URL-only response gracefully', async () => {
    mockClient.get.mockResolvedValueOnce({ coverage: 'http://api.codecov.io/some/url' })
    const result = await client.callTool({
      name: 'get_flag_coverage_trend',
      arguments: { flag: 'unit', interval: '1d' },
    })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.count).toBe(0)
    expect(data.results).toEqual([])
    expect(data._note).toContain('No trend data')
    expect(data.totalPages).toBe(0)
  })
})

describe('component tools', () => {
  let client: Client
  let mockClient: CodecovClient & { list: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const ctx = await createTestClient(registerComponentTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })
  afterEach(() => vi.restoreAllMocks())

  it('list_components returns components', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([{ component_id: 'frontend', coverage: 85 }]))
    const result = await client.callTool({ name: 'list_components', arguments: {} })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.components).toHaveLength(1)
  })

  it('list_components handles empty/missing results gracefully', async () => {
    mockClient.list.mockResolvedValueOnce({ count: undefined, results: undefined })
    const result = await client.callTool({ name: 'list_components', arguments: {} })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.count).toBe(0)
    expect(data.components).toEqual([])
  })
})

describe('test analytics tools', () => {
  let client: Client
  let mockClient: CodecovClient & { list: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const ctx = await createTestClient(registerTestAnalyticsTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })
  afterEach(() => vi.restoreAllMocks())

  it('list_test_analytics returns test results', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([
      { name: 'test_login', avg_duration: 1.5, failure_rate: 0 },
    ]))
    const result = await client.callTool({ name: 'list_test_analytics', arguments: {} })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.tests).toHaveLength(1)
  })
})

describe('evaluation tools', () => {
  let client: Client
  let mockClient: CodecovClient & { get: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const ctx = await createTestClient(registerEvaluationTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })
  afterEach(() => vi.restoreAllMocks())

  it('get_eval_summary returns eval metrics', async () => {
    mockClient.get.mockResolvedValueOnce({ avg_duration: 2.5, pass_count: 100, fail_count: 3 })
    const result = await client.callTool({ name: 'get_eval_summary', arguments: {} })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.avgDuration).toBe(2.5)
  })

  it('get_eval_comparison compares evals', async () => {
    mockClient.get.mockResolvedValueOnce({ base_summary: {}, head_summary: {} })
    const result = await client.callTool({
      name: 'get_eval_comparison',
      arguments: { base_sha: 'abc', head_sha: 'def' },
    })
    const data = JSON.parse((result.content[0] as { text: string }).text)
    expect(data.baseSummary).toBeDefined()
  })
})
