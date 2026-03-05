import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { OwnerRepoParams } from '../schemas/shared.js'
import { resolveRepoParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

export function registerEvaluationTools(server: McpServer, config: Config, client: CodecovClient) {
  server.registerTool(
    'get_eval_summary',
    {
      description: 'Get AI/LLM evaluation metrics summary for a repository. Shows average duration, cost, pass/fail counts, and score breakdowns. Use this to monitor AI model quality over time.',
      inputSchema: {
        ...OwnerRepoParams.shape,
        branch: z.string().optional().describe('Branch name.'),
        interval: z.enum(['1d', '7d', '30d']).optional().describe('Aggregation interval.'),
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const params: Record<string, string | number | boolean> = {}
      if (args.branch) params.branch = args.branch
      if (args.interval) params.interval = args.interval

      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/evals/summary/`,
        params,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.registerTool(
    'get_eval_comparison',
    {
      description: 'Compare AI/LLM evaluation metrics between two commits. Use this to detect model regressions or improvements.',
      inputSchema: {
        ...OwnerRepoParams.shape,
        base_sha: z.string().optional().describe('Base commit SHA.'),
        head_sha: z.string().optional().describe('Head commit SHA.'),
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const params: Record<string, string | number | boolean> = {}
      if (args.base_sha) params.base_sha = args.base_sha
      if (args.head_sha) params.head_sha = args.head_sha

      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/evals/compare/`,
        params,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )
}
