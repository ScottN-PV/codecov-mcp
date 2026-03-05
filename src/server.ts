import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Config } from './types.js'
import { CodecovClient } from './client.js'
import { LRUCache } from './cache.js'
import { registerOwnerTools } from './tools/owners.js'
import { registerUserTools } from './tools/users.js'
import { registerRepoTools } from './tools/repos.js'
import { registerBranchTools } from './tools/branches.js'
import { registerCommitTools } from './tools/commits.js'
import { registerCoverageTools } from './tools/coverage.js'
import { registerComparisonTools } from './tools/comparison.js'
import { registerPullTools } from './tools/pulls.js'
import { registerFlagTools } from './tools/flags.js'
import { registerComponentTools } from './tools/components.js'
import { registerTestAnalyticsTools } from './tools/test-analytics.js'
import { registerEvaluationTools } from './tools/evaluations.js'
import { registerCompositeTools } from './tools/composite.js'
import { registerPrompts } from './prompts/index.js'
import { registerResources } from './resources/index.js'

export function createServer(config: Config): McpServer {
  const cache = new LRUCache(config.cacheTtlMs)
  const client = new CodecovClient(config, cache)

  const server = new McpServer({
    name: 'codecov-mcp',
    version: '0.1.0',
  })

  // Register all tool groups
  registerOwnerTools(server, config, client)
  registerUserTools(server, config, client)
  registerRepoTools(server, config, client)
  registerBranchTools(server, config, client)
  registerCommitTools(server, config, client)
  registerCoverageTools(server, config, client)
  registerComparisonTools(server, config, client)
  registerPullTools(server, config, client)
  registerFlagTools(server, config, client)
  registerComponentTools(server, config, client)
  registerTestAnalyticsTools(server, config, client)
  registerEvaluationTools(server, config, client)
  registerCompositeTools(server, config, client)

  // Register prompts and resources
  registerPrompts(server)
  registerResources(server, config, client)

  return server
}
