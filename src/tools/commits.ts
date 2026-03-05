import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { OwnerRepoParams, BranchParam, PaginationParams } from '../schemas/shared.js'
import { resolveRepoParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

export function registerCommitTools(server: McpServer, config: Config, client: CodecovClient) {
  server.registerTool(
    'list_commits',
    {
      description: 'List commits for a repository with their coverage totals. Filterable by branch. Use this to track coverage changes over time at the commit level.',
      inputSchema: {
        ...OwnerRepoParams.shape,
        ...BranchParam.shape,
        ...PaginationParams.shape,
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const params: Record<string, string | number | boolean> = {
        page: args.page ?? 1,
        page_size: args.page_size ?? 25,
      }
      if (args.branch) params.branch = args.branch

      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/commits/`,
        params,
      )
      return toolResult({
        count: data.count,
        commits: data.results.map(r => normalizeKeysDeep(r)),
      })
    }),
  )

  server.registerTool(
    'get_commit',
    {
      description: 'Get detailed coverage data for a specific commit, including total lines, hits, misses, and partial coverage counts.',
      inputSchema: {
        ...OwnerRepoParams.shape,
        sha: z.string().describe('Commit SHA.'),
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/commits/${args.sha}/`,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.registerTool(
    'list_commit_uploads',
    {
      description: 'List coverage uploads for a specific commit. Shows individual upload sessions — useful for debugging CI coverage reporting issues.',
      inputSchema: {
        ...OwnerRepoParams.shape,
        sha: z.string().describe('Commit SHA.'),
        ...PaginationParams.shape,
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/commits/${args.sha}/uploads/`,
        { page: args.page ?? 1, page_size: args.page_size ?? 25 },
      )
      return toolResult({
        count: data.count,
        uploads: data.results.map(r => normalizeKeysDeep(r)),
      })
    }),
  )
}
