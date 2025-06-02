
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  enableStats?: boolean;
  compressionThreshold?: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0
  };
  
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly enableStats: boolean;
  private readonly compressionThreshold: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.enableStats = options.enableStats !== false;
    this.compressionThreshold = options.compressionThreshold || 10000; // 10KB
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.enableStats && this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.enableStats && this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.enableStats && this.stats.hits++;

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Ensure we don't exceed max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      ttl: ttl || this.defaultTTL,
      accessCount: 1,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.enableStats && this.stats.sets++;
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted && this.enableStats) {
      this.stats.deletes++;
    }
    return deleted;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.resetStats();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.cache.size,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0
    };
  }

  // Cache specific methods for RAG operations
  async getCachedQuery(queryHash: string): Promise<any> {
    return this.get(`query:${queryHash}`);
  }

  async setCachedQuery(queryHash: string, result: any, ttl?: number): Promise<void> {
    return this.set(`query:${queryHash}`, result, ttl);
  }

  async getCachedEmbedding(contentHash: string): Promise<number[] | null> {
    return this.get(`embedding:${contentHash}`);
  }

  async setCachedEmbedding(contentHash: string, embedding: number[], ttl?: number): Promise<void> {
    return this.set(`embedding:${contentHash}`, embedding, ttl);
  }

  async getCachedSearchResults(searchHash: string): Promise<any> {
    return this.get(`search:${searchHash}`);
  }

  async setCachedSearchResults(searchHash: string, results: any, ttl?: number): Promise<void> {
    return this.set(`search:${searchHash}`, results, ttl);
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    let oldestEntry: CacheEntry | null = null;
    let oldestKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (!oldestEntry || entry.lastAccessed < oldestEntry.lastAccessed) {
        oldestEntry = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.enableStats && this.stats.evictions++;
    }
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += JSON.stringify(entry).length * 2; // Rough estimate (UTF-16)
    }
    return totalSize;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  // Utility method to generate cache keys
  static generateKey(...parts: string[]): string {
    return parts.map(part => encodeURIComponent(part)).join(':');
  }

  // Cleanup expired entries
  async cleanup(): Promise<number> {
    let removedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }
}

// Global cache instance
export const globalCache = new CacheService({
  maxSize: 5000,
  defaultTTL: 600000, // 10 minutes
  enableStats: true
});
