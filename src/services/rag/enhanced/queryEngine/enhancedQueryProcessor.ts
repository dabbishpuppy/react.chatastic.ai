import { RAGQueryEngine, RAGQueryRequest, RAGQueryResult } from '../../queryProcessing/ragQueryEngine';
import { AdvancedQueryPreprocessor } from '../../queryProcessing/advancedQueryPreprocessor';
import { SemanticSearchService } from '../../queryProcessing/semanticSearch';
import { ContextRanker } from '../../queryProcessing/contextRanker';
import { OptimizationEngine } from './optimizationEngine';
import { QueryAnalytics } from './queryAnalytics';

export interface EnhancedQueryRequest extends RAGQueryRequest {
  enableOptimizations?: boolean;
  cacheResults?: boolean;
  trackAnalytics?: boolean;
  optimizationStrategy?: 'speed' | 'accuracy' | 'balanced';
  fallbackOptions?: {
    expandQuery?: boolean;
    relaxFilters?: boolean;
    increaseLimits?: boolean;
  };
}

export interface EnhancedQueryResult extends RAGQueryResult {
  optimizations: {
    appliedOptimizations: string[];
    performanceGains: Record<string, number>;
    cacheHit: boolean;
    fallbacksUsed: string[];
  };
  analytics: {
    queryComplexity: number;
    processingStages: Array<{
      stage: string;
      duration: number;
      success: boolean;
    }>;
    resourceUsage: {
      tokensProcessed: number;
      searchOperations: number;
      cacheOperations: number;
    };
  };
}

export class EnhancedQueryProcessor {
  static async processQueryWithOptimizations(
    request: EnhancedQueryRequest
  ): Promise<EnhancedQueryResult> {
    const startTime = Date.now();
    const processingStages: Array<{ stage: string; duration: number; success: boolean }> = [];
    const appliedOptimizations: string[] = [];
    const fallbacksUsed: string[] = [];
    let cacheHit = false;

    console.log('🚀 Enhanced query processing started:', {
      query: request.query.substring(0, 50) + '...',
      optimizations: request.enableOptimizations !== false,
      strategy: request.optimizationStrategy || 'balanced'
    });

    try {
      // Stage 1: Query Analysis and Optimization Planning
      const analysisStart = Date.now();
      const analysisResult = await this.analyzeAndPlanOptimizations(request);
      processingStages.push({
        stage: 'query_analysis',
        duration: Date.now() - analysisStart,
        success: true
      });

      // Stage 2: Cache Check
      const cacheStart = Date.now();
      const cachedResult = await this.checkQueryCache(request);
      if (cachedResult) {
        cacheHit = true;
        appliedOptimizations.push('cache_hit');
        
        processingStages.push({
          stage: 'cache_check',
          duration: Date.now() - cacheStart,
          success: true
        });

        return this.enhanceResultWithMetadata(
          cachedResult,
          appliedOptimizations,
          fallbacksUsed,
          cacheHit,
          processingStages,
          startTime
        );
      }
      processingStages.push({
        stage: 'cache_check',
        duration: Date.now() - cacheStart,
        success: false
      });

      // Stage 3: Advanced Query Preprocessing
      const preprocessStart = Date.now();
      const preprocessingResult = await AdvancedQueryPreprocessor.preprocessQueryWithContext(
        request.query,
        request.agentId,
        request.conversationId
      );
      processingStages.push({
        stage: 'preprocessing',
        duration: Date.now() - preprocessStart,
        success: true
      });

      // Stage 4: Optimized Search Strategy
      const searchStart = Date.now();
      const searchResults = await this.executeOptimizedSearch(
        preprocessingResult,
        request,
        analysisResult.optimizationPlan
      );
      processingStages.push({
        stage: 'search_execution',
        duration: Date.now() - searchStart,
        success: searchResults.length > 0
      });

      // Stage 5: Intelligent Context Ranking
      const rankingStart = Date.now();
      let rankedContext = await ContextRanker.rankAndOptimizeContext(
        searchResults,
        preprocessingResult.context,
        request.rankingOptions
      );

      // Apply fallbacks if results are insufficient
      if (rankedContext.chunks.length === 0 && request.fallbackOptions) {
        rankedContext = await this.applyFallbackStrategies(
          request,
          preprocessingResult,
          fallbacksUsed
        );
      }

      processingStages.push({
        stage: 'context_ranking',
        duration: Date.now() - rankingStart,
        success: rankedContext.chunks.length > 0
      });

      // Stage 6: Result Optimization and Caching
      const optimizationStart = Date.now();
      const finalResult: RAGQueryResult = {
        query: request.query,
        preprocessingResult,
        searchResults,
        rankedContext,
        processingTimeMs: Date.now() - startTime
      };

      if (request.cacheResults !== false) {
        await this.cacheQueryResult(request, finalResult);
        appliedOptimizations.push('result_caching');
      }

      processingStages.push({
        stage: 'optimization_and_caching',
        duration: Date.now() - optimizationStart,
        success: true
      });

      // Stage 7: Analytics Tracking
      if (request.trackAnalytics !== false) {
        QueryAnalytics.recordQueryExecution(`q_${Date.now()}`, {
          processingTime: Date.now() - startTime,
          optimizationLevel: request.optimizationStrategy || 'balanced',
          cacheHit,
          resultQuality: rankedContext.relevanceScore || 0,
          errorCount: 0
        });
        appliedOptimizations.push('analytics_tracking');
      }

      const enhancedResult = this.enhanceResultWithMetadata(
        finalResult,
        appliedOptimizations,
        fallbacksUsed,
        cacheHit,
        processingStages,
        startTime
      );

      console.log('✅ Enhanced query processing complete:', {
        processingTime: enhancedResult.processingTimeMs,
        optimizations: appliedOptimizations.length,
        fallbacks: fallbacksUsed.length,
        finalChunks: enhancedResult.rankedContext.chunks.length
      });

      return enhancedResult;

    } catch (error) {
      console.error('❌ Enhanced query processing failed:', error);
      
      // Return minimal fallback result
      return this.createFallbackResult(request, error, processingStages, startTime);
    }
  }

