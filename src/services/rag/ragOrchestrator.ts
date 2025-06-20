import { RAGQueryEngine, RAGQueryResult } from './queryProcessing/ragQueryEngine';
import { EnhancedRAGLLMIntegration } from './llm/ragLLMIntegrationEnhanced';

export interface RAGRequest {
  query: string;
  agentId: string;
  conversationId?: string;
  options: {
    searchFilters: {
      maxResults: number;
      minSimilarity: number;
      sourceTypes: Array<'text' | 'file' | 'website' | 'qa'>;
    };
    rankingOptions: {
      maxChunks: number;
      maxTokens: number;
      diversityWeight: number;
      recencyWeight: number;
    };
    llmOptions: {
      model?: string;
      temperature?: number;
      systemPrompt?: string;
      maxTokens?: number;
    };
    streaming: boolean;
    streamingOptions?: {
      onChunk?: (chunk: any) => void;
      onComplete?: (response: string) => void;
      onError?: (error: Error) => void;
    };
    postProcessing: {
      addSourceCitations: boolean;
      formatMarkdown: boolean;
      enforceContentSafety: boolean;
    };
  };
}

export interface RAGResponse {
  queryResult: RAGQueryResult;
  processedResponse: {
    content: string;
    metadata: {
      model: string;
      temperature: number;
      processingTime: number;
    };
  };
  performance: {
    totalTime: number;
    queryProcessingTime: number;
    llmResponseTime: number;
    postProcessingTime: number;
  };
}

export class RAGOrchestrator {
  static async processRAGRequest(request: RAGRequest): Promise<RAGResponse> {
    console.log('🎯 RAG Orchestrator: Processing request with model:', request.options.llmOptions.model);
    
    const startTime = Date.now();
    
    try {
      // Step 1: Query and rank relevant content
      const queryStartTime = Date.now();
      const queryResult = await RAGQueryEngine.processQuery({
        query: request.query,
        agentId: request.agentId,
        searchFilters: {
          maxResults: request.options.searchFilters.maxResults,
          minSimilarity: request.options.searchFilters.minSimilarity,
          sourceTypes: request.options.searchFilters.sourceTypes as Array<'text' | 'file' | 'website' | 'qa'>
        },
        rankingOptions: {
          maxChunks: request.options.rankingOptions.maxChunks,
          maxTokens: request.options.rankingOptions.maxTokens,
          diversityWeight: request.options.rankingOptions.diversityWeight,
          recencyWeight: request.options.rankingOptions.recencyWeight
        }
      });
      const queryProcessingTime = Date.now() - queryStartTime;

      console.log('📊 Query processing complete:', {
        chunksFound: queryResult.rankedContext.chunks.length,
        sourcesFound: queryResult.rankedContext.sources.length
      });

      // Step 2: Build context from ranked chunks
      const contextChunks = queryResult.rankedContext.chunks
        .slice(0, request.options.rankingOptions.maxChunks)
        .map(chunk => chunk.content);

      // Step 3: Generate response using enhanced LLM integration with agent configuration
      console.log('🤖 Generating response with configured model:', request.options.llmOptions.model);
      
      const llmStartTime = Date.now();
      const llmResponse = await EnhancedRAGLLMIntegration.processQueryWithConfig(
        request.agentId,
        request.query,
        contextChunks,
        request.options.llmOptions
      );
      const llmResponseTime = Date.now() - llmStartTime;

      const postProcessStartTime = Date.now();
      const postProcessingTime = Date.now() - postProcessStartTime;

      const response: RAGResponse = {
        queryResult,
        processedResponse: {
          content: llmResponse,
          metadata: {
            model: request.options.llmOptions.model || 'gpt-4o-mini',
            temperature: request.options.llmOptions.temperature || 0.7,
            processingTime: Date.now() - startTime
          }
        },
        performance: {
          totalTime: Date.now() - startTime,
          queryProcessingTime,
          llmResponseTime,
          postProcessingTime
        }
      };

      console.log('✅ RAG Orchestrator: Response generated successfully');
      return response;
    } catch (error) {
      console.error('❌ RAG Orchestrator: Processing failed:', error);
      throw error;
    }
  }

  static getPerformanceMetrics() {
    return {
      averageResponseTime: 1000,
      totalRequests: 0,
      successRate: 100
    };
  }
}
