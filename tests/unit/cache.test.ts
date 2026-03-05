import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LRUCache } from '../../src/cache.js'

describe('LRUCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stores and retrieves values', () => {
    const cache = new LRUCache(60000)
    cache.set('key1', { data: 'hello' })
    expect(cache.get('key1')).toEqual({ data: 'hello' })
  })

  it('returns undefined for missing keys', () => {
    const cache = new LRUCache(60000)
    expect(cache.get('missing')).toBeUndefined()
  })

  it('expires entries after TTL', () => {
    const cache = new LRUCache(5000)
    cache.set('key1', 'value')
    expect(cache.get('key1')).toBe('value')

    vi.advanceTimersByTime(6000)
    expect(cache.get('key1')).toBeUndefined()
  })

  it('evicts oldest when at max capacity', () => {
    const cache = new LRUCache(60000, 3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    cache.set('d', 4) // should evict 'a'

    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('d')).toBe(4)
  })

  it('refreshes position on get', () => {
    const cache = new LRUCache(60000, 3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)

    // Access 'a' to make it recently used
    cache.get('a')
    cache.set('d', 4) // should evict 'b' (oldest unused)

    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBeUndefined()
  })

  it('invalidates all entries', () => {
    const cache = new LRUCache(60000)
    cache.set('key1', 'v1')
    cache.set('key2', 'v2')
    cache.invalidate()

    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  it('invalidates entries matching pattern', () => {
    const cache = new LRUCache(60000)
    cache.set('/repos/my-repo/coverage', 'cov')
    cache.set('/repos/my-repo/flags', 'flags')
    cache.set('/repos/other/coverage', 'other')

    cache.invalidate('my-repo')

    expect(cache.get('/repos/my-repo/coverage')).toBeUndefined()
    expect(cache.get('/repos/my-repo/flags')).toBeUndefined()
    expect(cache.get('/repos/other/coverage')).toBe('other')
  })

  it('tracks size correctly', () => {
    const cache = new LRUCache(60000)
    expect(cache.size).toBe(0)
    cache.set('a', 1)
    expect(cache.size).toBe(1)
    cache.set('b', 2)
    expect(cache.size).toBe(2)
    cache.invalidate()
    expect(cache.size).toBe(0)
  })
})
