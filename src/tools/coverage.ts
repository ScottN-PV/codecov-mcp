import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { OwnerRepoParams, BranchParam, ShaParam, PaginationParams } from '../schemas/shared.js'
import { resolveRepoParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

export function registerCoverageTools(server: McpServer, config: Config, client: CodecovClient) {
  server.tool(
    'get_coverage_trend',
    'Get time-series coverage data showing how overall coverage percentage changes over time. Returns min/max/avg coverage per interval. Use this to track whether coverage is improving or declining.',
    {
      ...OwnerRepoParams.shape,
      ...BranchParam.shape,
      interval: z.enum(['1d', '7d', '30d'])
        .describe('Aggregation interval. 1d=daily, 7d=weekly, 30d=monthly. REQUIRED.'),
      start_date: z.string().optional().describe('Start date (ISO 8601, e.g. 2024-01-01).'),
      end_date: z.string().optional().describe('End date (ISO 8601).'),
      ...PaginationParams.shape,
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const params: Record<string, string | number | boolean> = {
        interval: args.interval,
        page: args.page ?? 1,
        page_size: args.page_size ?? 25,
      }
      if (args.branch) params.branch = args.branch
      if (args.start_date) params.start_date = args.start_date
      if (args.end_date) params.end_date = args.end_date

      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/coverage/`,
        params,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.tool(
    'get_coverage_totals',
    'Get a coverage summary for a commit — overall coverage percentage, total lines, hits, misses, partials, branches, methods, and complexity. The fastest way to get a coverage number. Filterable by flag, path prefix, or component.',
    {
      ...OwnerRepoParams.shape,
      ...ShaParam.shape,
      ...BranchParam.shape,
      flag: z.string().optional().describe('Filter by coverage flag (e.g. "unit").'),
      path: z.string().optional().describe('Filter to files under this path prefix.'),
      component_id: z.string().optional().describe('Filter by component ID.'),
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const params: Record<string, string | number | boolean> = {}
      if (args.sha) params.sha = args.sha
      if (args.branch) params.branch = args.branch
      if (args.flag) params.flag = args.flag
      if (args.path) params.path = args.path
      if (args.component_id) params.component_id = args.component_id

      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/totals/`,
        params,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.tool(
    'get_coverage_report',
    'Get a full coverage report for a commit — includes totals and per-file coverage data. Use get_coverage_totals if you only need summary numbers. Use get_file_coverage if you only need one file.',
    {
      ...OwnerRepoParams.shape,
      ...ShaParam.shape,
      ...BranchParam.shape,
      flag: z.string().optional().describe('Filter by coverage flag.'),
      path: z.string().optional().describe('Filter to files under this path prefix.'),
      component_id: z.string().optional().describe('Filter by component ID.'),
      ...PaginationParams.shape,
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const params: Record<string, string | number | boolean> = {
        page: args.page ?? 1,
        page_size: args.page_size ?? 25,
      }
      if (args.sha) params.sha = args.sha
      if (args.branch) params.branch = args.branch
      if (args.flag) params.flag = args.flag
      if (args.path) params.path = args.path
      if (args.component_id) params.component_id = args.component_id

      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/report/`,
        params,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.tool(
    'get_coverage_tree',
    'Get hierarchical coverage data organized by directory structure. Returns coverage percentages at each directory level. Use depth to control how many levels deep. More useful than per-file listing for large repos to identify which parts of the codebase have the lowest coverage.',
    {
      ...OwnerRepoParams.shape,
      ...ShaParam.shape,
      ...BranchParam.shape,
      depth: z.number().int().min(1).optional().describe('Max directory depth to return (default: full tree).'),
      flag: z.string().optional().describe('Filter by coverage flag.'),
      path: z.string().optional().describe('Filter to files under this path prefix.'),
      component_id: z.string().optional().describe('Filter by component ID.'),
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const params: Record<string, string | number | boolean> = {}
      if (args.sha) params.sha = args.sha
      if (args.branch) params.branch = args.branch
      if (args.depth) params.depth = args.depth
      if (args.flag) params.flag = args.flag
      if (args.path) params.path = args.path
      if (args.component_id) params.component_id = args.component_id

      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/report/tree`,
        params,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.tool(
    'get_file_coverage',
    'Get line-by-line coverage data for a single file. Returns both the full line coverage array AND a computed uncoveredLines array for token efficiency. Use this to find exactly which lines need tests.',
    {
      ...OwnerRepoParams.shape,
      file_path: z.string().describe('File path relative to repo root (e.g. "src/utils/auth.ts").'),
      ...ShaParam.shape,
      ...BranchParam.shape,
      flag: z.string().optional().describe('Filter by coverage flag.'),
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const params: Record<string, string | number | boolean> = {}
      if (args.sha) params.sha = args.sha
      if (args.branch) params.branch = args.branch
      if (args.flag) params.flag = args.flag

      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/file_report/${args.file_path}/`,
        params,
      )

      // Compute uncovered lines for token efficiency
      const normalized = normalizeKeysDeep(data) as Record<string, unknown>
      const lineCoverage = normalized.lineCoverage as Array<[number, number | null]> | undefined
      if (lineCoverage) {
        const uncoveredLines = lineCoverage
          .filter(([, hits]) => hits === 0)
          .map(([lineNum]) => lineNum)
        normalized.uncoveredLines = uncoveredLines
      }

      return toolResult(normalized)
    }),
  )
}