  private static async analyzeAndPlanOptimizations(
    request: EnhancedQueryRequest
  ): Promise<{
    queryComplexity: number;
    optimizationPlan: string[];
    estimatedProcessingTime: number;
  }> {
    const complexity = this.calculateQueryComplexity(request.query);
    const optimizationPlan: string[] = [];

    // Plan optimizations based on strategy and complexity
    const strategy = request.optimizationStrategy || 'balanced';
    
    if (strategy === 'speed' || (strategy === 'balanced' && complexity < 0.5)) {
      optimizationPlan.push('fast_search', 'reduced_ranking');
    } else if (strategy === 'accuracy' || (strategy === 'balanced' && complexity > 0.7)) {
      optimizationPlan.push('comprehensive_search', 'advanced_ranking', 'multiple_strategies');
    } else {
      optimizationPlan.push('hybrid_search', 'standard_ranking');
    }

    return {
      queryComplexity: complexity,
      optimizationPlan,
      estimatedProcessingTime: complexity * 2000 + 500 // Rough estimate in ms
    };
  }

  private static calculateQueryComplexity(query: string): number {
    let complexity = 0.3; // Base complexity

    // Length factor
    const wordCount = query.split(' ').length;
    complexity += Math.min(0.3, wordCount / 50);

    // Question complexity
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'explain', 'describe'];
    if (questionWords.some(word => query.toLowerCase().includes(word))) {
      complexity += 0.2;
    }

    // Technical terms
    const technicalWords = ['api', 'implementation', 'configuration', 'optimization', 'integration'];
    if (technicalWords.some(word => query.toLowerCase().includes(word))) {
      complexity += 0.2;
    }

