import { describe, it, expect } from 'vitest'
import { CodecovError, formatApiError, requireToken } from '../../src/utils/errors.js'

describe('CodecovError', () => {
  it('creates error with message and status', () => {
    const err = new CodecovError('test error', 404, '/api/v2/github/')
    expect(err.message).toBe('test error')
    expect(err.statusCode).toBe(404)
    expect(err.endpoint).toBe('/api/v2/github/')
    expect(err.name).toBe('CodecovError')
  })
})

describe('formatApiError', () => {
  it('returns specific message for 401', () => {
    const err = formatApiError(401, '/test')
    expect(err.message).toContain('Authentication failed')
    expect(err.statusCode).toBe(401)
  })

  it('returns specific message for 403', () => {
    const err = formatApiError(403, '/test')
    expect(err.message).toContain('Access denied')
  })

  it('returns specific message for 404', () => {
    const err = formatApiError(404, '/api/v2/github/my-org/repos/my-repo/')
    expect(err.message).toContain('not found')
  })

  it('returns specific message for 429', () => {
    const err = formatApiError(429, '/test')
    expect(err.message).toContain('Rate limit')
  })

  it('returns server error for 5xx', () => {
    const err = formatApiError(500, '/test')
    expect(err.message).toContain('server error')
  })

  it('includes body details when provided', () => {
    const err = formatApiError(400, '/test', 'invalid parameters')
    expect(err.message).toContain('invalid parameters')
  })
})

describe('requireToken', () => {
  it('returns token when provided', () => {
    expect(requireToken('my-token')).toBe('my-token')
  })

  it('throws CodecovError when token is undefined', () => {
    expect(() => requireToken(undefined)).toThrow(CodecovError)
    expect(() => requireToken(undefined)).toThrow('CODECOV_TOKEN is not set')
  })
})
