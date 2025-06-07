
import { RAGQueryEngine, RAGQueryRequest, RAGQueryResult } from './queryProcessing/ragQueryEngine';
import { SemanticSearchService } from './queryProcessing/semanticSearch';
import { StreamingHandler, StreamingOptions } from './llm/streamingHandler';
import { PromptTemplateSystem, PromptContext } from './promptEngine/promptTemplateSystem';
import { CacheService, globalCache } from './performance/cacheService';
import { globalPerformanceMonitor } from './performance/performanceMonitor';

export interface EnhancedRAGRequest extends RAGQueryRequest {
  enableStreaming?: boolean;
  streamingOptions?: StreamingOptions;
  promptTemplateId?: string;
  enableCaching?: boolean;
  cacheKey?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface EnhancedRAGResult extends RAGQueryResult {
  streaming?: {
    streamId: string;
    isComplete: boolean;
  };
  cacheInfo?: {
    hit: boolean;
    key: string;
  };
  performance?: {
    searchTime: number;
    promptTime: number;
    responseTime: number;
    totalTime: number;
  };
}

export class RAGQueryEngineEnhanced {
  /**
   * Process RAG query with enhanced features
   */
  static async processEnhancedQuery(
    request: EnhancedRAGRequest
  ): Promise<EnhancedRAGResult> {
    const startTime = performance.now();
    const performanceMetrics = {
      searchTime: 0,
      promptTime: 0,
      responseTime: 0,
      totalTime: 0
    };

    try {
      // Generate cache key
      const cacheKey = request.cacheKey || CacheService.generateRAGCacheKey(
        request.query,
        request.agentId,
        request.searchFilters
      );

      // Check cache if enabled
      if (request.enableCaching !== false) {
        const cached = globalCache.get<EnhancedRAGResult>(cacheKey);
        if (cached) {
          console.log('🚀 Cache hit for RAG query');
          return {
            ...cached,
            cacheInfo: { hit: true, key: cacheKey }
          };
        }
      }

      // Step 1: Perform enhanced semantic search
      const searchStart = performance.now();
      const searchResults = await this.performEnhancedSearch(request);
      performanceMetrics.searchTime = performance.now() - searchStart;

      globalPerformanceMonitor.recordMetric(
        'enhanced_semantic_search',
        performanceMetrics.searchTime,
        'ms',
        { agentId: request.agentId, resultsCount: searchResults.length }
      );

      // Step 2: Generate enhanced prompt
      const promptStart = performance.now();
      const enhancedPrompt = await this.generateEnhancedPrompt(request, searchResults);
      performanceMetrics.promptTime = performance.now() - promptStart;

      // Step 3: Generate response with streaming support
      const responseStart = performance.now();
      const result = await this.generateEnhancedResponse(
        request,
        enhancedPrompt,
        searchResults
      );
      performanceMetrics.responseTime = performance.now() - responseStart;

      performanceMetrics.totalTime = performance.now() - startTime;

      const enhancedResult: EnhancedRAGResult = {
        query: request.query,
        preprocessingResult: {
          context: {
            originalQuery: request.query,
            normalizedQuery: request.query,
            intent: 'question',
            keywords: this.extractKeywords(request.query),
            agentId: request.agentId,
            conversationId: request.conversationId
          },
          searchQueries: [request.query],
          confidence: 0.9
        },
        searchResults,
        rankedContext: {
          chunks: searchResults.map((result, index) => ({
            chunkId: result.chunkId,
            content: result.content,
            sourceId: result.sourceId,
            relevanceScore: result.similarity,
            diversityScore: 0.8,
            recencyScore: 0.9,
            authorityScore: 0.8,
            finalScore: result.similarity,
            metadata: result.metadata
          })),
          sources: this.extractUniqueSources(searchResults).map(source => ({
            name: source.sourceName,
            url: source.sourceId
          })),
          totalTokens: this.estimateTokenCount(searchResults),
          relevanceScore: this.calculateAverageRelevance(searchResults),
          diversityScore: this.calculateDiversityScore(searchResults),
          processingMetrics: {
            originalChunks: searchResults.length,
            filteredChunks: searchResults.length,
            rankingTime: performanceMetrics.searchTime
          }
        },
        processingTimeMs: performanceMetrics.totalTime,
        performance: performanceMetrics,
        cacheInfo: { hit: false, key: cacheKey }
      };

      // Cache the result if enabled
      if (request.enableCaching !== false) {
        globalCache.set(cacheKey, enhancedResult, 300000); // 5 minutes
      }

      // Record performance metrics
      globalPerformanceMonitor.recordMetric(
        'enhanced_rag_query',
        performanceMetrics.totalTime,
        'ms',
        {
          agentId: request.agentId,
          cached: false,
          resultsCount: searchResults.length
        }
      );

      return enhancedResult;

    } catch (error) {
      console.error('❌ Enhanced RAG query failed:', error);
      
      globalPerformanceMonitor.recordMetric(
        'enhanced_rag_query_error',
        performance.now() - startTime,
        'ms',
        { agentId: request.agentId, error: (error as Error).message }
      );

      throw error;
    }
  }

