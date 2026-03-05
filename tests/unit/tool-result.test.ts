import { describe, it, expect } from 'vitest'
import { toolResult, toolError, withErrorHandling } from '../../src/utils/tool-result.js'
import { CodecovError } from '../../src/utils/errors.js'

describe('toolResult', () => {
  it('wraps data in MCP text content', () => {
    const result = toolResult({ coverage: 85.5 })
    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(JSON.parse(result.content[0].text)).toEqual({ coverage: 85.5 })
  })

  it('pretty-prints JSON with 2 spaces', () => {
    const result = toolResult({ a: 1 })
    expect(result.content[0].text).toBe('{\n  "a": 1\n}')
  })
})

describe('toolError', () => {
  it('wraps CodecovError message', () => {
    const err = new CodecovError('Token missing', 401)
    const result = toolError(err)
    expect(result.content[0].text).toBe('Token missing')
    expect(result.isError).toBe(true)
  })

  it('wraps generic Error', () => {
    const result = toolError(new Error('something broke'))
    expect(result.content[0].text).toBe('something broke')
    expect(result.isError).toBe(true)
  })

  it('wraps string errors', () => {
    const result = toolError('raw string error')
    expect(result.content[0].text).toBe('raw string error')
    expect(result.isError).toBe(true)
  })
})

describe('withErrorHandling', () => {
  it('passes through successful results', async () => {
    const handler = withErrorHandling(async () => toolResult({ ok: true }))
    const result = await handler({})
    expect(result.content[0].text).toBe('{\n  "ok": true\n}')
    expect(result).not.toHaveProperty('isError')
  })

  it('catches errors and returns toolError', async () => {
    const handler = withErrorHandling(async () => {
      throw new CodecovError('Not found', 404)
    })
    const result = await handler({})
    expect(result.content[0].text).toBe('Not found')
    expect(result.isError).toBe(true)
  })
})
