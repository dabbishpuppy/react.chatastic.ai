
import { SemanticSearchResult, SearchFilters } from '../semanticSearch';

export class HybridSearchEngine {
  static async hybridSearch(
    query: string,
    agentId: string,
    filters?: SearchFilters
  ): Promise<SemanticSearchResult[]> {
    console.log('🔀 Hybrid search:', { query: query.substring(0, 50) + '...' });

    try {
      // Extract keywords from query
      const keywords = query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(' ')
        .filter(word => word.length > 2)
        .slice(0, 10);

      // Perform both searches in parallel
      const { SemanticSearchService } = await import('../semanticSearch');
      const [semanticResults, keywordResults] = await Promise.all([
        SemanticSearchService.searchSimilarChunks(query, agentId, filters),
        SemanticSearchService.searchByKeywords(keywords, agentId, filters)
      ]);

      // Combine and deduplicate results
      const combinedResults = this.combineSearchResults(semanticResults, keywordResults);

      console.log('✅ Hybrid search complete:', {
        semantic: semanticResults.length,
        keyword: keywordResults.length,
        combined: combinedResults.length
      });

      return combinedResults;

    } catch (error) {
      console.error('❌ Hybrid search failed:', error);
      return [];
    }
  }

  private static combineSearchResults(
    semanticResults: SemanticSearchResult[],
    keywordResults: SemanticSearchResult[]
  ): SemanticSearchResult[] {
    const seenChunks = new Set<string>();
    const combined: SemanticSearchResult[] = [];

    // Add semantic results first (higher priority)
    for (const result of semanticResults) {
      if (!seenChunks.has(result.chunkId)) {
        seenChunks.add(result.chunkId);
        combined.push({
          ...result,
          similarity: result.similarity * 1.1 // Boost semantic results slightly
        });
      }
    }

    // Add keyword results that aren't already included
    for (const result of keywordResults) {
      if (!seenChunks.has(result.chunkId)) {
        seenChunks.add(result.chunkId);
        combined.push(result);
      }
    }

    // Sort by similarity
    return combined.sort((a, b) => b.similarity - a.similarity);
  }
}
