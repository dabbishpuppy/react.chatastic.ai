
import { RAGOrchestrator, RAGRequest, RAGResponse } from '../ragOrchestrator';
import { RAGLLMIntegration, RAGLLMRequest } from '../llm/ragLLMIntegration';
import { RAGStreamingProcessor, RAGStreamingOptions } from '../streaming/ragStreamingProcessor';
import { RAGAgentConfigManager } from '../configuration/ragAgentConfig';
import { RAGResponseCache } from '../caching/ragResponseCache';

export interface EnhancedRAGRequest extends RAGRequest {
  useCache?: boolean;
  cacheTimeout?: number;
  forceRefresh?: boolean;
}

export interface EnhancedRAGResponse extends RAGResponse {
  cacheMetadata: {
    cacheKey: string;
    cacheHit: boolean;
    cacheAge?: number;
  };
  configMetadata: {
    agentConfigUsed: boolean;
    templateApplied?: string;
  };
}

export class RAGOrchestrationEnhanced {
  static async processEnhancedRAGRequest(
    request: EnhancedRAGRequest
  ): Promise<EnhancedRAGResponse> {
    const startTime = Date.now();
    
    console.log('🚀 Processing enhanced RAG request:', {
      query: request.query.substring(0, 50) + '...',
      agentId: request.agentId,
      useCache: request.useCache,
      streaming: request.options?.streaming
    });

    try {
      // Get agent configuration
      const agentConfig = RAGAgentConfigManager.getAgentConfig(request.agentId);
      console.log('⚙️ Using agent config:', {
        ragEnabled: agentConfig.ragSettings.enabled,
        maxSources: agentConfig.ragSettings.maxSources,
        provider: agentConfig.llmSettings.preferredProvider
      });

      // Generate cache key
      const cacheKey = RAGResponseCache.generateCacheKey(
        request.query,
        request.agentId,
        {
          maxSources: agentConfig.ragSettings.maxSources,
          minRelevance: agentConfig.ragSettings.minRelevanceScore
        }
      );

      // Check cache if enabled and not forcing refresh
      let cacheHit = false;
      let cacheAge: number | undefined;
      
      if (request.useCache && !request.forceRefresh && agentConfig.ragSettings.cachingEnabled) {
        const cachedEntry = RAGResponseCache.get(cacheKey);
        
        if (cachedEntry) {
          cacheHit = true;
          cacheAge = Date.now() - cachedEntry.metadata.timestamp;
          
          const cachedResponse: EnhancedRAGResponse = {
            query: request.query,
            agentId: request.agentId,
            conversationId: request.conversationId,
            queryResult: {
              query: request.query,
              preprocessingResult: {
                originalQuery: request.query,
                confidence: 1.0,
                context: { normalizedQuery: request.query, keywords: [] },
                searchQueries: [request.query]
              },
              searchResults: [],
              rankedContext: {
                chunks: [],
                sources: cachedEntry.sources.map(s => ({ sourceId: s.id, sourceName: s.name })),
                totalTokens: 0,
                relevanceScore: 0.8
              },
              processingTimeMs: 0
            },
            llmResponse: {
              content: cachedEntry.response,
              provider: agentConfig.llmSettings.preferredProvider,
              model: agentConfig.llmSettings.model,
              tokensUsed: cachedEntry.response.split(' ').length,
              cost: 0,
              responseTime: 0,
              sources: cachedEntry.sources.map(s => ({
                sourceId: s.id,
                sourceName: s.name,
                chunkIndex: 0
              }))
            },
            processedResponse: {
              content: cachedEntry.response,
              citations: [],
              safetyFlags: [],
              metadata: {
                originalLength: cachedEntry.response.length,
                processedLength: cachedEntry.response.length,
                processingTime: 0,
                citationsAdded: 0
              }
            },
            performance: {
              totalTime: Date.now() - startTime,
              queryProcessingTime: 0,
              llmResponseTime: 0,
              postProcessingTime: 0
            },
            cacheMetadata: {
              cacheKey,
              cacheHit: true,
              cacheAge
            },
            configMetadata: {
              agentConfigUsed: true
            }
          };

          console.log('📦 Returning cached RAG response');
          return cachedResponse;
        }
      }

      // Build enhanced request with agent config
      const enhancedRequest: RAGRequest = {
        ...request,
        options: {
          ...request.options,
          searchFilters: {
            maxResults: agentConfig.ragSettings.maxSources,
            minSimilarity: agentConfig.ragSettings.minRelevanceScore,
            ...request.options?.searchFilters
          },
          rankingOptions: {
            maxChunks: agentConfig.ragSettings.contextWindow,
            maxTokens: agentConfig.llmSettings.maxTokens,
            diversityWeight: agentConfig.searchSettings.diversityWeight,
            recencyWeight: agentConfig.searchSettings.recencyWeight,
            ...request.options?.rankingOptions
          },
          llmOptions: {
            temperature: agentConfig.llmSettings.temperature,
            maxTokens: agentConfig.llmSettings.maxTokens,
            systemPrompt: agentConfig.llmSettings.systemPrompt,
            ...request.options?.llmOptions
          },
          postProcessing: {
            addSourceCitations: agentConfig.responseSettings.includeCitations,
            formatMarkdown: agentConfig.responseSettings.formatMarkdown,
            addTimestamp: agentConfig.responseSettings.addTimestamp,
            enforceContentSafety: agentConfig.responseSettings.enforceContentSafety,
            ...request.options?.postProcessing
          }
        }
      };

      // Process with standard orchestrator
      const ragResponse = await RAGOrchestrator.processRAGRequest(enhancedRequest);

      // Cache the response if caching is enabled
      if (agentConfig.ragSettings.cachingEnabled && ragResponse.processedResponse) {
        RAGResponseCache.set(
          cacheKey,
          ragResponse.processedResponse.content,
          ragResponse.queryResult.rankedContext.sources.map(s => ({
            id: s.sourceId,
            name: s.sourceName,
            relevance: 0.8
          })),
          request.agentId,
          ragResponse.performance.totalTime
        );
      }

      // Build enhanced response
      const enhancedResponse: EnhancedRAGResponse = {
        ...ragResponse,
        cacheMetadata: {
          cacheKey,
          cacheHit,
          cacheAge
        },
        configMetadata: {
          agentConfigUsed: true
        }
      };

      console.log('✅ Enhanced RAG request processed:', {
        totalTime: ragResponse.performance.totalTime,
        cacheHit,
        sourcesUsed: ragResponse.queryResult.rankedContext.sources.length
      });

      return enhancedResponse;
    } catch (error) {
      console.error('❌ Enhanced RAG request failed:', error);
      throw error;
    }
  }