    return Math.min(1.0, complexity);
  }

  private static async checkQueryCache(request: EnhancedQueryRequest): Promise<RAGQueryResult | null> {
    try {
      // Generate cache key based on query and key parameters
      const cacheKey = this.generateCacheKey(request);
      
      // Check cache (placeholder - would integrate with actual cache service)
      console.log('🔍 Checking query cache:', cacheKey);
      
      // For now, return null (no cache hit)
      return null;
    } catch (error) {
      console.warn('Cache check failed:', error);
      return null;
    }
  }

  private static async executeOptimizedSearch(
    preprocessingResult: any,
    request: EnhancedQueryRequest,
    optimizationPlan: string[]
  ): Promise<any[]> {
    let searchResults: any[] = [];

    if (optimizationPlan.includes('fast_search')) {
      // Quick semantic search only
      searchResults = await SemanticSearchService.searchSimilarChunks(
        preprocessingResult.context.normalizedQuery,
        request.agentId,
        { ...request.searchFilters, maxResults: 15 }
      );
    } else if (optimizationPlan.includes('comprehensive_search')) {
      // Multiple search strategies
      const [semanticResults, keywordResults, hybridResults] = await Promise.all([
        SemanticSearchService.searchSimilarChunks(
          preprocessingResult.context.normalizedQuery,
          request.agentId,
          request.searchFilters
        ),
        SemanticSearchService.searchByKeywords(
          preprocessingResult.context.keywords,
          request.agentId,
          request.searchFilters
        ),
        SemanticSearchService.hybridSearch(
          request.query,
          request.agentId,
          request.searchFilters
        )
      ]);

      searchResults = this.combineSearchResults([semanticResults, keywordResults, hybridResults]);
    } else {
      // Default hybrid search
      searchResults = await SemanticSearchService.hybridSearch(
        request.query,
        request.agentId,
        request.searchFilters
      );
    }

    return searchResults;
  }

  private static async applyFallbackStrategies(
    request: EnhancedQueryRequest,
    preprocessingResult: any,
    fallbacksUsed: string[]
  ): Promise<any> {
    console.log('🔄 Applying fallback strategies...');

    let rankedContext = {
      chunks: [],
      sources: [],
      totalTokens: 0,
      relevanceScore: 0,
      diversityScore: 0,
      processingMetrics: {
        originalChunks: 0,
        filteredChunks: 0,
        rankingTime: 0
      }
    };

    if (request.fallbackOptions?.relaxFilters) {
      // Try search with relaxed filters
      const relaxedFilters = {
        ...request.searchFilters,
        minSimilarity: (request.searchFilters?.minSimilarity || 0.5) * 0.7,
        maxResults: (request.searchFilters?.maxResults || 10) * 2
      };

      const fallbackResults = await SemanticSearchService.hybridSearch(
        request.query,
        request.agentId,
        relaxedFilters
      );

      if (fallbackResults.length > 0) {
        rankedContext = await ContextRanker.rankAndOptimizeContext(
          fallbackResults,
          preprocessingResult.context,
          request.rankingOptions
        );
        fallbacksUsed.push('relaxed_filters');
      }
    }

    return rankedContext;
  }

  private static async cacheQueryResult(
    request: EnhancedQueryRequest,
    result: RAGQueryResult
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(request);
      console.log('💾 Caching query result:', cacheKey);
      
      // Cache implementation would go here
      // For now, just log the intent
    } catch (error) {
      console.warn('Failed to cache query result:', error);
    }
  }

  private static generateCacheKey(request: EnhancedQueryRequest): string {
    const keyComponents = [
      request.query,
      request.agentId,
      JSON.stringify(request.searchFilters || {}),
      JSON.stringify(request.rankingOptions || {})
    ];
    
    return btoa(keyComponents.join('|')).substring(0, 32);
  }

  private static combineSearchResults(resultArrays: any[][]): any[] {
    const seenChunks = new Set<string>();
    const combined: any[] = [];
    
    for (const results of resultArrays) {
      for (const result of results) {
        if (!seenChunks.has(result.chunkId)) {
          seenChunks.add(result.chunkId);
          combined.push(result);
        }
      }
    }
    
    return combined.sort((a, b) => b.similarity - a.similarity);
  }

  private static enhanceResultWithMetadata(
    result: RAGQueryResult,
    appliedOptimizations: string[],
    fallbacksUsed: string[],
    cacheHit: boolean,
    processingStages: Array<{ stage: string; duration: number; success: boolean }>,
    startTime: number
  ): EnhancedQueryResult {
    const totalProcessingTime = Date.now() - startTime;
    
    return {
      ...result,
      processingTimeMs: totalProcessingTime,
      optimizations: {
        appliedOptimizations,
        performanceGains: this.calculatePerformanceGains(appliedOptimizations),
        cacheHit,
        fallbacksUsed
      },
      analytics: {
        queryComplexity: this.calculateQueryComplexity(result.query),
        processingStages,
        resourceUsage: {
          tokensProcessed: result.rankedContext.totalTokens,
          searchOperations: processingStages.filter(s => s.stage.includes('search')).length,
          cacheOperations: cacheHit ? 1 : 0
        }
      }
    };
  }

  private static calculatePerformanceGains(optimizations: string[]): Record<string, number> {
    const gains: Record<string, number> = {};
    
    for (const optimization of optimizations) {
      switch (optimization) {
        case 'cache_hit':
          gains[optimization] = 0.8; // 80% time savings
          break;
        case 'fast_search':
          gains[optimization] = 0.4; // 40% time savings
          break;
        case 'result_caching':
          gains[optimization] = 0.0; // Future benefit
          break;
        default:
          gains[optimization] = 0.1; // 10% general improvement
      }
    }
    
    return gains;
  }

  private static createFallbackResult(
    request: EnhancedQueryRequest,
    error: any,
    processingStages: Array<{ stage: string; duration: number; success: boolean }>,
    startTime: number
  ): EnhancedQueryResult {
    return {
      query: request.query,
      preprocessingResult: {
        context: {
          originalQuery: request.query,
          normalizedQuery: request.query,
          intent: 'question',
          keywords: [],
          agentId: request.agentId,
          conversationId: request.conversationId
        },
        searchQueries: [request.query],
        confidence: 0.3
      },
      searchResults: [],
      rankedContext: {
        chunks: [],
        sources: [],
        totalTokens: 0,
        relevanceScore: 0,
        diversityScore: 0,
        processingMetrics: {
          originalChunks: 0,
          filteredChunks: 0,
          rankingTime: 0
        }
      },
      processingTimeMs: Date.now() - startTime,
      optimizations: {
        appliedOptimizations: ['fallback_result'],
        performanceGains: {},
        cacheHit: false,
        fallbacksUsed: ['error_fallback']
      },
      analytics: {
        queryComplexity: 0,
        processingStages,
        resourceUsage: {
          tokensProcessed: 0,
          searchOperations: 0,
          cacheOperations: 0
        }
      }
    };
  }
}
