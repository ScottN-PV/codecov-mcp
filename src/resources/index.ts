import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { resolveOwnerParams } from '../utils/resolve-params.js'

export function registerResources(server: McpServer, config: Config, client: CodecovClient) {
  // codecov://{owner}/repos — list repos for an owner
  server.resource(
    'repos',
    new ResourceTemplate('codecov://{owner}/repos', { list: undefined }),
    { description: 'List of all repositories for a specific owner with their current coverage.' },
    async (uri, params) => {
      const owner = params.owner as string
      const { service } = resolveOwnerParams(config, { owner })
      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/`,
        { page_size: 100 },
      )
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            (data.results as Record<string, unknown>[]).map(r => normalizeKeysDeep(r)),
            null,
            2,
          ),
        }],
      }
    },
  )

  // codecov://repo/{owner}/{repo} — repo coverage summary
  server.resource(
    'repo',
    new ResourceTemplate('codecov://repo/{owner}/{repo}', { list: undefined }),
    { description: 'Current coverage summary for a specific repository.' },
    async (uri, params) => {
      const owner = params.owner as string
      const repo = params.repo as string
      const { service } = resolveOwnerParams(config, { owner })
      const data = await client.get<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/`,
      )
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(normalizeKeysDeep(data), null, 2),
        }],
      }
    },
  )

  // codecov://repo/{owner}/{repo}/flags — flag coverage
  server.resource(
    'flags',
    new ResourceTemplate('codecov://repo/{owner}/{repo}/flags', { list: undefined }),
    { description: 'Coverage flags and their current percentages for a repository.' },
    async (uri, params) => {
      const owner = params.owner as string
      const repo = params.repo as string
      const { service } = resolveOwnerParams(config, { owner })
      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/flags/`,
        { page_size: 100 },
      )
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            (data.results as Record<string, unknown>[]).map(r => normalizeKeysDeep(r)),
            null,
            2,
          ),
        }],
      }
    },
  )

  // codecov://repo/{owner}/{repo}/components — component coverage
  server.resource(
    'components',
    new ResourceTemplate('codecov://repo/{owner}/{repo}/components', { list: undefined }),
    { description: 'Coverage components and their current percentages for a repository.' },
    async (uri, params) => {
      const owner = params.owner as string
      const repo = params.repo as string
      const { service } = resolveOwnerParams(config, { owner })
      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/components/`,
        { page_size: 100 },
      )
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            (data.results as Record<string, unknown>[]).map(r => normalizeKeysDeep(r)),
            null,
            2,
          ),
        }],
      }
    },
  )
}
