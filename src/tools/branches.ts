import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { OwnerRepoParams, PaginationParams } from '../schemas/shared.js'
import { resolveRepoParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

export function registerBranchTools(server: McpServer, config: Config, client: CodecovClient) {
  server.registerTool(
    'list_branches',
    {
      description: 'List branches for a repository with their latest coverage data. Useful for comparing coverage across branches.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        ...OwnerRepoParams.shape,
        ordering: z.string().optional().describe('Sort field (e.g. "-updatestamp", "name").'),
        author: z.string().optional().describe('Filter by branch author.'),
        ...PaginationParams.shape,
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const params: Record<string, string | number | boolean> = {
        page: args.page ?? 1,
        page_size: args.page_size ?? 25,
      }
      if (args.ordering) params.ordering = args.ordering
      if (args.author) params.author = args.author

      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/branches/`,
        params,
      )
      return toolResult({
        count: data.count,
        branches: data.results.map(r => normalizeKeysDeep(r)),
      })
    }),
  )

  server.registerTool(
    'get_branch',
    {
      description: 'Get coverage details for a specific branch. Returns the latest commit SHA and coverage totals for that branch.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        ...OwnerRepoParams.shape,
        branch: z.string().describe('Branch name.'),
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/branches/${encodeURIComponent(args.branch)}/`,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )
}
