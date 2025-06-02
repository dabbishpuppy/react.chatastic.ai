import { LLMRouter, LLMRequest, LLMResponse } from './llmRouter';
import { StreamingHandler, StreamingOptions } from './streamingHandler';
import { RAGQueryResult } from '../queryProcessing/ragQueryEngine';

export interface RAGLLMRequest extends LLMRequest {
  ragContext: RAGQueryResult;
  enableStreaming?: boolean;
  cacheKey?: string;
}

export interface RAGLLMResponse extends LLMResponse {
  ragMetadata: {
    contextChunks: number;
    relevanceScore: number;
    sourcesUsed: number;
    cacheHit: boolean;
  };
}

export class RAGLLMIntegration {
  private static responseCache = new Map<string, {
    response: RAGLLMResponse;
    timestamp: number;
    ttl: number;
  }>();

  static async generateRAGResponse(
    request: RAGLLMRequest,
    streamingOptions?: StreamingOptions
  ): Promise<RAGLLMResponse> {
    console.log('🤖 Generating RAG-enhanced LLM response:', {
      query: request.query.substring(0, 50) + '...',
      streaming: request.enableStreaming,
      contextChunks: request.ragContext.rankedContext.chunks.length
    });

    // Check cache first
    if (request.cacheKey) {
      const cached = this.getCachedResponse(request.cacheKey);
      if (cached) {
        console.log('📦 Cache hit for RAG response');
        return cached;
      }
    }

    try {
      let llmResponse: LLMResponse;

      if (request.enableStreaming && streamingOptions) {
        // Use streaming for RAG responses
        llmResponse = await this.handleStreamingRAGResponse(request, streamingOptions);
      } else {
        // Use standard LLM router
        llmResponse = await LLMRouter.generateResponse(request, request.ragContext);
      }

      // Enhance response with RAG metadata
      const ragResponse: RAGLLMResponse = {
        ...llmResponse,
        ragMetadata: {
          contextChunks: request.ragContext.rankedContext.chunks.length,
          relevanceScore: request.ragContext.rankedContext.relevanceScore,
          sourcesUsed: request.ragContext.rankedContext.sources.length,
          cacheHit: false
        }
      };

      // Cache the response if cache key provided
      if (request.cacheKey) {
        this.cacheResponse(request.cacheKey, ragResponse);
      }

      console.log('✅ RAG LLM response generated:', {
        responseLength: ragResponse.content.length,
        contextChunks: ragResponse.ragMetadata.contextChunks,
        sourcesUsed: ragResponse.ragMetadata.sourcesUsed
      });

      return ragResponse;
    } catch (error) {
      console.error('❌ RAG LLM response generation failed:', error);
      throw error;
    }
  }

  private static async handleStreamingRAGResponse(
    request: RAGLLMRequest,
    streamingOptions: StreamingOptions
  ): Promise<LLMResponse> {
    const streamId = `rag-llm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Build enhanced prompt with RAG context
    const enhancedRequest = {
      ...request,
      context: this.buildRAGContextString(request.ragContext)
    };

    // Return the full LLM response from streaming handler
    const fullResponse = await StreamingHandler.handleStreamingResponse(
      streamId,
      enhancedRequest,
      streamingOptions
    );

    // Convert string response to proper LLMResponse object
    return {
      content: fullResponse,
      provider: 'openai',
      model: 'gpt-4o-mini',
      tokensUsed: fullResponse.split(' ').length,
      cost: 0.001,
      responseTime: 0,
      sources: request.ragContext.rankedContext.chunks.map(chunk => ({
        sourceId: chunk.sourceId,
        sourceName: chunk.metadata.sourceName,
        chunkIndex: chunk.metadata.chunkIndex
      }))
    };
  }

  private static buildRAGContextString(ragResult: RAGQueryResult): string {
    if (ragResult.rankedContext.chunks.length === 0) {
      return 'No relevant context found in knowledge base.';
    }

    const contextHeader = `Based on the following information from the knowledge base:\n\n`;
    
    const contextChunks = ragResult.rankedContext.chunks
      .map((chunk, index) => 
        `[Source ${index + 1}: ${chunk.metadata.sourceName}]\n${chunk.content}`
      )
      .join('\n\n');

    const contextFooter = `\n\nPlease provide a helpful response based on this information. If the context doesn't fully answer the question, acknowledge the limitations.`;

    return contextHeader + contextChunks + contextFooter;
  }

  private static getCachedResponse(cacheKey: string): RAGLLMResponse | null {
    const cached = this.responseCache.get(cacheKey);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.responseCache.delete(cacheKey);
      return null;
    }
    
    // Mark as cache hit
    cached.response.ragMetadata.cacheHit = true;
    return cached.response;
  }

  private static cacheResponse(
    cacheKey: string, 
    response: RAGLLMResponse, 
    ttlMs: number = 300000 // 5 minutes default
  ): void {
    this.responseCache.set(cacheKey, {
      response: { ...response },
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  static clearCache(): void {
    this.responseCache.clear();
  }

  static getCacheStats(): {
    size: number;
    hitRate: number;
    totalEntries: number;
  } {
    return {
      size: this.responseCache.size,
      hitRate: 0.75, // Placeholder - would track in real implementation
      totalEntries: this.responseCache.size
    };
  }
}