  static async processStreamingRAGRequest(
    request: EnhancedRAGRequest,
    streamingOptions: RAGStreamingOptions
  ): Promise<void> {
    console.log('🌊 Processing streaming enhanced RAG request');

    const agentConfig = RAGAgentConfigManager.getAgentConfig(request.agentId);

    if (!agentConfig.ragSettings.streamingEnabled) {
      throw new Error('Streaming is not enabled for this agent');
    }

    const enhancedStreamingOptions: RAGStreamingOptions = {
      ...streamingOptions,
      enableSourceCitations: agentConfig.responseSettings.includeCitations,
      contextWindow: agentConfig.ragSettings.contextWindow,
      maxTokens: agentConfig.llmSettings.maxTokens
    };

    await RAGStreamingProcessor.processStreamingRAGQuery(
      request.query,
      request.agentId,
      enhancedStreamingOptions,
      request.conversationId
    );
  }

  static getOrchestrationStats(): {
    cacheStats: any;
    configStats: {
      totalAgents: number;
      enabledAgents: number;
      streamingEnabledAgents: number;
    };
  } {
    const cacheStats = RAGResponseCache.getStats();
    const allConfigs = RAGAgentConfigManager.getAllConfigs();
    
    const enabledAgents = Array.from(allConfigs.values())
      .filter(config => config.ragSettings.enabled).length;
    
    const streamingEnabledAgents = Array.from(allConfigs.values())
      .filter(config => config.ragSettings.streamingEnabled).length;

    return {
      cacheStats,
      configStats: {
        totalAgents: allConfigs.size,
        enabledAgents,
        streamingEnabledAgents
      }
    };
  }
}
