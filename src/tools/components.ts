import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { OwnerRepoParams, PaginationParams } from '../schemas/shared.js'
import { resolveRepoParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

export function registerComponentTools(server: McpServer, config: Config, client: CodecovClient) {
  server.registerTool(
    'list_components',
    {
      description: 'List coverage components for a repository with their current coverage percentages. Components are logical groupings defined in codecov.yaml (e.g. frontend, backend, shared).',
      inputSchema: {
        ...OwnerRepoParams.shape,
        ...PaginationParams.shape,
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/components/`,
        { page: args.page ?? 1, page_size: args.page_size ?? 25 },
      )
      return toolResult({
        count: data.count ?? 0,
        components: (data.results ?? []).map(r => normalizeKeysDeep(r)),
      })
    }),
  )
}
