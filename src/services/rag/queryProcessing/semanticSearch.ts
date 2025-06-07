
import { supabase } from '@/integrations/supabase/client';
import { VectorSearchService } from '../vectorDatabase/vectorSearchService';

export interface SemanticSearchResult {
  chunkId: string;
  sourceId: string;
  content: string;
  similarity: number;
  metadata: {
    sourceName: string;
    sourceType: string;
    chunkIndex: number;
    sourceUrl?: string;
    createdAt?: Date;
  };
}

export interface SearchFilters {
  maxResults?: number;
  minSimilarity?: number;
  sourceTypes?: Array<'text' | 'file' | 'website' | 'qa'>;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export class SemanticSearchService {
  /**
   * Search for similar chunks using vector embeddings
   */
  static async searchSimilarChunks(
    query: string,
    agentId: string,
    filters: SearchFilters = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateQueryEmbedding(query);
      
      if (!queryEmbedding || queryEmbedding.length === 0) {
        console.warn('Failed to generate query embedding');
        return [];
      }

      // Perform vector search
      const vectorResults = await VectorSearchService.searchSimilarChunks(
        queryEmbedding,
        {
          maxResults: filters.maxResults || 20,
          minSimilarity: filters.minSimilarity || 0.7,
          agentId,
          sourceTypes: filters.sourceTypes?.map(t => t as string) || []
        }
      );

      // Convert to semantic search results with enriched metadata
      const results = await Promise.all(
        vectorResults.map(async (result) => {
          const metadata = await this.enrichChunkMetadata(result.sourceId, result.chunkId);
          
          return {
            chunkId: result.chunkId,
            sourceId: result.sourceId,
            content: result.content,
            similarity: result.similarity,
            metadata: {
              sourceName: metadata.sourceName || 'Unknown Source',
              sourceType: metadata.sourceType || 'text',
              chunkIndex: metadata.chunkIndex || 0,
              sourceUrl: metadata.sourceUrl,
              createdAt: metadata.createdAt
            }
          };
        })
      );

      console.log(`🔍 Semantic search found ${results.length} results for query: "${query.substring(0, 50)}..."`);
      return results;

    } catch (error) {
      console.error('❌ Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Search using keywords (fallback method)
   */
  static async searchByKeywords(
    keywords: string[],
    agentId: string,
    filters: SearchFilters = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      const keywordQuery = keywords.join(' OR ');
      
      let query = supabase
        .from('source_chunks')
        .select(`
          id,
          source_id,
          content,
          chunk_index,
          metadata,
          created_at,
          agent_sources!inner (
            id,
            title,
            source_type,
            url,
            agent_id
          )
        `)
        .eq('agent_sources.agent_id', agentId)
        .textSearch('content', keywordQuery)
        .limit(filters.maxResults || 20);

      if (filters.sourceTypes && filters.sourceTypes.length > 0) {
        query = query.in('agent_sources.source_type', filters.sourceTypes);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Keyword search error:', error);
        return [];
      }

      return data?.map((item: any) => ({
        chunkId: item.id,
        sourceId: item.source_id,
        content: item.content,
        similarity: 0.8, // Assign default similarity for keyword search
        metadata: {
          sourceName: item.agent_sources.title,
          sourceType: item.agent_sources.source_type,
          chunkIndex: item.chunk_index,
          sourceUrl: item.agent_sources.url,
          createdAt: item.created_at ? new Date(item.created_at) : undefined
        }
      })) || [];

    } catch (error) {
      console.error('❌ Keyword search failed:', error);
      return [];
    }
  }

  /**
   * Hybrid search combining vector and keyword search
   */
  static async hybridSearch(
    query: string,
    agentId: string,
    filters: SearchFilters = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      // Extract keywords from query
      const keywords = this.extractKeywords(query);
      
      // Perform both searches in parallel
      const [vectorResults, keywordResults] = await Promise.all([
        this.searchSimilarChunks(query, agentId, { ...filters, maxResults: (filters.maxResults || 20) / 2 }),
        this.searchByKeywords(keywords, agentId, { ...filters, maxResults: (filters.maxResults || 20) / 2 })
      ]);

      // Combine and deduplicate results
      const combinedResults = this.combineAndRankResults(vectorResults, keywordResults);
      
      console.log(`🔍 Hybrid search found ${combinedResults.length} results`);
      return combinedResults.slice(0, filters.maxResults || 20);

    } catch (error) {
      console.error('❌ Hybrid search failed:', error);
      return [];
    }
  }

  /**
   * Generate embedding for query text
   */
  private static async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: {
          texts: [query],
          model: 'text-embedding-3-small',
          provider: 'openai'
        }
      });

      if (error) {
        console.error('Embedding generation error:', error);
        return [];
      }

      return data.embeddings[0] || [];
    } catch (error) {
      console.error('Failed to generate query embedding:', error);
      return [];
    }
  }

  /**
   * Enrich chunk metadata with source information
   */
  private static async enrichChunkMetadata(sourceId: string, chunkId: string): Promise<{
    sourceName: string;
    sourceType: string;
    chunkIndex: number;
    sourceUrl?: string;
    createdAt?: Date;
  }> {
    try {
      const { data: chunk } = await supabase
        .from('source_chunks')
        .select(`
          chunk_index,
          created_at,
          agent_sources!inner (
            title,
            source_type,
            url
          )
        `)
        .eq('id', chunkId)
        .single();

      return {
        sourceName: chunk?.agent_sources?.title || 'Unknown',
        sourceType: chunk?.agent_sources?.source_type || 'text',
        chunkIndex: chunk?.chunk_index || 0,
        sourceUrl: chunk?.agent_sources?.url,
        createdAt: chunk?.created_at ? new Date(chunk.created_at) : undefined
      };
    } catch (error) {
      console.error('Failed to enrich metadata:', error);
      return {
        sourceName: 'Unknown',
        sourceType: 'text',
        chunkIndex: 0
      };
    }
  }

  /**
   * Extract keywords from query
   */
  private static extractKeywords(query: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 10); // Limit to 10 keywords
  }

  /**
   * Combine and rank results from different search methods
   */
  private static combineAndRankResults(
    vectorResults: SemanticSearchResult[],
    keywordResults: SemanticSearchResult[]
  ): SemanticSearchResult[] {
    const seenChunks = new Set<string>();
    const combined: SemanticSearchResult[] = [];

    // Add vector results first (higher priority)
    for (const result of vectorResults) {
      if (!seenChunks.has(result.chunkId)) {
        seenChunks.add(result.chunkId);
        combined.push({
          ...result,
          similarity: result.similarity * 1.1 // Boost vector search results
        });
      }
    }

    // Add keyword results that weren't already included
    for (const result of keywordResults) {
      if (!seenChunks.has(result.chunkId)) {
        seenChunks.add(result.chunkId);
        combined.push(result);
      }
    }

    // Sort by similarity score
    return combined.sort((a, b) => b.similarity - a.similarity);
  }
}
