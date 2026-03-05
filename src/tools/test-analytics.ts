import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { OwnerRepoParams, BranchParam, PaginationParams } from '../schemas/shared.js'
import { resolveRepoParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

export function registerTestAnalyticsTools(server: McpServer, config: Config, client: CodecovClient) {
  server.tool(
    'list_test_analytics',
    'List test results with analytics data for a repository. Shows test names, pass/fail counts, average duration, and failure rate. Filterable by outcome, branch, and test name. Use this to find slow, flaky, or failing tests.',
    {
      ...OwnerRepoParams.shape,
      ...BranchParam.shape,
      outcome: z.enum(['pass', 'failure', 'skip', 'error']).optional()
        .describe('Filter by test outcome.'),
      term: z.string().optional().describe('Search test names.'),
      ordering: z.string().optional().describe('Sort field (e.g. "-avg_duration", "failure_rate").'),
      ...PaginationParams.shape,
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const params: Record<string, string | number | boolean> = {
        page: args.page ?? 1,
        page_size: args.page_size ?? 25,
      }
      if (args.branch) params.branch = args.branch
      if (args.outcome) params.outcome = args.outcome
      if (args.term) params.term = args.term
      if (args.ordering) params.ordering = args.ordering

      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/test-analytics/`,
        params,
      )
      return toolResult({
        count: data.count,
        tests: (data.results as Record<string, unknown>[]).map(r => normalizeKeysDeep(r)),
      })
    }),
  )
}
