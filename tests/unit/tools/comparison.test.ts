import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { registerComparisonTools } from '../../../src/tools/comparison.js'
import { createTestClient } from '../../helpers.js'
import type { CodecovClient } from '../../../src/client.js'

vi.mock('../../../src/utils/git-remote.js', () => ({
  detectGitRemote: () => ({ service: 'github', owner: 'test-owner', repo: 'test-repo' }),
}))

describe('comparison tools', () => {
  let client: Client
  let mockClient: CodecovClient & { get: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    const ctx = await createTestClient(registerComparisonTools)
    client = ctx.client
    mockClient = ctx.mockClient
  })

  afterEach(() => { vi.restoreAllMocks() })

  describe('compare_coverage', () => {
    it('compares by pullid', async () => {
      mockClient.get.mockResolvedValueOnce({
        base_totals: { coverage: 85 },
        head_totals: { coverage: 87 },
        diff: { coverage: 2 },
      })

      const result = await client.callTool({
        name: 'compare_coverage',
        arguments: { pullid: 10 },
      })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.headTotals.coverage).toBe(87)

      const [path, params] = mockClient.get.mock.calls[0]
      expect(path).toContain('/compare/')
      expect(params).toMatchObject({ pullid: 10 })
    })

    it('compares by base and head', async () => {
      mockClient.get.mockResolvedValueOnce({ diff: { coverage: -1 } })

      await client.callTool({
        name: 'compare_coverage',
        arguments: { base: 'main', head: 'feature-branch' },
      })

      const [, params] = mockClient.get.mock.calls[0]
      expect(params).toMatchObject({ base: 'main', head: 'feature-branch' })
    })

    it('errors when missing both pullid and base+head', async () => {
      const result = await client.callTool({
        name: 'compare_coverage',
        arguments: {},
      })
      expect(result.isError).toBe(true)
      expect((result.content[0] as { text: string }).text).toContain('pullid')
    })
  })

  describe('compare_impacted_files', () => {
    it('returns impacted files with pagination metadata', async () => {
      mockClient.get.mockResolvedValueOnce({
        state: 'processed',
        files: [
          { file_name: 'src/a.ts', diff_totals: { coverage: 5 } },
          { file_name: 'src/b.ts', diff_totals: { coverage: -2 } },
        ],
      })

      const result = await client.callTool({
        name: 'compare_impacted_files',
        arguments: { pullid: 5 },
      })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.state).toBe('processed')
      expect(data.totalFiles).toBe(2)
      expect(data.page).toBe(1)
      expect(data.files).toHaveLength(2)
    })

    it('paginates files client-side', async () => {
      const files = Array.from({ length: 50 }, (_, i) => ({
        file_name: `src/file${i}.ts`,
        diff_totals: { coverage: i },
      }))
      mockClient.get.mockResolvedValueOnce({ state: 'processed', files })

      const result = await client.callTool({
        name: 'compare_impacted_files',
        arguments: { pullid: 5, page: 2, page_size: 10 },
      })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.totalFiles).toBe(50)
      expect(data.files).toHaveLength(10)
      expect(data.page).toBe(2)
      expect(data.totalPages).toBe(5)
    })

    it('filters by min_change', async () => {
      mockClient.get.mockResolvedValueOnce({
        state: 'processed',
        files: [
          { file_name: 'big.ts', diff_totals: { coverage: 5 } },
          { file_name: 'small.ts', diff_totals: { coverage: 0.1 } },
          { file_name: 'negative.ts', diff_totals: { coverage: -3 } },
        ],
      })

      const result = await client.callTool({
        name: 'compare_impacted_files',
        arguments: { pullid: 5, min_change: 1.0 },
      })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.totalFiles).toBe(3)
      expect(data.filteredFiles).toBe(2)
      expect(data.files).toHaveLength(2)
    })

    it('adds note when pending', async () => {
      mockClient.get.mockResolvedValueOnce({ state: 'pending' })

      const result = await client.callTool({
        name: 'compare_impacted_files',
        arguments: { pullid: 5 },
      })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data._note).toContain('pending')
    })
  })

  describe('compare_flags', () => {
    it('compares flag coverage by pullid', async () => {
      mockClient.get.mockResolvedValueOnce({
        flags: [{ flag_name: 'unit', base_coverage: 80, head_coverage: 85 }],
      })

      const result = await client.callTool({
        name: 'compare_flags',
        arguments: { pullid: 7 },
      })
      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.flags).toHaveLength(1)
    })
  })

  describe('compare_components', () => {
    it('calls components comparison endpoint', async () => {
      mockClient.get.mockResolvedValueOnce({ components: [] })

      await client.callTool({
        name: 'compare_components',
        arguments: { pullid: 3 },
      })

      expect(mockClient.get.mock.calls[0][0]).toContain('/compare/components')
    })
  })

  describe('compare_file', () => {
    it('compares single file by path', async () => {
      mockClient.get.mockResolvedValueOnce({ lines: [[1, 'hit'], [2, 'miss']] })

      await client.callTool({
        name: 'compare_file',
        arguments: { pullid: 1, file_path: 'src/auth.ts' },
      })

      expect(mockClient.get.mock.calls[0][0]).toContain('/compare/file/src/auth.ts')
    })
  })

  describe('compare_segments', () => {
    it('gets segment diffs for a file', async () => {
      mockClient.get.mockResolvedValueOnce({ segments: [{ header: '@@ -1,5 +1,7 @@' }] })

      await client.callTool({
        name: 'compare_segments',
        arguments: { pullid: 1, file_path: 'src/main.ts' },
      })

      expect(mockClient.get.mock.calls[0][0]).toContain('/compare/segments/src/main.ts')
    })
  })
})
