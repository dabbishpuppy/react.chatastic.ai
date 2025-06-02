
import { RAGQueryEngine, RAGQueryRequest, RAGQueryResult } from './queryProcessing/ragQueryEngine';
import { LLMRouter, LLMRequest, LLMResponse } from './llm/llmRouter';
import { ResponsePostProcessor, PostProcessingOptions, ProcessedResponse } from './llm/responsePostProcessor';
import { StreamingHandler, StreamingOptions } from './llm/streamingHandler';

export interface RAGRequest {
  query: string;
  agentId: string;
  conversationId?: string;
  options?: {
    // Query processing options
    searchFilters?: {
      sourceTypes?: ('text' | 'file' | 'website' | 'qa')[];
      sources?: string[];
      minSimilarity?: number;
      maxResults?: number;
    };
    rankingOptions?: {
      maxTokens?: number;
      maxChunks?: number;
      diversityWeight?: number;
      recencyWeight?: number;
    };
    
    // LLM options
    llmOptions?: {
      provider?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    };
    
    // Post-processing options
    postProcessing?: PostProcessingOptions;
    
    // Streaming options
    streaming?: boolean;
    streamingOptions?: StreamingOptions;
  };
}

export interface RAGResponse {
  query: string;
  agentId: string;
  conversationId?: string;
  
  // Query processing results
  queryResult: RAGQueryResult;
  
  // LLM response
  llmResponse: LLMResponse;
  
  // Post-processed response
  processedResponse: ProcessedResponse;
  
  // Performance metrics
  performance: {
    totalTime: number;
    queryProcessingTime: number;
    llmResponseTime: number;
    postProcessingTime: number;
  };
}

export class RAGOrchestrator {
  static async processRAGRequest(request: RAGRequest): Promise<RAGResponse> {
    const startTime = Date.now();
    
    console.log('🎯 Starting RAG request processing:', {
      query: request.query.substring(0, 50) + '...',
      agentId: request.agentId,
      streaming: request.options?.streaming || false
    });

    try {
      // Step 1: Query Processing Pipeline
      const queryStartTime = Date.now();
      
      const queryRequest: RAGQueryRequest = {
        query: request.query,
        agentId: request.agentId,
        conversationId: request.conversationId,
        searchFilters: request.options?.searchFilters,
        rankingOptions: request.options?.rankingOptions
      };

      const queryResult = await RAGQueryEngine.processQuery(queryRequest);
      const queryProcessingTime = Date.now() - queryStartTime;

      // Step 2: LLM Response Generation
      const llmStartTime = Date.now();
      
      const llmRequest: LLMRequest = {
        query: request.query,
        context: this.buildContextString(queryResult),
        agentId: request.agentId,
        conversationId: request.conversationId,
        systemPrompt: request.options?.llmOptions?.systemPrompt,
        temperature: request.options?.llmOptions?.temperature,
        maxTokens: request.options?.llmOptions?.maxTokens,
        stream: request.options?.streaming
      };

      let llmResponse: LLMResponse;

      if (request.options?.streaming) {
        // Handle streaming response
        llmResponse = await this.handleStreamingLLMResponse(
          llmRequest,
          queryResult,
          request.options.streamingOptions
        );
      } else {
        // Handle standard response
        llmResponse = await LLMRouter.generateResponse(llmRequest, queryResult);
      }

      const llmResponseTime = Date.now() - llmStartTime;

      // Step 3: Post-processing
      const postProcessStartTime = Date.now();
      
      const processedResponse = await ResponsePostProcessor.processResponse(
        llmResponse,
        request.options?.postProcessing
      );

      const postProcessingTime = Date.now() - postProcessStartTime;
      const totalTime = Date.now() - startTime;

      const response: RAGResponse = {
        query: request.query,
        agentId: request.agentId,
        conversationId: request.conversationId,
        queryResult,
        llmResponse,
        processedResponse,
        performance: {
          totalTime,
          queryProcessingTime,
          llmResponseTime,
          postProcessingTime
        }
      };

      console.log('✅ RAG request processing complete:', {
        totalTime,
        queryTime: queryProcessingTime,
        llmTime: llmResponseTime,
        postProcessTime: postProcessingTime,
        finalContentLength: processedResponse.content.length,
        sources: queryResult.rankedContext.sources.length
      });

      return response;

    } catch (error) {
      console.error('❌ RAG request processing failed:', error);
      throw error;
    }
  }

  private static buildContextString(queryResult: RAGQueryResult): string {
    if (queryResult.rankedContext.chunks.length === 0) {
      return 'No relevant context found.';
    }

    return queryResult.rankedContext.chunks
      .map((chunk, index) => `Context ${index + 1}: ${chunk.content}`)
      .join('\n\n');
  }

  private static async handleStreamingLLMResponse(
    llmRequest: LLMRequest,
    queryResult: RAGQueryResult,
    streamingOptions?: StreamingOptions
  ): Promise<LLMResponse> {
    const streamId = `rag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🌊 Handling streaming LLM response:', streamId);

    try {
      // Use StreamingHandler to manage the streaming response
      const fullResponse = await StreamingHandler.handleStreamingResponse(
        streamId,
        llmRequest,
        streamingOptions || {}
      );

      // Return a standard LLMResponse format
      return {
        content: fullResponse,
        provider: 'openai', // This would be determined by LLMRouter
        model: 'gpt-4o-mini',
        tokensUsed: fullResponse.split(' ').length, // Rough estimate
        cost: 0.001, // Would be calculated based on actual usage
        responseTime: 0, // Set by StreamingHandler
        sources: queryResult.rankedContext.chunks.map(chunk => ({
          sourceId: chunk.sourceId,
          sourceName: chunk.metadata.sourceName,
          chunkIndex: chunk.metadata.chunkIndex
        }))
      };
    } catch (error) {
      console.error('❌ Streaming LLM response failed:', error);
      throw error;
    }
  }

  // Quick response method for simple queries
  static async quickResponse(
    query: string,
    agentId: string,
    options?: {
      maxSources?: number;
      streaming?: boolean;
    }
  ): Promise<string> {
    console.log('⚡ Processing quick RAG response');

    try {
      const request: RAGRequest = {
        query,
        agentId,
        options: {
          searchFilters: {
            maxResults: options?.maxSources || 3,
            minSimilarity: 0.3
          },
          rankingOptions: {
            maxChunks: 3,
            maxTokens: 1000
          },
          streaming: options?.streaming || false,
          postProcessing: {
            addSourceCitations: false,
            formatMarkdown: true
          }
        }
      };

      const response = await this.processRAGRequest(request);
      return response.processedResponse.content;
    } catch (error) {
      console.error('❌ Quick RAG response failed:', error);
      throw error;
    }
  }

  // Performance monitoring
  static getPerformanceMetrics(): {
    averageResponseTime: number;
    successRate: number;
    activeStreams: number;
  } {
    return {
      averageResponseTime: 0, // Would be tracked over time
      successRate: 0.95, // Would be calculated from actual metrics
      activeStreams: StreamingHandler.getActiveStreamsCount()
    };
  }
}
