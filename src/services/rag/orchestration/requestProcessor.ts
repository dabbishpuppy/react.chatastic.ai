
import { RAGRequest, RAGQueryRequest } from '../ragOrchestrator';

export class RequestProcessor {
  static validateRequest(request: RAGRequest): void {
    if (!request.query || request.query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }
    
    if (!request.agentId) {
      throw new Error('Agent ID is required');
    }

    // Validate search filters if provided
    if (request.options?.searchFilters) {
      const filters = request.options.searchFilters;
      
      if (filters.minSimilarity !== undefined && (filters.minSimilarity < 0 || filters.minSimilarity > 1)) {
        throw new Error('Minimum similarity must be between 0 and 1');
      }
      
      if (filters.maxResults !== undefined && filters.maxResults <= 0) {
        throw new Error('Maximum results must be greater than 0');
      }
    }

    // Validate ranking options if provided
    if (request.options?.rankingOptions) {
      const ranking = request.options.rankingOptions;
      
      if (ranking.maxTokens !== undefined && ranking.maxTokens <= 0) {
        throw new Error('Maximum tokens must be greater than 0');
      }
      
      if (ranking.maxChunks !== undefined && ranking.maxChunks <= 0) {
        throw new Error('Maximum chunks must be greater than 0');
      }
    }
  }

  static prepareQueryRequest(request: RAGRequest): RAGQueryRequest {
    return {
      query: request.query,
      agentId: request.agentId,
      conversationId: request.conversationId,
      searchFilters: request.options?.searchFilters,
      rankingOptions: request.options?.rankingOptions
    };
  }

  static buildContextString(queryResult: any): string {
    if (!queryResult?.rankedContext?.chunks || queryResult.rankedContext.chunks.length === 0) {
      return 'No relevant context found.';
    }

    return queryResult.rankedContext.chunks
      .map((chunk: any, index: number) => `Context ${index + 1}: ${chunk.content}`)
      .join('\n\n');
  }

  static setDefaultOptions(request: RAGRequest): RAGRequest {
    return {
      ...request,
      options: {
        searchFilters: {
          maxResults: 5,
          minSimilarity: 0.3,
          ...request.options?.searchFilters
        },
        rankingOptions: {
          maxChunks: 5,
          maxTokens: 2000,
          ...request.options?.rankingOptions
        },
        streaming: false,
        ...request.options
      }
    };
  }
}
