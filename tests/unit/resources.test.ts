import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerResources } from '../../src/resources/index.js'
import { makeMockClient, makeConfig, paginatedResponse } from '../helpers.js'
import type { CodecovClient } from '../../src/client.js'

vi.mock('../../src/utils/git-remote.js', () => ({
  detectGitRemote: () => ({ service: 'github', owner: 'test-owner', repo: 'test-repo' }),
}))

describe('resources', () => {
  let client: Client
  let mockClient: CodecovClient & { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    mockClient = makeMockClient()
    const server = new McpServer({ name: 'test', version: '0.0.1' })
    registerResources(server, makeConfig(), mockClient)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'test-client', version: '0.0.1' })
    await server.connect(serverTransport)
    await client.connect(clientTransport)
  })

  afterEach(() => vi.restoreAllMocks())

  it('repos resource returns repo list', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([
      { name: 'repo1', coverage: 90 },
      { name: 'repo2', coverage: 75 },
    ]))

    const result = await client.readResource({ uri: 'codecov://myorg/repos' })
    expect(result.contents).toHaveLength(1)
    const data = JSON.parse(result.contents[0].text as string)
    expect(data).toHaveLength(2)
    expect(data[0].name).toBe('repo1')
  })

  it('repo resource returns repo details', async () => {
    mockClient.get.mockResolvedValueOnce({
      name: 'my-repo',
      branch: 'main',
      totals: { coverage: 88 },
    })

    const result = await client.readResource({ uri: 'codecov://repo/myorg/my-repo' })
    const data = JSON.parse(result.contents[0].text as string)
    expect(data.name).toBe('my-repo')
    expect(data.totals.coverage).toBe(88)
  })

  it('flags resource returns flag list', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([
      { flag_name: 'unit', coverage: 92 },
    ]))

    const result = await client.readResource({ uri: 'codecov://repo/myorg/my-repo/flags' })
    const data = JSON.parse(result.contents[0].text as string)
    expect(data).toHaveLength(1)
    expect(data[0].flagName).toBe('unit')
  })

  it('components resource returns component list', async () => {
    mockClient.list.mockResolvedValueOnce(paginatedResponse([
      { component_id: 'frontend', coverage: 85 },
    ]))

    const result = await client.readResource({ uri: 'codecov://repo/myorg/my-repo/components' })
    const data = JSON.parse(result.contents[0].text as string)
    expect(data).toHaveLength(1)
    expect(data[0].componentId).toBe('frontend')
  })
})
