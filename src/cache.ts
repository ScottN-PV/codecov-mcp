interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class LRUCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>()
  private readonly maxEntries: number
  private readonly ttlMs: number

  constructor(ttlMs: number, maxEntries = 100) {
    this.ttlMs = ttlMs
    this.maxEntries = maxEntries
  }

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key) as CacheEntry<T> | undefined
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key)
      return undefined
    }
    // Move to end (most recently used)
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.value
  }

  set<T>(key: string, value: T): void {
    // Delete first to refresh position
    this.entries.delete(key)
    // Evict oldest if at capacity
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) {
        this.entries.delete(oldest)
      }
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.entries.clear()
      return
    }
    for (const key of this.entries.keys()) {
      if (key.includes(pattern)) {
        this.entries.delete(key)
      }
    }
  }

  get size(): number {
    return this.entries.size
  }
}
