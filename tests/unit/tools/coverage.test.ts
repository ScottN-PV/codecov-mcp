import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { registerCoverageTools } from '../../../src/tools/coverage.js'
import { createTestClient, paginatedResponse } from '../../helpers.js'
import type { CodecovClient } from '../../../src/client.js'

vi.mock('../../../src/utils/git-remote.js', () => ({
  detectGitRemote: () => ({ service: 'github', owner: 'test-owner', repo: 'test-repo' }),
}))

describe('coverage tools', () => {
  let client: Client
  let mockClient: CodecovClient & { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const ctx = await createTestClient(registerCoverageTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })

  afterEach(() => { vi.restoreAllMocks() })

  describe('get_coverage_trend', () => {
    it('returns trend data', async () => {
      mockClient.get.mockResolvedValueOnce({
        results: [{ timestamp: '2024-01-01', min: 80, max: 85, avg: 82 }],
      })

      const result = await client.callTool({ name: 'get_coverage_trend', arguments: { interval: '30d' } })
      expect(result.content).toHaveLength(1)
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.results).toHaveLength(1)
      expect(data.results[0].timestamp).toBe('2024-01-01')
    })
  })

  describe('get_coverage_totals', () => {
    const totalsResponse = {
      totals: { coverage: 88.45, lines: 1000, hits: 885, misses: 115 },
      files: [
        { name: 'src/a.ts', totals: { coverage: 90 } },
        { name: 'src/b.ts', totals: { coverage: 80 } },
      ],
    }

    it('strips files by default (context-efficient)', async () => {
      mockClient.get.mockResolvedValueOnce(totalsResponse)

      const result = await client.callTool({ name: 'get_coverage_totals', arguments: {} })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.totals).toBeDefined()
      expect(data.files).toBeUndefined()
    })

    it('includes files when include_files=true', async () => {
      mockClient.get.mockResolvedValueOnce(totalsResponse)

      const result = await client.callTool({
        name: 'get_coverage_totals',
        arguments: { include_files: true },
      })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.totals).toBeDefined()
      expect(data.files).toHaveLength(2)
    })

    it('passes flag, path, component_id params', async () => {
      mockClient.get.mockResolvedValueOnce({ totals: { coverage: 50 }, files: [] })

      await client.callTool({
        name: 'get_coverage_totals',
        arguments: { flag: 'unit', path: 'src/', component_id: 'backend' },
      })

      const [path, params] = mockClient.get.mock.calls[0]
      expect(path).toContain('/totals/')
      expect(params).toMatchObject({ flag: 'unit', path: 'src/', component_id: 'backend' })
    })
  })

  describe('get_coverage_report', () => {
    it('returns paginated report data', async () => {
      mockClient.get.mockResolvedValueOnce({
        totals: { coverage: 85 },
        files: [{ name: 'src/a.ts', totals: { coverage: 90 } }],
      })

      const result = await client.callTool({ name: 'get_coverage_report', arguments: {} })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.totals.coverage).toBe(85)
    })
  })

  describe('get_coverage_tree', () => {
    it('passes depth and flag params', async () => {
      mockClient.get.mockResolvedValueOnce({
        results: [{ name: 'src', coverage: 85 }],
      })

      await client.callTool({
        name: 'get_coverage_tree',
        arguments: { depth: 2, flag: 'unit' },
      })

      const [path, params] = mockClient.get.mock.calls[0]
      expect(path).toContain('/report/tree')
      expect(params).toMatchObject({ depth: 2, flag: 'unit' })
    })
  })

  describe('get_file_coverage', () => {
    it('computes uncovered lines', async () => {
      mockClient.get.mockResolvedValueOnce({
        line_coverage: [
          [1, 5], [2, 0], [3, null], [4, 0], [5, 3],
        ],
      })

      const result = await client.callTool({
        name: 'get_file_coverage',
        arguments: { file_path: 'src/main.ts' },
      })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.uncoveredLines).toEqual([2, 4])
    })

    it('handles missing line_coverage gracefully', async () => {
      mockClient.get.mockResolvedValueOnce({ totals: { coverage: 0 } })

      const result = await client.callTool({
        name: 'get_file_coverage',
        arguments: { file_path: 'src/empty.ts' },
      })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.uncoveredLines).toBeUndefined()
    })
  })
})
