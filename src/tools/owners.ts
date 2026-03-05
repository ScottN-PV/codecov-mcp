import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { ServiceEnum, PaginationParams } from '../schemas/shared.js'
import { resolveServiceParam, resolveOwnerParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

export function registerOwnerTools(server: McpServer, config: Config, client: CodecovClient) {
  server.tool(
    'list_owners',
    'List all organizations and users the authenticated token has access to on a given git service. Use this to discover which owners/orgs you can query repos for.',
    {
      service: ServiceEnum.optional()
        .describe('Git hosting service. Defaults to CODECOV_SERVICE env var or auto-detected from git remote.'),
      ...PaginationParams.shape,
    },
    withErrorHandling(async (args) => {
      const service = resolveServiceParam(config, args)
      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/`,
        { page: args.page ?? 1, page_size: args.page_size ?? 25 },
      )
      return toolResult({
        count: data.count,
        owners: (data.results as Record<string, unknown>[]).map(r => normalizeKeysDeep(r)),
      })
    }),
  )

  server.tool(
    'get_owner',
    'Get details about a specific owner (organization or user), including their username and display name.',
    {
      service: ServiceEnum.optional()
        .describe('Git hosting service. Defaults to CODECOV_SERVICE env var or auto-detected from git remote.'),
      owner: z.string().optional()
        .describe('Organization or username. Defaults to CODECOV_OWNER env var or auto-detected from git remote.'),
    },
    withErrorHandling(async (args) => {
      const { service, owner } = resolveOwnerParams(config, args)
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/`,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )
}
