import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { OwnerRepoParams, CompareParams, validateCompareParams } from '../schemas/shared.js'
import { resolveRepoParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

function compareQueryParams(args: { base?: string; head?: string; pullid?: number }): Record<string, string | number | boolean> {
  validateCompareParams(args)
  const params: Record<string, string | number | boolean> = {}
  if (args.pullid !== undefined) params.pullid = args.pullid
  if (args.base) params.base = args.base
  if (args.head) params.head = args.head
  return params
}

export function registerComparisonTools(server: McpServer, config: Config, client: CodecovClient) {
  server.tool(
    'compare_coverage',
    'Compare overall coverage between two commits or a pull request. Returns base/head/diff totals and per-file changes. The primary tool for PR coverage review.',
    {
      ...OwnerRepoParams.shape,
      ...CompareParams.shape,
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

  server.tool(
    'compare_components',
    'Compare coverage by component between two commits. Components are logical groupings defined in codecov.yaml (e.g. frontend, backend). Use this in monorepos.',
    {
      ...OwnerRepoParams.shape,
      ...CompareParams.shape,
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

  server.tool(
    'compare_file',
    'Get line-by-line coverage comparison for a single file between two commits. Shows which lines changed coverage status.',
    {
      ...OwnerRepoParams.shape,
      ...CompareParams.shape,
      file_path: z.string().describe('File path relative to repo root.'),
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

  server.tool(
    'compare_flags',
    'Compare coverage by flag (e.g. unit, integration, e2e) between two commits. See which test category gained or lost coverage.',
    {
      ...OwnerRepoParams.shape,
      ...CompareParams.shape,
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

  server.tool(
    'compare_impacted_files',
    'List only files with changed coverage between two commits. More efficient than full comparison when you only need to know which files got better or worse. Returns a state field: processed when complete, pending when still computing.',
    {
      ...OwnerRepoParams.shape,
      ...CompareParams.shape,
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

  server.tool(
    'compare_segments',
    'Get segment-level (chunk) coverage diffs for a file between two commits. Each segment shows a contiguous block of changed lines with their before/after coverage. This is the most granular diff available.',
    {
      ...OwnerRepoParams.shape,
      ...CompareParams.shape,
      file_path: z.string().describe('File path relative to repo root.'),
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