  /**
   * Perform enhanced semantic search
   */
  private static async performEnhancedSearch(
    request: EnhancedRAGRequest
  ): Promise<any[]> {
    try {
      // Use hybrid search for better results
      return await SemanticSearchService.hybridSearch(
        request.query,
        request.agentId,
        request.searchFilters
      );
    } catch (error) {
      console.warn('Hybrid search failed, falling back to basic search:', error);
      
      // Fallback to basic semantic search
      return await SemanticSearchService.searchSimilarChunks(
        request.query,
        request.agentId,
        request.searchFilters
      );
    }
  }

  /**
   * Generate enhanced prompt using template system
   */
  private static async generateEnhancedPrompt(
    request: EnhancedRAGRequest,
    searchResults: any[]
  ): Promise<string> {
    try {
      // Get agent information for prompt context
      const agentInfo = await this.getAgentInfo(request.agentId);
      
      // Build context from search results
      const context = searchResults
        .map(result => result.content)
        .join('\n\n');

      // Extract sources
      const sources = this.extractUniqueSources(searchResults);

      // Create prompt context
      const promptContext: PromptContext = {
        query: request.query,
        context,
        agentName: agentInfo.name,
        agentInstructions: agentInfo.instructions,
        sources,
        conversationHistory: request.conversationHistory,
        metadata: {
          searchResultsCount: searchResults.length,
          totalSources: sources.length
        }
      };

      // Use specified template or default
      const templateId = request.promptTemplateId || 'general-rag';
      
      return PromptTemplateSystem.generatePrompt(templateId, promptContext);

    } catch (error) {
      console.error('Prompt generation failed, using fallback:', error);
      
      // Fallback to simple prompt
      const context = searchResults.map(r => r.content).join('\n\n');
      return `Based on the following context, please answer the user's question:\n\nContext:\n${context}\n\nQuestion: ${request.query}`;
    }
  }

  /**
   * Generate enhanced response with streaming support
   */
  private static async generateEnhancedResponse(
    request: EnhancedRAGRequest,
    prompt: string,
    searchResults: any[]
  ): Promise<any> {
    const streamId = `rag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (request.enableStreaming) {
      // Handle streaming response
      const fullResponse = await StreamingHandler.handleStreamingResponse(
        streamId,
        {
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: request.query }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 1000
        },
        request.streamingOptions
      );

      return {
        content: fullResponse,
        streaming: {
          streamId,
          isComplete: true
        }
      };
    } else {
      // Regular response
      // This would integrate with your existing LLM service
      return {
        content: 'Enhanced RAG response would be generated here',
        streaming: {
          streamId: null,
          isComplete: true
        }
      };
    }
  }

  /**
   * Helper methods
   */
  private static async getAgentInfo(agentId: string): Promise<{
    name: string;
    instructions: string;
  }> {
    // This would fetch from your agents table
    return {
      name: 'AI Assistant',
      instructions: 'You are a helpful AI assistant.'
    };
  }

  private static extractKeywords(query: string): string[] {
    return query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  }

  private static extractUniqueSources(searchResults: any[]): Array<{
    sourceId: string;
    sourceName: string;
    chunkCount: number;
    averageRelevance: number;
  }> {
    const sources = new Map<string, {
      sourceId: string;
      sourceName: string;
      chunkCount: number;
      totalRelevance: number;
    }>();
    
    searchResults.forEach(result => {
      if (result.metadata?.sourceName) {
        const existing = sources.get(result.sourceId);
        if (existing) {
          existing.chunkCount++;
          existing.totalRelevance += result.similarity;
        } else {
          sources.set(result.sourceId, {
            sourceId: result.sourceId,
            sourceName: result.metadata.sourceName,
            chunkCount: 1,
            totalRelevance: result.similarity
          });
        }
      }
    });

    return Array.from(sources.values()).map(source => ({
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      chunkCount: source.chunkCount,
      averageRelevance: source.totalRelevance / source.chunkCount
    }));
  }

  private static estimateTokenCount(searchResults: any[]): number {
    return searchResults.reduce((total, result) => {
      return total + Math.ceil(result.content.length / 4); // Rough token estimate
    }, 0);
  }

  private static calculateAverageRelevance(searchResults: any[]): number {
    if (searchResults.length === 0) return 0;
    
    const total = searchResults.reduce((sum, result) => sum + result.similarity, 0);
    return total / searchResults.length;
  }

  private static calculateDiversityScore(searchResults: any[]): number {
    // Simple diversity calculation based on unique sources
    const uniqueSources = new Set(searchResults.map(r => r.sourceId));
    return uniqueSources.size / Math.max(searchResults.length, 1);
  }
}
