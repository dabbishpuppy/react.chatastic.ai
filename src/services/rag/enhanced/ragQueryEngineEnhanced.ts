
import { RAGQueryEngine, RAGQueryRequest, RAGQueryResult } from '../queryProcessing/ragQueryEngine';
import { globalCache } from '../performance/cacheService';
import { globalPerformanceMonitor } from '../performance/performanceMonitor';
import { globalOptimizationService } from '../performance/optimizationService';

export class RAGQueryEngineEnhanced extends RAGQueryEngine {
  static async processQueryWithOptimizations(request: RAGQueryRequest): Promise<RAGQueryResult> {
    return globalPerformanceMonitor.timeFunction(
      'rag_query_processing',
      async () => {
        // Generate cache key for the query
        const cacheKey = this.generateQueryCacheKey(request);
        
        // Try to get cached result first
        const cachedResult = await globalCache.getCachedQuery(cacheKey);
        if (cachedResult) {
          console.log('📦 Using cached RAG query result');
          globalPerformanceMonitor.recordMetric('cache_hit', 1, 'count', { type: 'query' });
          return cachedResult;
        }

        // Cache miss - process normally
        globalPerformanceMonitor.recordMetric('cache_miss', 1, 'count', { type: 'query' });
        
        const result = await super.processQuery(request);
        
        // Cache the result for future use
        await globalCache.setCachedQuery(cacheKey, result, 600000); // 10 minutes
        
        // Trigger auto-optimizations if needed
        this.maybeRunOptimizations();
        
        return result;
      },
      {
        agentId: request.agentId,
        queryLength: request.query.length,
        hasFilters: !!request.searchFilters
      }
    );
  }

  static async processQueryWithStreaming(
    request: RAGQueryRequest,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<RAGQueryResult> {
    return globalPerformanceMonitor.timeFunction(
      'rag_query_processing_streaming',
      async () => {
        onProgress?.('preprocessing', 0.1);
        
        // Check cache first
        const cacheKey = this.generateQueryCacheKey(request);
        const cachedResult = await globalCache.getCachedQuery(cacheKey);
        if (cachedResult) {
          onProgress?.('complete', 1.0);
          return cachedResult;
        }

        onProgress?.('searching', 0.3);
        
        // Process with progress updates
        const result = await this.processWithProgressTracking(request, onProgress);
        
        // Cache result
        await globalCache.setCachedQuery(cacheKey, result);
        
        onProgress?.('complete', 1.0);
        return result;
      },
      { streaming: true, agentId: request.agentId }
    );
  }

  static async batchProcessQueries(requests: RAGQueryRequest[]): Promise<RAGQueryResult[]> {
    return globalPerformanceMonitor.timeFunction(
      'rag_batch_processing',
      async () => {
        console.log('📦 Processing batch of', requests.length, 'queries');
        
        const results: RAGQueryResult[] = [];
        const cacheKeys = requests.map(req => this.generateQueryCacheKey(req));
        
        // Check cache for all requests
        const cachePromises = cacheKeys.map(key => globalCache.getCachedQuery(key));
        const cachedResults = await Promise.all(cachePromises);
        
        // Process uncached requests
        const uncachedRequests: { request: RAGQueryRequest; index: number }[] = [];
        cachedResults.forEach((cached, index) => {
          if (cached) {
            results[index] = cached;
          } else {
            uncachedRequests.push({ request: requests[index], index });
          }
        });
        
        // Process uncached requests in parallel (with concurrency limit)
        const concurrency = 3;
        for (let i = 0; i < uncachedRequests.length; i += concurrency) {
          const batch = uncachedRequests.slice(i, i + concurrency);
          const batchPromises = batch.map(async ({ request, index }) => {
            const result = await super.processQuery(request);
            // Cache the result
            await globalCache.setCachedQuery(cacheKeys[index], result);
            return { result, index };
          });
          
          const batchResults = await Promise.all(batchPromises);
          batchResults.forEach(({ result, index }) => {
            results[index] = result;
          });
        }
        
        return results;
      },
      { batchSize: requests.length }
    );
  }

  private static generateQueryCacheKey(request: RAGQueryRequest): string {
    const keyParts = [
      request.query,
      request.agentId,
      request.conversationId || 'no-conversation',
      JSON.stringify(request.searchFilters || {}),
      JSON.stringify(request.rankingOptions || {})
    ];
    
    // Use the static method from CacheService directly
    return globalCache.constructor.generateKey(...keyParts);
  }

  private static async processWithProgressTracking(
    request: RAGQueryRequest,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<RAGQueryResult> {
    // This would be the actual implementation with progress tracking
    // For now, simulate the stages
    
    const stages = [
      { name: 'preprocessing', duration: 100 },
      { name: 'searching', duration: 300 },
      { name: 'ranking', duration: 200 },
      { name: 'finalizing', duration: 100 }
    ];
    
    let totalProgress = 0.1; // Started at 0.1 in the caller
    
    for (const stage of stages) {
      await new Promise(resolve => setTimeout(resolve, stage.duration));
      totalProgress += 0.2;
      onProgress?.(stage.name, Math.min(totalProgress, 0.9));
    }
    
    // Process the actual query
    return await super.processQuery(request);
  }

  private static maybeRunOptimizations(): void {
    // Run optimizations every 100 queries or on performance degradation
    const queryCount = globalPerformanceMonitor.getMetricsByName('rag_query_processing').length;
    
    if (queryCount % 100 === 0) {
      // Run async optimization
      globalOptimizationService.applyAutoOptimizations().catch(error => {
        console.error('❌ Auto-optimization failed:', error);
      });
    }
  }

  // Performance analytics
  static getPerformanceAnalytics(): {
    averageQueryTime: number;
    cacheHitRate: number;
    totalQueries: number;
    recentAlerts: any[];
  } {
    const metrics = globalPerformanceMonitor.getMetricsByName('rag_query_processing');
    const cacheStats = globalCache.getStats();
    const alerts = globalPerformanceMonitor.getAlerts(10);
    
    return {
      averageQueryTime: metrics.length > 0 ? 
        metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length : 0,
      cacheHitRate: cacheStats.hitRate,
      totalQueries: metrics.length,
      recentAlerts: alerts
    };
  }
}
