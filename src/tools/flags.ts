import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { OwnerRepoParams, BranchParam, PaginationParams } from '../schemas/shared.js'
import { resolveRepoParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

export function registerFlagTools(server: McpServer, config: Config, client: CodecovClient) {
  server.tool(
    'list_flags',
    'List coverage flags for a repository with their current coverage percentages. Flags represent test types (e.g. unit, integration, e2e).',
    {
      ...OwnerRepoParams.shape,
      ...PaginationParams.shape,
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/flags/`,
        { page: args.page ?? 1, page_size: args.page_size ?? 25 },
      )
      return toolResult({
        count: data.count,
        flags: (data.results as Record<string, unknown>[]).map(r => normalizeKeysDeep(r)),
      })
    }),
  )

  server.tool(
    'get_flag_coverage_trend',
    'Get time-series coverage data for a specific flag. Track how unit test coverage, integration test coverage, or any other flag category is trending over time — independently of overall repo coverage.',
    {
      ...OwnerRepoParams.shape,
      flag: z.string().describe('Flag name (e.g. unit, integration, e2e).'),
      interval: z.enum(['1d', '7d', '30d'])
        .describe('Aggregation interval. REQUIRED.'),
      ...BranchParam.shape,
      start_date: z.string().optional().describe('Start date (ISO 8601).'),
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
        `/api/v2/${service}/${owner}/repos/${repo}/flags/${encodeURIComponent(args.flag)}/coverage/`,
        params,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )
}
