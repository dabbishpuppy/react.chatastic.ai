
import { RAGQueryEngine } from '../../queryProcessing/ragQueryEngine';
import { globalPerformanceMonitor } from '../../performance/performanceMonitor';
import { globalCache } from '../../performance/cacheService';
import { globalOptimizationService } from '../../performance/optimizationService';

export interface EnhancedQueryRequest {
  query: string;
  agentId: string;
  conversationId?: string;
  searchFilters?: {
    sourceTypes?: Array<'text' | 'file' | 'website' | 'qa'>;
    maxResults?: number;
    minSimilarity?: number;
  };
  rankingOptions?: {
    maxChunks?: number;
    maxTokens?: number;
    diversityThreshold?: number;
  };
  optimizationLevel?: 'basic' | 'standard' | 'aggressive';
}

export interface EnhancedQueryResult {
  rankedContext: {
    chunks: Array<{
      content: string;
      relevanceScore: number;
      sourceId: string;
      metadata: Record<string, any>;
    }>;
    sources: Array<{
      id: string;
      title: string;
      type: string;
      relevanceScore: number;
    }>;
    totalRelevanceScore: number;
  };
  searchResults: any[];
  processingTime: number;
  optimizationsApplied: string[];
  cacheHit: boolean;
}

export class EnhancedQueryProcessor {
  static async processQueryWithOptimizations(
    request: EnhancedQueryRequest
  ): Promise<EnhancedQueryResult> {
    const startTime = Date.now();
    const optimizationsApplied: string[] = [];
    
    console.log('🚀 Enhanced query processing started:', {
      query: request.query.substring(0, 50) + '...',
      agentId: request.agentId,
      optimizationLevel: request.optimizationLevel || 'standard'
    });

    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cachedResult = await globalCache.getCachedQuery(cacheKey);
    
    if (cachedResult) {
      console.log('✅ Cache hit for enhanced query');
      optimizationsApplied.push('cache_hit');
      
      return {
        ...cachedResult,
        processingTime: Date.now() - startTime,
        optimizationsApplied,
        cacheHit: true
      };
    }

    // Apply query optimizations based on level
    const optimizedRequest = this.applyOptimizations(request, optimizationsApplied);

    // Process with base RAG engine
    const baseResult = await RAGQueryEngine.processQuery({
      query: optimizedRequest.query,
      agentId: optimizedRequest.agentId,
      conversationId: optimizedRequest.conversationId,
      searchFilters: optimizedRequest.searchFilters,
      rankingOptions: optimizedRequest.rankingOptions
    });

    // Enhanced post-processing
    const enhancedResult = this.enhanceResults(baseResult, optimizationsApplied);
    
    const processingTime = Date.now() - startTime;

    // Record performance metrics
    globalPerformanceMonitor.recordMetric(
      'enhanced_query_processing',
      processingTime,
      'ms',
      {
        agentId: request.agentId,
        optimizationLevel: request.optimizationLevel,
        optimizationsCount: optimizationsApplied.length,
        cacheHit: false
      }
    );

    // Cache the result
    await globalCache.setCachedQuery(cacheKey, enhancedResult);

    const result: EnhancedQueryResult = {
      ...enhancedResult,
      processingTime,
      optimizationsApplied,
      cacheHit: false
    };

    console.log('✅ Enhanced query processing completed:', {
      processingTime: `${processingTime}ms`,
      optimizationsApplied: optimizationsApplied.length,
      resultsCount: result.rankedContext.chunks.length
    });

    return result;
  }

  private static generateCacheKey(request: EnhancedQueryRequest): string {
    const keyParts = [
      request.query,
      request.agentId,
      request.optimizationLevel || 'standard',
      JSON.stringify(request.searchFilters || {}),
      JSON.stringify(request.rankingOptions || {})
    ];
    
    return `enhanced_query_${btoa(keyParts.join('|')).substring(0, 32)}`;
  }

  private static applyOptimizations(
    request: EnhancedQueryRequest,
    optimizationsApplied: string[]
  ): EnhancedQueryRequest {
    let optimizedRequest = { ...request };

    const level = request.optimizationLevel || 'standard';

    // Apply different optimization levels
    switch (level) {
      case 'aggressive':
        optimizedRequest.searchFilters = {
          ...optimizedRequest.searchFilters,
          maxResults: Math.min(optimizedRequest.searchFilters?.maxResults || 10, 15),
          minSimilarity: Math.max(optimizedRequest.searchFilters?.minSimilarity || 0.3, 0.4)
        };
        optimizationsApplied.push('aggressive_filtering');
        break;
        
      case 'standard':
        optimizedRequest.searchFilters = {
          ...optimizedRequest.searchFilters,
          maxResults: optimizedRequest.searchFilters?.maxResults || 10,
          minSimilarity: optimizedRequest.searchFilters?.minSimilarity || 0.3
        };
        optimizationsApplied.push('standard_filtering');
        break;
        
      case 'basic':
      default:
        optimizationsApplied.push('basic_processing');
        break;
    }

    // Apply ranking optimizations
    if (!optimizedRequest.rankingOptions?.maxChunks) {
      optimizedRequest.rankingOptions = {
        ...optimizedRequest.rankingOptions,
        maxChunks: level === 'aggressive' ? 3 : level === 'standard' ? 5 : 7
      };
      optimizationsApplied.push('chunk_optimization');
    }

    return optimizedRequest;
  }

  private static enhanceResults(baseResult: any, optimizationsApplied: string[]): any {
    // Apply result enhancements
    const enhancedChunks = baseResult.rankedContext?.chunks?.map((chunk: any, index: number) => ({
      ...chunk,
      enhancedRelevanceScore: chunk.relevanceScore * (1 + (0.1 / (index + 1))), // Boost earlier results slightly
      metadata: {
        ...chunk.metadata,
        processingRank: index + 1,
        enhanced: true
      }
    })) || [];

    optimizationsApplied.push('result_enhancement');

    return {
      ...baseResult,
      rankedContext: {
        ...baseResult.rankedContext,
        chunks: enhancedChunks
      }
    };
  }
}
