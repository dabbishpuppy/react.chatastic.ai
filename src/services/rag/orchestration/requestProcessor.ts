import { RAGRequest } from '../ragOrchestrator';
import { RAGQueryRequest } from '../queryProcessing/ragQueryEngine';
import { RAGQueryResult } from '../queryProcessing/ragQueryEngine';

export class RequestProcessor {
  static prepareQueryRequest(request: RAGRequest): RAGQueryRequest {
    console.log('🔧 Preparing query request:', {
      query: request.query.substring(0, 50) + '...',
      agentId: request.agentId,
      hasOptions: !!request.options
    });

    // Validate required fields
    if (!request.query || request.query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (!request.agentId) {
      throw new Error('Agent ID is required');
    }

    // Build query request with enhanced options
    const queryRequest: RAGQueryRequest = {
      query: request.query.trim(),
      agentId: request.agentId,
      conversationId: request.conversationId,
      searchFilters: {
        maxResults: request.options?.searchFilters?.maxResults || 10,
        minSimilarity: request.options?.searchFilters?.minSimilarity || 0.5,
        sourceTypes: (request.options?.searchFilters?.sourceTypes || []) as Array<'text' | 'file' | 'website' | 'qa'>,
        ...request.options?.searchFilters
      },
      rankingOptions: {
        maxChunks: request.options?.rankingOptions?.maxChunks || 8,
        maxTokens: request.options?.rankingOptions?.maxTokens || 4000,
        diversityWeight: request.options?.rankingOptions?.diversityWeight || 0.3,
        recencyWeight: request.options?.rankingOptions?.recencyWeight || 0.2,
        sourceAuthorityWeight: request.options?.rankingOptions?.recencyWeight || 0.2,
        relevanceThreshold: 0.3
      }
    };

    console.log('✅ Query request prepared:', {
      maxResults: queryRequest.searchFilters?.maxResults,
      maxChunks: queryRequest.rankingOptions?.maxChunks,
      maxTokens: queryRequest.rankingOptions?.maxTokens
    });

    return queryRequest;
  }

  static buildContextString(queryResult: RAGQueryResult): string {
    console.log('📝 Building context string:', {
      chunks: queryResult.rankedContext.chunks.length,
      totalTokens: queryResult.rankedContext.totalTokens
    });

    if (queryResult.rankedContext.chunks.length === 0) {
      return 'No relevant context found in the knowledge base.';
    }

    // Group chunks by source for better organization
    const sourceGroups = new Map<string, typeof queryResult.rankedContext.chunks>();
    
    for (const chunk of queryResult.rankedContext.chunks) {
      const sourceId = chunk.sourceId;
      if (!sourceGroups.has(sourceId)) {
        sourceGroups.set(sourceId, []);
      }
      sourceGroups.get(sourceId)!.push(chunk);
    }

    // Build context string with source grouping
    const contextParts: string[] = [];
    let currentTokens = 0;
    const maxTokens = 4000; // Leave room for prompt and response

    for (const [sourceId, chunks] of sourceGroups) {
      const sourceName = chunks[0].metadata.sourceName;
      
      // Add source header
      contextParts.push(`\n--- Source: ${sourceName} ---`);
      
      for (const chunk of chunks.slice(0, 3)) { // Limit chunks per source
        const chunkTokens = this.estimateTokenCount(chunk.content);
        
        if (currentTokens + chunkTokens > maxTokens) {
          contextParts.push('\n[Additional context truncated due to length limits]');
          break;
        }
        
        contextParts.push(`\n${chunk.content}`);
        currentTokens += chunkTokens;
      }
      
      if (currentTokens > maxTokens) break;
    }

    const contextString = contextParts.join('\n');
    
    console.log('✅ Context string built:', {
      length: contextString.length,
      estimatedTokens: this.estimateTokenCount(contextString),
      sources: sourceGroups.size
    });

    return contextString;
  }

  static validateRequest(request: RAGRequest): void {
    const errors: string[] = [];

    // Validate query
    if (!request.query || typeof request.query !== 'string') {
      errors.push('Query must be a non-empty string');
    } else if (request.query.trim().length === 0) {
      errors.push('Query cannot be empty');
    } else if (request.query.length > 2000) {
      errors.push('Query is too long (maximum 2000 characters)');
    }

    // Validate agent ID
    if (!request.agentId || typeof request.agentId !== 'string') {
      errors.push('Agent ID must be a non-empty string');
    }

    // Validate conversation ID if provided
    if (request.conversationId && typeof request.conversationId !== 'string') {
      errors.push('Conversation ID must be a string');
    }

    // Validate options if provided
    if (request.options) {
      this.validateRequestOptions(request.options, errors);
    }

    if (errors.length > 0) {
      throw new Error(`Request validation failed: ${errors.join(', ')}`);
    }
  }

  private static validateRequestOptions(options: any, errors: string[]): void {
    // Validate search filters
    if (options.searchFilters) {
      const search = options.searchFilters;
      
      if (search.maxResults && (typeof search.maxResults !== 'number' || search.maxResults < 1 || search.maxResults > 50)) {
        errors.push('maxResults must be a number between 1 and 50');
      }
      
      if (search.minSimilarity && (typeof search.minSimilarity !== 'number' || search.minSimilarity < 0 || search.minSimilarity > 1)) {
        errors.push('minSimilarity must be a number between 0 and 1');
      }
    }

    // Validate ranking options
    if (options.rankingOptions) {
      const ranking = options.rankingOptions;
      
      if (ranking.maxChunks && (typeof ranking.maxChunks !== 'number' || ranking.maxChunks < 1 || ranking.maxChunks > 20)) {
        errors.push('maxChunks must be a number between 1 and 20');
      }
      
      if (ranking.maxTokens && (typeof ranking.maxTokens !== 'number' || ranking.maxTokens < 100 || ranking.maxTokens > 8000)) {
        errors.push('maxTokens must be a number between 100 and 8000');
      }
    }

    // Validate LLM options
    if (options.llmOptions) {
      const llm = options.llmOptions;
      
      if (llm.temperature && (typeof llm.temperature !== 'number' || llm.temperature < 0 || llm.temperature > 2)) {
        errors.push('temperature must be a number between 0 and 2');
      }
      
      if (llm.maxTokens && (typeof llm.maxTokens !== 'number' || llm.maxTokens < 1 || llm.maxTokens > 4000)) {
        errors.push('LLM maxTokens must be a number between 1 and 4000');
      }
    }
  }

  static sanitizeQuery(query: string): string {
    return query
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-\.\?\!]/g, '') // Remove special characters except basic punctuation
      .substring(0, 2000); // Ensure length limit
  }

  static extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could',
      'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our'
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 15); // Limit to prevent overly complex queries
  }

  private static estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  static optimizeRequestForPerformance(request: RAGRequest): RAGRequest {
    console.log('⚡ Optimizing request for performance...');

    const optimized = { ...request };

    // Sanitize and optimize query
    optimized.query = this.sanitizeQuery(request.query);

    // Apply intelligent defaults based on query complexity
    const complexity = this.calculateQueryComplexity(optimized.query);
    
    if (!optimized.options) {
      optimized.options = {
        searchFilters: {
          maxResults: 10,
          minSimilarity: 0.5,
          sourceTypes: []
        },
        rankingOptions: {
          maxChunks: 8,
          maxTokens: 4000,
          diversityWeight: 0.3,
          recencyWeight: 0.2
        },
        llmOptions: {
          temperature: 0.7
        },
        streaming: false,
        postProcessing: {
          addSourceCitations: true,
          formatMarkdown: true,
          enforceContentSafety: true
        }
      };
    }

    // Optimize search filters based on complexity
    if (!optimized.options.searchFilters) {
      optimized.options.searchFilters = {
        maxResults: 10,
        minSimilarity: 0.5,
        sourceTypes: []
      };
    }

    if (complexity < 0.3) {
      // Simple query - reduce search scope for speed
      optimized.options.searchFilters.maxResults = Math.min(
        optimized.options.searchFilters.maxResults || 8,
        8
      );
    } else if (complexity > 0.7) {
      // Complex query - increase search scope for accuracy
      optimized.options.searchFilters.maxResults = Math.max(
        optimized.options.searchFilters.maxResults || 15,
        15
      );
    }

    // Optimize ranking options
    if (!optimized.options.rankingOptions) {
      optimized.options.rankingOptions = {
        maxChunks: 8,
        maxTokens: 4000,
        diversityWeight: 0.3,
        recencyWeight: 0.2
      };
    }

    // Adjust token limits based on query length
    const queryLength = optimized.query.length;
    if (queryLength < 50) {
      optimized.options.rankingOptions.maxTokens = Math.min(
        optimized.options.rankingOptions.maxTokens || 3000,
        3000
      );
    } else if (queryLength > 200) {
      optimized.options.rankingOptions.maxTokens = Math.max(
        optimized.options.rankingOptions.maxTokens || 4500,
        4500
      );
    }

    console.log('✅ Request optimization complete:', {
      complexity,
      maxResults: optimized.options.searchFilters.maxResults,
      maxTokens: optimized.options.rankingOptions.maxTokens
    });

    return optimized;
  }

  private static calculateQueryComplexity(query: string): number {
    let complexity = 0.2; // Base complexity

    // Length factor
    const wordCount = query.split(' ').length;
    complexity += Math.min(0.3, wordCount / 30);

    // Question words increase complexity
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'explain', 'describe', 'compare'];
    if (questionWords.some(word => query.toLowerCase().includes(word))) {
      complexity += 0.2;
    }

    // Technical terms increase complexity
    const technicalWords = ['api', 'implementation', 'algorithm', 'optimization', 'configuration'];
    if (technicalWords.some(word => query.toLowerCase().includes(word))) {
      complexity += 0.3;
    }

    return Math.min(1.0, complexity);
  }

  static setDefaultOptions(request: RAGRequest): RAGRequest {
    const defaultRequest = { ...request };
    
    if (!defaultRequest.options) {
      defaultRequest.options = {
        searchFilters: {
          maxResults: 10,
          minSimilarity: 0.5,
          sourceTypes: []
        },
        rankingOptions: {
          maxChunks: 8,
          maxTokens: 4000,
          diversityWeight: 0.3,
          recencyWeight: 0.2
        },
        llmOptions: {
          temperature: 0.7
        },
        streaming: false,
        postProcessing: {
          addSourceCitations: true,
          formatMarkdown: true,
          enforceContentSafety: true
        }
      };
    }

    // Set default search filters
    if (!defaultRequest.options.searchFilters) {
      defaultRequest.options.searchFilters = {
        maxResults: 10,
        minSimilarity: 0.5,
        sourceTypes: []
      };
    }
    if (!defaultRequest.options.searchFilters.maxResults) {
      defaultRequest.options.searchFilters.maxResults = 10;
    }
    if (!defaultRequest.options.searchFilters.minSimilarity) {
      defaultRequest.options.searchFilters.minSimilarity = 0.5;
    }

    // Set default ranking options
    if (!defaultRequest.options.rankingOptions) {
      defaultRequest.options.rankingOptions = {
        maxChunks: 8,
        maxTokens: 4000,
        diversityWeight: 0.3,
        recencyWeight: 0.2
      };
    }
    if (!defaultRequest.options.rankingOptions.maxChunks) {
      defaultRequest.options.rankingOptions.maxChunks = 8;
    }
    if (!defaultRequest.options.rankingOptions.maxTokens) {
      defaultRequest.options.rankingOptions.maxTokens = 4000;
    }

    return defaultRequest;
  }
}
