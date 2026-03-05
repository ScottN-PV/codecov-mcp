import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerPrompts } from '../../src/prompts/index.js'

describe('prompts', () => {
  let client: Client

  beforeEach(async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' })
    registerPrompts(server)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'test-client', version: '0.0.1' })
    await server.connect(serverTransport)
    await client.connect(clientTransport)
  })

  it('coverage_review returns structured prompt', async () => {
    const result = await client.getPrompt({
      name: 'coverage_review',
      arguments: { owner: 'myorg', repo: 'myrepo' },
    })
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].role).toBe('user')
    const text = (result.messages[0].content as { text: string }).text
    expect(text).toContain('myorg/myrepo')
    expect(text).toContain('get_coverage_totals')
  })

  it('pr_coverage_check references get_pr_coverage', async () => {
    const result = await client.getPrompt({
      name: 'pr_coverage_check',
      arguments: { pullid: '42' },
    })
    const text = (result.messages[0].content as { text: string }).text
    expect(text).toContain('PR #42')
    expect(text).toContain('get_pr_coverage')
  })

  it('suggest_tests includes file path', async () => {
    const result = await client.getPrompt({
      name: 'suggest_tests',
      arguments: { file_path: 'src/auth.ts' },
    })
    const text = (result.messages[0].content as { text: string }).text
    expect(text).toContain('src/auth.ts')
    expect(text).toContain('get_file_coverage')
  })

  it('flaky_test_report references find_flaky_tests', async () => {
    const result = await client.getPrompt({
      name: 'flaky_test_report',
      arguments: {},
    })
    const text = (result.messages[0].content as { text: string }).text
    expect(text).toContain('find_flaky_tests')
  })

  it('coverage_health_check references coverage summary', async () => {
    const result = await client.getPrompt({
      name: 'coverage_health_check',
      arguments: { owner: 'org', repo: 'repo' },
    })
    const text = (result.messages[0].content as { text: string }).text
    expect(text).toContain('org/repo')
    expect(text).toContain('health report card')
  })
})
