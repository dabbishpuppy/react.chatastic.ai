import { RequestProcessor, ResponseCoordinator, PerformanceTracker, StreamingManager } from './orchestration';
import { RAGQueryRequest, RAGQueryResult } from './queryProcessing/ragQueryEngine';
import { LLMRequest, LLMResponse } from './llm/llmRouter';
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
    
    try {
      // Validate and prepare request
      RequestProcessor.validateRequest(request);
      const processedRequest = RequestProcessor.setDefaultOptions(request);

      // Process the request
      const response = await ResponseCoordinator.processRAGRequest(processedRequest);
      
      // Record performance metrics
      const totalTime = Date.now() - startTime;
      PerformanceTracker.recordRequest(request.agentId, totalTime, true);

      console.log('✅ RAG request processing complete:', {
        totalTime: response.performance.totalTime,
        queryTime: response.performance.queryProcessingTime,
        llmTime: response.performance.llmResponseTime,
        postProcessTime: response.performance.postProcessingTime,
        finalContentLength: response.processedResponse.content.length,
        sources: response.queryResult.rankedContext.sources.length
      });

      return response;

    } catch (error) {
      // Record failed request
      const totalTime = Date.now() - startTime;
      PerformanceTracker.recordRequest(request.agentId, totalTime, false);
      
      console.error('❌ RAG request processing failed:', error);
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
    const metrics = PerformanceTracker.getMetrics();
    return {
      averageResponseTime: metrics.averageResponseTime,
      successRate: metrics.successRate,
      activeStreams: StreamingManager.getActiveStreamsCount()
    };
  }

  static getAgentPerformanceMetrics(agentId: string) {
    return PerformanceTracker.getAgentMetrics(agentId);
  }
}
