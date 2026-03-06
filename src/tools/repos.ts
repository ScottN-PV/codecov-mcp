import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { ServiceEnum, PaginationParams, OwnerRepoParams } from '../schemas/shared.js'
import { resolveOwnerParams, resolveRepoParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

export function registerRepoTools(server: McpServer, config: Config, client: CodecovClient) {
  server.registerTool(
    'list_repos',
    {
      description: 'List repositories for an owner/organization. Filterable by active status, name search, and sortable. Use this to discover available repos before querying coverage.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        service: ServiceEnum.optional().describe('Git hosting service.'),
        owner: z.string().optional().describe('Organization or username.'),
        active: z.boolean().optional().describe('Filter by active status (has uploads).'),
        names: z.string().optional().describe('Filter repos by name (partial match).'),
        search: z.string().optional().describe('Search across repo names.'),
        ordering: z.string().optional().describe('Sort field (e.g. "-updatestamp", "name").'),
        ...PaginationParams.shape,
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner } = resolveOwnerParams(config, args)
      const params: Record<string, string | number | boolean> = {
        page: args.page ?? 1,
        page_size: args.page_size ?? 25,
      }
      if (args.active !== undefined) params.active = args.active
      if (args.names) params.names = args.names
      if (args.search) params.search = args.search
      if (args.ordering) params.ordering = args.ordering

      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/`,
        params,
      )
      return toolResult({
        count: data.count,
        repos: data.results.map(r => normalizeKeysDeep(r)),
      })
    }),
  )

  server.registerTool(
    'get_repo',
    {
      description: 'Get details for a specific repository including its current overall coverage, default branch, and language breakdown.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        ...OwnerRepoParams.shape,
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/`,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.registerTool(
    'get_repo_config',
    {
      description: 'Get the active Codecov YAML configuration for a repository. Returns the merged configuration that Codecov uses for this repo.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        ...OwnerRepoParams.shape,
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/config/`,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )
}
