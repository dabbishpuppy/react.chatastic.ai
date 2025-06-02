
import { LRUCache } from 'lru-cache';

export interface CacheEntry {
  response: string;
  sources: Array<{
    id: string;
    name: string;
    relevance: number;
  }>;
  metadata: {
    timestamp: number;
    agentId: string;
    queryHash: string;
    processingTime: number;
    hitCount: number;
  };
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export class RAGResponseCache {
  private static cache = new LRUCache<string, CacheEntry>({
    max: 1000, // Maximum 1000 cached responses
    ttl: 1000 * 60 * 15, // 15 minutes TTL
    updateAgeOnGet: true,
    allowStale: false
  });

  private static hitCount = 0;
  private static missCount = 0;

  static generateCacheKey(query: string, agentId: string, options?: any): string {
    // Create a hash-like key from query, agent, and relevant options
    const optionsString = options ? JSON.stringify(options) : '';
    const combined = `${query}:${agentId}:${optionsString}`;
    
    // Simple hash function (in production, use a proper hash)
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `rag_${Math.abs(hash).toString(36)}`;
  }

  static get(cacheKey: string): CacheEntry | null {
    const entry = this.cache.get(cacheKey);
    
    if (entry) {
      entry.metadata.hitCount++;
      this.hitCount++;
      
      console.log('📦 Cache hit for RAG response:', {
        key: cacheKey.substring(0, 16) + '...',
        age: Date.now() - entry.metadata.timestamp,
        hitCount: entry.metadata.hitCount
      });
      
      return entry;
    }
    
    this.missCount++;
    console.log('🔍 Cache miss for RAG response:', {
      key: cacheKey.substring(0, 16) + '...'
    });
    
    return null;
  }

  static set(
    cacheKey: string,
    response: string,
    sources: CacheEntry['sources'],
    agentId: string,
    processingTime: number
  ): void {
    const entry: CacheEntry = {
      response,
      sources,
      metadata: {
        timestamp: Date.now(),
        agentId,
        queryHash: cacheKey,
        processingTime,
        hitCount: 0
      }
    };

    this.cache.set(cacheKey, entry);
    
    console.log('💾 Cached RAG response:', {
      key: cacheKey.substring(0, 16) + '...',
      responseLength: response.length,
      sources: sources.length,
      processingTime
    });
  }

  static invalidate(pattern?: string): number {
    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      console.log('🗑️ Cleared all cache entries:', size);
      return size;
    }

    // Invalidate entries matching pattern
    let invalidated = 0;
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      invalidated++;
    });
    
    console.log('🗑️ Invalidated cache entries:', {
      pattern,
      count: invalidated
    });
    
    return invalidated;
  }

  static invalidateForAgent(agentId: string): number {
    let invalidated = 0;
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.agentId === agentId) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      invalidated++;
    });
    
    console.log('🗑️ Invalidated cache for agent:', {
      agentId,
      count: invalidated
    });
    
    return invalidated;
  }

  static getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.hitCount + this.missCount;
    
    return {
      totalEntries: this.cache.size,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      memoryUsage: this.cache.calculatedSize || 0,
      oldestEntry: entries.length > 0 
        ? Math.min(...entries.map(e => e.metadata.timestamp))
        : 0,
      newestEntry: entries.length > 0
        ? Math.max(...entries.map(e => e.metadata.timestamp))
        : 0
    };
  }

  static getTopCachedQueries(limit: number = 10): Array<{
    queryHash: string;
    hitCount: number;
    agentId: string;
    lastAccess: number;
  }> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        queryHash: key,
        hitCount: entry.metadata.hitCount,
        agentId: entry.metadata.agentId,
        lastAccess: entry.metadata.timestamp
      }))
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit);

    return entries;
  }

  static warmup(queries: Array<{
    query: string;
    agentId: string;
    expectedResponse: string;
    sources: CacheEntry['sources'];
  }>): number {
    console.log('🔥 Warming up cache with queries:', queries.length);
    
    let cached = 0;
    
    queries.forEach(({ query, agentId, expectedResponse, sources }) => {
      const cacheKey = this.generateCacheKey(query, agentId);
      
      if (!this.cache.has(cacheKey)) {
        this.set(cacheKey, expectedResponse, sources, agentId, 0);
        cached++;
      }
    });
    
    console.log('✅ Cache warmup complete:', {
      totalQueries: queries.length,
      newlyCached: cached,
      skipped: queries.length - cached
    });
    
    return cached;
  }

  static exportCache(): string {
    const entries = Array.from(this.cache.entries());
    return JSON.stringify(entries, null, 2);
  }

  static importCache(cacheData: string): number {
    try {
      const entries = JSON.parse(cacheData) as Array<[string, CacheEntry]>;
      let imported = 0;
      
      entries.forEach(([key, entry]) => {
        this.cache.set(key, entry);
        imported++;
      });
      
      console.log('📥 Imported cache entries:', imported);
      return imported;
    } catch (error) {
      console.error('❌ Failed to import cache:', error);
      return 0;
    }
  }
}
