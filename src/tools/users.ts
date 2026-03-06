import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { ServiceEnum, PaginationParams } from '../schemas/shared.js'
import { resolveOwnerParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

export function registerUserTools(server: McpServer, config: Config, client: CodecovClient) {
  server.registerTool(
    'list_users',
    {
      description: 'List users in an organization with their activation status. Use this to see who is consuming activated seats or to find specific users. Filterable by activation status, admin status, or search term.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        service: ServiceEnum.optional()
          .describe('Git hosting service.'),
        owner: z.string().optional()
          .describe('Organization or username.'),
        activated: z.boolean().optional().describe('Filter by activation status.'),
        is_admin: z.boolean().optional().describe('Filter to admin users only.'),
        search: z.string().optional().describe('Search users by username or name.'),
        ...PaginationParams.shape,
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner } = resolveOwnerParams(config, args)
      const params: Record<string, string | number | boolean> = {
        page: args.page ?? 1,
        page_size: args.page_size ?? 25,
      }
      if (args.activated !== undefined) params.activated = args.activated
      if (args.is_admin !== undefined) params.is_admin = args.is_admin
      if (args.search) params.search = args.search

      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/users/`,
        params,
      )
      return toolResult({
        count: data.count,
        users: data.results.map(r => normalizeKeysDeep(r)),
      })
    }),
  )

  server.registerTool(
    'get_user',
    {
      description: 'Get details for a specific user in an organization by username or owner ID.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        service: ServiceEnum.optional().describe('Git hosting service.'),
        owner: z.string().optional().describe('Organization or username.'),
        user_id: z.string().describe('Username or owner ID from list_users.'),
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner } = resolveOwnerParams(config, args)
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/users/${args.user_id}/`,
      )
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  if (config.enableAdminTools) {
    server.registerTool(
      'update_user',
      {
        description: 'Activate or deactivate a user in an organization. This is the only mutating endpoint. Requires org admin permissions. The confirm parameter must be set to true as a safety guard. Only available when CODECOV_ENABLE_ADMIN_TOOLS=true.',
        annotations: { destructiveHint: true, readOnlyHint: false, idempotentHint: true },
        inputSchema: {
          service: ServiceEnum.optional().describe('Git hosting service.'),
          owner: z.string().optional().describe('Organization or username.'),
          user_id: z.string().describe('Username or owner ID.'),
          activated: z.boolean().describe('Set activation status.'),
          confirm: z.literal(true).describe('Must be true. Safety guard to prevent accidental mutations.'),
        },
      },
      withErrorHandling(async (args) => {
        const { service, owner } = resolveOwnerParams(config, args)
        const data = await client.patch<Record<string, unknown>>(
          `/api/v2/${service}/${owner}/users/${args.user_id}/`,
          { activated: args.activated },
        )
        return toolResult(normalizeKeysDeep(data))
      }),
    )

    server.registerTool(
      'list_user_sessions',
      {
        description: 'List login sessions for users in an organization. Shows session tokens and last-seen timestamps. Only available when CODECOV_ENABLE_ADMIN_TOOLS=true.',
        annotations: { readOnlyHint: true },
        inputSchema: {
          service: ServiceEnum.optional().describe('Git hosting service.'),
          owner: z.string().optional().describe('Organization or username.'),
          ...PaginationParams.shape,
        },
      },
      withErrorHandling(async (args) => {
        const { service, owner } = resolveOwnerParams(config, args)
        const data = await client.list<Record<string, unknown>>(
          `/api/v2/${service}/${owner}/user-sessions/`,
          { page: args.page ?? 1, page_size: args.page_size ?? 25 },
        )
        return toolResult({
          count: data.count,
          sessions: data.results.map(r => normalizeKeysDeep(r)),
        })
      }),
    )
  }
}
