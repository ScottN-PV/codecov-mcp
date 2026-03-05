import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createServer } from '../../src/server.js'
import { makeConfig } from '../helpers.js'

// Mock the git remote to avoid real git calls
vi.mock('../../src/utils/git-remote.js', () => ({
  detectGitRemote: () => null,
}))

describe('createServer', () => {
  let client: Client

  beforeEach(async () => {
    const server = createServer(makeConfig())
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'test-client', version: '0.0.1' })
    await server.connect(serverTransport)
    await client.connect(clientTransport)
  })

  it('registers all 37 tools', async () => {
    const { tools } = await client.listTools()
    expect(tools).toHaveLength(37)
  })

  it('registers expected tool names', async () => {
    const { tools } = await client.listTools()
    const names = tools.map(t => t.name).sort()
    expect(names).toContain('get_coverage_summary')
    expect(names).toContain('get_pr_coverage')
    expect(names).toContain('get_coverage_totals')
    expect(names).toContain('compare_coverage')
    expect(names).toContain('validate_yaml')
    expect(names).toContain('get_file_coverage')
  })

  it('registers all 5 prompts', async () => {
    const { prompts } = await client.listPrompts()
    expect(prompts).toHaveLength(5)
    const names = prompts.map(p => p.name)
    expect(names).toContain('coverage_review')
    expect(names).toContain('pr_coverage_check')
    expect(names).toContain('suggest_tests')
    expect(names).toContain('flaky_test_report')
    expect(names).toContain('coverage_health_check')
  })
})
