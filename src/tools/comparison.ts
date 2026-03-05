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
      description: 'List only files with changed coverage between two commits or a pull request (pass pullid). More efficient than full comparison when you only need to know which files got better or worse. Returns a state field: processed when complete, pending when still computing.',
      inputSchema: {
        ...OwnerRepoParams.shape,
        ...CompareParams.shape,
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
      return toolResult(result)
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
