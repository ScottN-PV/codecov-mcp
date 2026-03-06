import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config, QueryParams } from '../types.js'
import type { CodecovClient } from '../client.js'
import { OwnerRepoParams, CompareParams, validateCompareParams } from '../schemas/shared.js'
import { resolveRepoParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

function compareQueryParams(args: { base?: string; head?: string; pullid?: number }): QueryParams {
  validateCompareParams(args)
  const params: QueryParams = {}
  if (args.pullid !== undefined) params.pullid = args.pullid
  if (args.base) params.base = args.base
  if (args.head) params.head = args.head
  return params
}

export function registerComparisonTools(server: McpServer, config: Config, client: CodecovClient) {
  server.registerTool(
    'compare_coverage',
    {
      description: 'Compare overall coverage between two commits or a pull request. Accepts pullid for PR comparison or base+head for arbitrary commit comparison. Returns base/head/diff totals and per-file changes. The primary tool for PR coverage review alongside get_pr_coverage.',
      inputSchema: {
        ...OwnerRepoParams.shape,
        ...CompareParams.shape,
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/compare/`,
        compareQueryParams(args),
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.registerTool(
    'compare_components',
    {
      description: 'Compare coverage by component between two commits or a pull request (pass pullid). Components are logical groupings defined in codecov.yaml (e.g. frontend, backend). Use this in monorepos.',
      inputSchema: {
        ...OwnerRepoParams.shape,
        ...CompareParams.shape,
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/compare/components`,
        compareQueryParams(args),
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.registerTool(
    'compare_file',
    {
      description: 'Get line-by-line coverage comparison for a single file between two commits or a pull request (pass pullid). Shows which lines changed coverage status.',
      inputSchema: {
        ...OwnerRepoParams.shape,
        ...CompareParams.shape,
        file_path: z.string().describe('File path relative to repo root.'),
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/compare/file/${args.file_path}`,
        compareQueryParams(args),
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.registerTool(
    'compare_flags',
    {
      description: 'Compare coverage by flag (e.g. unit, integration, e2e) between two commits or a pull request (pass pullid). See which test category gained or lost coverage.',
      inputSchema: {
        ...OwnerRepoParams.shape,
        ...CompareParams.shape,
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/compare/flags`,
        compareQueryParams(args),
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.registerTool(
    'compare_impacted_files',
    {
      description: 'List only files with changed coverage between two commits or a pull request (pass pullid). More efficient than full comparison when you only need to know which files got better or worse. Returns a state field: processed when complete, pending when still computing. Supports client-side pagination and filtering since the API returns all files at once.',
      inputSchema: {
        ...OwnerRepoParams.shape,
        ...CompareParams.shape,
        page: z.number().int().min(1).optional().default(1)
          .describe('Page number for client-side pagination of files (1-based). Default 1.'),
        page_size: z.number().int().min(1).max(100).optional().default(25)
          .describe('Files per page for client-side pagination. Default 25, max 100.'),
        min_change: z.number().min(0).optional()
          .describe('Minimum absolute coverage change to include a file (e.g. 1.0 = only files with >= 1% change). Helps filter noise on large PRs.'),
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/compare/impacted_files`,
        compareQueryParams(args),
      )
      const result = normalizeKeysDeep(data) as Record<string, unknown>
      if (result.state === 'pending') {
        return toolResult({
          ...result,
          _note: 'Comparison is still being computed (state: pending). Try again in a few seconds.',
        })
      }

      // Client-side filtering and pagination of the files array
      let files = (result.files ?? result.impactedFiles ?? []) as Array<Record<string, unknown>>
      const totalFiles = files.length

      if (args.min_change != null && args.min_change > 0) {
        files = files.filter(f => {
          const diff = f.diffTotals as Record<string, unknown> | null
          if (!diff) return true // include files with no diff data
          const covChange = typeof diff.coverage === 'number' ? Math.abs(diff.coverage) : 0
          return covChange >= args.min_change!
        })
      }

      const page = args.page ?? 1
      const pageSize = args.page_size ?? 25
      const start = (page - 1) * pageSize
      const paginatedFiles = files.slice(start, start + pageSize)

      return toolResult({
        state: result.state,
        baseCommit: result.baseCommit,
        headCommit: result.headCommit,
        totals: result.totals,
        totalFiles,
        filteredFiles: files.length,
        page,
        pageSize,
        totalPages: Math.ceil(files.length / pageSize),
        files: paginatedFiles,
      })
    }),
  )

  server.registerTool(
    'compare_segments',
    {
      description: 'Get segment-level (chunk) coverage diffs for a file between two commits or a pull request (pass pullid). Each segment shows a contiguous block of changed lines with their before/after coverage. This is the most granular diff available.',
      inputSchema: {
        ...OwnerRepoParams.shape,
        ...CompareParams.shape,
        file_path: z.string().describe('File path relative to repo root.'),
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/compare/segments/${args.file_path}`,
        compareQueryParams(args),
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )
}
