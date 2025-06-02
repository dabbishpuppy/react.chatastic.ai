
import { QueryPreprocessor, QueryPreprocessingResult } from './queryPreprocessor';
import { SemanticSearchService, SemanticSearchResult, SearchFilters } from './semanticSearch';
import { ContextRanker, RankedContext, RankingOptions } from './contextRanker';

export interface RAGQueryRequest {
  query: string;
  agentId: string;
  conversationId?: string;
  searchFilters?: SearchFilters;
  rankingOptions?: RankingOptions;
}

export interface RAGQueryResult {
  query: string;
  preprocessingResult: QueryPreprocessingResult;
  searchResults: SemanticSearchResult[];
  rankedContext: RankedContext;
  processingTimeMs: number;
}

export class RAGQueryEngine {
  static async processQuery(request: RAGQueryRequest): Promise<RAGQueryResult> {
    const startTime = Date.now();
    
    console.log('🚀 Starting RAG query processing:', {
      query: request.query.substring(0, 50) + '...',
      agentId: request.agentId
    });

    try {
      // Step 1: Preprocess the query
      const preprocessingResult = await QueryPreprocessor.preprocessQuery(
        request.query,
        request.agentId,
        request.conversationId,
        request.searchFilters
      );

      // Step 2: Perform semantic and keyword searches
      const searchPromises = [
        // Primary semantic search
        SemanticSearchService.searchSimilarChunks(
          preprocessingResult.context.normalizedQuery,
          request.agentId,
          request.searchFilters
        ),
        // Keyword-based search for broader coverage
        SemanticSearchService.searchByKeywords(
          preprocessingResult.context.keywords,
          request.agentId,
          request.searchFilters
        )
      ];

      // Add search variations if confidence is low
      if (preprocessingResult.confidence < 0.7 && preprocessingResult.searchQueries.length > 1) {
        for (let i = 1; i < Math.min(preprocessingResult.searchQueries.length, 3); i++) {
          searchPromises.push(
            SemanticSearchService.searchSimilarChunks(
              preprocessingResult.searchQueries[i],
              request.agentId,
              request.searchFilters
            )
          );
        }
      }

      const searchResultArrays = await Promise.all(searchPromises);
      
      // Combine and deduplicate search results
      const combinedResults = this.combineAndDeduplicateResults(searchResultArrays);

      // Step 3: Rank and optimize context
      const rankedContext = await ContextRanker.rankAndOptimizeContext(
        combinedResults,
        preprocessingResult.context,
        request.rankingOptions
      );

      const processingTimeMs = Date.now() - startTime;

      console.log('✅ RAG query processing complete:', {
        processingTimeMs,
        finalChunks: rankedContext.chunks.length,
        totalTokens: rankedContext.totalTokens,
        relevanceScore: rankedContext.relevanceScore
      });

      return {
        query: request.query,
        preprocessingResult,
        searchResults: combinedResults,
        rankedContext,
        processingTimeMs
      };

    } catch (error) {
      console.error('❌ RAG query processing failed:', error);
      throw error;
    }
  }

  private static combineAndDeduplicateResults(
    resultArrays: SemanticSearchResult[][]
  ): SemanticSearchResult[] {
    const seenChunks = new Set<string>();
    const combined: SemanticSearchResult[] = [];
    
    // Flatten all results and deduplicate by chunk ID
    for (const results of resultArrays) {
      for (const result of results) {
        if (!seenChunks.has(result.chunkId)) {
          seenChunks.add(result.chunkId);
          combined.push(result);
        }
      }
    }
    
    // Sort by similarity score
    return combined.sort((a, b) => b.similarity - a.similarity);
  }

  static async quickSearch(
    query: string,
    agentId: string,
    maxResults: number = 5
  ): Promise<SemanticSearchResult[]> {
    console.log('⚡ Performing quick search:', { query: query.substring(0, 50) + '...', agentId });

    try {
      const searchFilters: SearchFilters = {
        maxResults,
        minSimilarity: 0.3
      };

      const results = await SemanticSearchService.searchSimilarChunks(
        query,
        agentId,
        searchFilters
      );

      console.log('✅ Quick search complete:', { resultsFound: results.length });
      return results;
    } catch (error) {
      console.error('❌ Quick search failed:', error);
      return [];
    }
  }
}
