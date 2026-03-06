import { vi } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { Config } from '../src/types.js'
import type { CodecovClient } from '../src/client.js'

export function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    token: 'test-token',
    baseUrl: 'https://api.codecov.io',
    timeoutMs: 5000,
    maxRetries: 0,
    cacheTtlMs: 300000,
    enableAdminTools: false,
    ...overrides,
  }
}

export function makeMockClient() {
  return {
    get: vi.fn(),
    list: vi.fn(),
    patch: vi.fn(),
    postPublic: vi.fn(),
  } as unknown as CodecovClient & {
    get: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
    patch: ReturnType<typeof vi.fn>
    postPublic: ReturnType<typeof vi.fn>
  }
}

export async function createTestClient(
  registerFn: (server: McpServer, config: Config, client: CodecovClient) => void,
  config?: Config,
): Promise<{ client: Client; mcpServer: McpServer; mockClient: ReturnType<typeof makeMockClient> }> {
  const mockClient = makeMockClient()
  const cfg = config ?? makeConfig()
  const mcpServer = new McpServer({ name: 'test', version: '0.0.1' })
  registerFn(mcpServer, cfg, mockClient)

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const mcpClient = new Client({ name: 'test-client', version: '0.0.1' })

  await mcpServer.connect(serverTransport)
  await mcpClient.connect(clientTransport)

  return { client: mcpClient, mcpServer, mockClient }
}

export function paginatedResponse(results: unknown[], count?: number) {
  return { count: count ?? results.length, next: null, previous: null, results }
}
