import { describe, it, expect } from 'vitest'
import { validateCompareParams } from '../../src/schemas/shared.js'

describe('validateCompareParams', () => {
  it('accepts pullid alone', () => {
    expect(() => validateCompareParams({ pullid: 42 })).not.toThrow()
  })

  it('accepts base and head together', () => {
    expect(() => validateCompareParams({ base: 'abc', head: 'def' })).not.toThrow()
  })

  it('accepts all three', () => {
    expect(() => validateCompareParams({ pullid: 1, base: 'a', head: 'b' })).not.toThrow()
  })

  it('rejects empty params', () => {
    expect(() => validateCompareParams({})).toThrow('Provide either pullid, or both base and head.')
  })

  it('rejects base without head', () => {
    expect(() => validateCompareParams({ base: 'abc' })).toThrow()
  })

  it('rejects head without base', () => {
    expect(() => validateCompareParams({ head: 'def' })).toThrow()
  })
})
