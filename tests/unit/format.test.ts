import { describe, it, expect } from 'vitest'
import { normalizeKeys, normalizeKeysDeep } from '../../src/utils/format.js'

describe('normalizeKeys', () => {
  it('converts snake_case to camelCase', () => {
    expect(normalizeKeys({ owner_id: 123, flag_name: 'unit' })).toEqual({
      ownerId: 123,
      flagName: 'unit',
    })
  })

  it('leaves camelCase keys unchanged', () => {
    expect(normalizeKeys({ alreadyCamel: true })).toEqual({ alreadyCamel: true })
  })

  it('handles single-word keys', () => {
    expect(normalizeKeys({ name: 'test' })).toEqual({ name: 'test' })
  })
})

describe('normalizeKeysDeep', () => {
  it('recursively normalizes nested objects', () => {
    const input = {
      repo_name: 'test',
      totals: { line_count: 100, hit_count: 80 },
    }
    expect(normalizeKeysDeep(input)).toEqual({
      repoName: 'test',
      totals: { lineCount: 100, hitCount: 80 },
    })
  })

  it('normalizes arrays of objects', () => {
    const input = [{ flag_name: 'unit' }, { flag_name: 'e2e' }]
    expect(normalizeKeysDeep(input)).toEqual([{ flagName: 'unit' }, { flagName: 'e2e' }])
  })

  it('passes through primitives', () => {
    expect(normalizeKeysDeep(42)).toBe(42)
    expect(normalizeKeysDeep('hello')).toBe('hello')
    expect(normalizeKeysDeep(null)).toBeNull()
    expect(normalizeKeysDeep(true)).toBe(true)
  })
})
