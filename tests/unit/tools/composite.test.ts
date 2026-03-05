import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { registerCompositeTools } from '../../../src/tools/composite.js'
import { createTestClient, paginatedResponse } from '../../helpers.js'
import type { CodecovClient } from '../../../src/client.js'

vi.mock('../../../src/utils/git-remote.js', () => ({
  detectGitRemote: () => ({ service: 'github', owner: 'test-owner', repo: 'test-repo' }),
}))

describe('composite tools', () => {
  let client: Client
  let mockClient: CodecovClient & {
    get: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
    postPublic: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    const ctx = await createTestClient(registerCompositeTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })

  afterEach(() => { vi.restoreAllMocks() })

  describe('validate_yaml', () => {
    it('validates yaml content', async () => {
      mockClient.postPublic.mockResolvedValueOnce({ valid: true, message: 'Valid!' })

      const result = await client.callTool({
        name: 'validate_yaml',
        arguments: { yaml_content: 'codecov:\n  require_ci_to_pass: yes' },
      })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.valid).toBe(true)
    })
  })

  describe('find_flaky_tests', () => {
    it('returns flaky tests sorted by recent failures', async () => {
      mockClient.list.mockResolvedValueOnce(paginatedResponse([
        { name: 'test_auth', failure_rate: 0.15 },
        { name: 'test_db', failure_rate: 0.08 },
      ]))

      const result = await client.callTool({ name: 'find_flaky_tests', arguments: {} })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.count).toBe(2)
      expect(data.flakyTests).toHaveLength(2)
      expect(data._note).toContain('flaky test candidates')
    })

    it('passes outcome=failure and ordering', async () => {
      mockClient.list.mockResolvedValueOnce(paginatedResponse([]))

      await client.callTool({ name: 'find_flaky_tests', arguments: {} })

      const [, params] = mockClient.list.mock.calls[0]
      expect(params).toMatchObject({ outcome: 'failure', ordering: '-updated_at' })
    })
  })

  describe('get_coverage_summary', () => {
    it('combines repo, trend, flags, and pull count', async () => {
      mockClient.get
        .mockResolvedValueOnce({ name: 'my-repo', branch: 'main', totals: { coverage: 88.5 } })
        .mockResolvedValueOnce({
          results: [
            { timestamp: '2024-01-01', avg: 85 },
            { timestamp: '2024-01-31', avg: 88.5 },
          ],
        })
      mockClient.list
        .mockResolvedValueOnce(paginatedResponse([{ flag_name: 'unit', coverage: 90 }]))
        .mockResolvedValueOnce(paginatedResponse([], 3))

      const result = await client.callTool({ name: 'get_coverage_summary', arguments: {} })
      const data = JSON.parse((result.content[0] as { text: string }).text)

      expect(data.repo.name).toBe('my-repo')
      expect(data.repo.coverage).toBe(88.5)
      expect(data.trend.direction).toBe('improving')
      expect(data.trend.thirtyDayDelta).toBeCloseTo(3.5)
      expect(data.flags).toHaveLength(1)
      expect(data.openPullCount).toBe(3)
    })

    it('reports stable when trend data is insufficient', async () => {
      mockClient.get
        .mockResolvedValueOnce({ name: 'my-repo', branch: 'main', totals: { coverage: 50 } })
        .mockResolvedValueOnce({ results: [] })
      mockClient.list
        .mockResolvedValueOnce(paginatedResponse([]))
        .mockResolvedValueOnce(paginatedResponse([], 0))

      const result = await client.callTool({ name: 'get_coverage_summary', arguments: {} })
      const data = JSON.parse((result.content[0] as { text: string }).text)

      expect(data.trend.direction).toBe('stable')
      expect(data.trend.thirtyDayDelta).toBeNull()
    })

    it('reports declining when coverage drops', async () => {
      mockClient.get
        .mockResolvedValueOnce({ name: 'repo', branch: 'main', totals: { coverage: 80 } })
        .mockResolvedValueOnce({
          results: [
            { timestamp: '2024-01-01', avg: 90 },
            { timestamp: '2024-01-31', avg: 80 },
          ],
        })
      mockClient.list
        .mockResolvedValueOnce(paginatedResponse([]))
        .mockResolvedValueOnce(paginatedResponse([], 0))

      const result = await client.callTool({ name: 'get_coverage_summary', arguments: {} })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.trend.direction).toBe('declining')
    })
  })

  describe('get_pr_coverage', () => {
    it('combines pull details and impacted files', async () => {
      mockClient.get
        .mockResolvedValueOnce({
          title: 'Add auth module',
          state: 'open',
          base_totals: { coverage: 85 },
          head_totals: { coverage: 87 },
          patch_totals: { coverage: 92 },
          ci_passed: true,
        })
        .mockResolvedValueOnce({
          state: 'processed',
          files: [
            { file_name: 'src/auth.ts', coverage_diff: 2.5 },
            { file_name: 'src/login.ts', coverage_diff: -1.0 },
          ],
        })

      const result = await client.callTool({
        name: 'get_pr_coverage',
        arguments: { pullid: 16 },
      })
      const data = JSON.parse((result.content[0] as { text: string }).text)

      expect(data.pullid).toBe(16)
      expect(data.title).toBe('Add auth module')
      expect(data.state).toBe('open')
      expect(data.ciPassed).toBe(true)
      expect(data.impactedFiles).toHaveLength(2)
      expect(data.comparisonState).toBe('processed')
      expect(data._note).toBeUndefined()
    })

    it('adds note when comparison is pending', async () => {
      mockClient.get
        .mockResolvedValueOnce({
          title: 'WIP',
          state: 'open',
          base_totals: null,
          head_totals: null,
          patch_totals: null,
          ci_passed: false,
        })
        .mockResolvedValueOnce({ state: 'pending', files: [] })

      const result = await client.callTool({
        name: 'get_pr_coverage',
        arguments: { pullid: 42 },
      })
      const data = JSON.parse((result.content[0] as { text: string }).text)

      expect(data.comparisonState).toBe('pending')
      expect(data._note).toContain('still being computed')
    })

    it('passes pullid to both API calls', async () => {
      mockClient.get
        .mockResolvedValueOnce({ title: 'T', state: 'open' })
        .mockResolvedValueOnce({ state: 'processed', files: [] })

      await client.callTool({ name: 'get_pr_coverage', arguments: { pullid: 99 } })

      expect(mockClient.get.mock.calls[0][0]).toContain('/pulls/99/')
      expect(mockClient.get.mock.calls[1][0]).toContain('/compare/impacted_files')
      expect(mockClient.get.mock.calls[1][1]).toMatchObject({ pullid: 99 })
    })
  })
})
