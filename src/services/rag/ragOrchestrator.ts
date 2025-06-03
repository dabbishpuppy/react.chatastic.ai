
import { RAGQueryEngine, RAGQueryResult } from './queryProcessing/ragQueryEngine';
import { RAGLLMIntegrationEnhanced } from './llm/ragLLMIntegrationEnhanced';

export interface RAGRequest {
  query: string;
  agentId: string;
  conversationId?: string;
  options: {
    searchFilters: {
      maxResults: number;
      minSimilarity: number;
      sourceTypes: string[];
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
    };
    streaming: boolean;
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
}

export class RAGOrchestrator {
  static async processRAGRequest(request: RAGRequest): Promise<RAGResponse> {
    console.log('🎯 RAG Orchestrator: Processing request with model:', request.options.llmOptions.model);
    
    try {
      // Step 1: Query and rank relevant content
      const queryResult = await RAGQueryEngine.processQuery(
        request.query,
        request.agentId,
        {
          maxResults: request.options.searchFilters.maxResults,
          minSimilarity: request.options.searchFilters.minSimilarity,
          sourceTypes: request.options.searchFilters.sourceTypes
        }
      );

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
      
      const llmResponse = await RAGLLMIntegrationEnhanced.processQueryWithConfig(
        request.agentId,
        request.query,
        contextChunks,
        {
          model: request.options.llmOptions.model,
          temperature: request.options.llmOptions.temperature,
          systemPrompt: request.options.llmOptions.systemPrompt
        }
      );

      const response: RAGResponse = {
        queryResult,
        processedResponse: {
          content: llmResponse,
          metadata: {
            model: request.options.llmOptions.model || 'gpt-4o-mini',
            temperature: request.options.llmOptions.temperature || 0.7,
            processingTime: Date.now()
          }
        }
      };

      console.log('✅ RAG Orchestrator: Response generated successfully');
      return response;
    } catch (error) {
      console.error('❌ RAG Orchestrator: Processing failed:', error);
      throw error;
    }
  }
}
