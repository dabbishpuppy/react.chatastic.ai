
import { supabase } from '@/integrations/supabase/client';
import { QueryContext } from './queryPreprocessor';

export interface SemanticSearchResult {
  chunkId: string;
  sourceId: string;
  content: string;
  similarity: number;
  metadata: {
    sourceType: 'text' | 'file' | 'website' | 'qa';
    sourceName: string;
    chunkIndex: number;
    createdAt: string;
  };
}

export interface SearchFilters {
  sourceTypes?: ('text' | 'file' | 'website' | 'qa')[];
  sources?: string[];
  minSimilarity?: number;
  maxResults?: number;
}

export class SemanticSearchService {
  static async searchSimilarChunks(
    query: string,
    agentId: string,
    filters: SearchFilters = {}
  ): Promise<SemanticSearchResult[]> {
    console.log('🔍 Performing semantic search:', {
      query: query.substring(0, 50) + '...',
      agentId,
      filters
    });

    try {
      // First, get query embedding (we'll simulate this for now)
      const queryEmbedding = await this.getQueryEmbedding(query);
      
      // Build the search query with filters
      let searchQuery = supabase
        .from('source_chunks')
        .select(`
          id,
          source_id,
          content,
          chunk_index,
          created_at,
          agent_sources!inner(
            id,
            agent_id,
            source_type,
            title,
            is_active
          )
        `)
        .eq('agent_sources.agent_id', agentId)
        .eq('agent_sources.is_active', true);

      // Apply source type filters
      if (filters.sourceTypes && filters.sourceTypes.length > 0) {
        searchQuery = searchQuery.in('agent_sources.source_type', filters.sourceTypes);
      }

      // Apply source filters
      if (filters.sources && filters.sources.length > 0) {
        searchQuery = searchQuery.in('source_id', filters.sources);
      }

      // Limit results
      const maxResults = Math.min(filters.maxResults || 20, 50);
      searchQuery = searchQuery.limit(maxResults);

      const { data: chunks, error } = await searchQuery;

      if (error) {
        console.error('❌ Semantic search error:', error);
        throw error;
      }

      if (!chunks || chunks.length === 0) {
        console.log('📭 No chunks found for search');
        return [];
      }

      // Calculate similarity scores (simplified version)
      const results = chunks
        .map(chunk => ({
          chunkId: chunk.id,
          sourceId: chunk.source_id,
          content: chunk.content,
          similarity: this.calculateSimilarity(query, chunk.content),
          metadata: {
            sourceType: chunk.agent_sources.source_type as 'text' | 'file' | 'website' | 'qa',
            sourceName: chunk.agent_sources.title || 'Untitled',
            chunkIndex: chunk.chunk_index,
            createdAt: chunk.created_at
          }
        }))
        .filter(result => result.similarity >= (filters.minSimilarity || 0.1))
        .sort((a, b) => b.similarity - a.similarity);

      console.log('✅ Semantic search complete:', {
        resultsFound: results.length,
        topSimilarity: results[0]?.similarity || 0
      });

      return results;
    } catch (error) {
      console.error('❌ Semantic search failed:', error);
      throw error;
    }
  }

  private static async getQueryEmbedding(query: string): Promise<number[]> {
    // TODO: Integrate with actual embedding service (OpenAI, etc.)
    // For now, return a placeholder
    console.log('🔮 Getting query embedding (placeholder)');
    return new Array(1536).fill(0).map(() => Math.random());
  }

  private static calculateSimilarity(query: string, content: string): number {
    // Simplified similarity calculation
    // TODO: Replace with actual vector similarity when embeddings are implemented
    
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const contentWords = content.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const word of contentWords) {
      if (queryWords.has(word)) {
        matches++;
      }
    }
    
    const similarity = matches / Math.max(queryWords.size, contentWords.length / 10);
    return Math.min(similarity, 1.0);
  }

  static async searchByKeywords(
    keywords: string[],
    agentId: string,
    filters: SearchFilters = {}
  ): Promise<SemanticSearchResult[]> {
    console.log('🔍 Performing keyword search:', { keywords, agentId });

    try {
      let searchQuery = supabase
        .from('source_chunks')
        .select(`
          id,
          source_id,
          content,
          chunk_index,
          created_at,
          agent_sources!inner(
            id,
            agent_id,
            source_type,
            title,
            is_active
          )
        `)
        .eq('agent_sources.agent_id', agentId)
        .eq('agent_sources.is_active', true);

      // Add text search for keywords
      if (keywords.length > 0) {
        const searchTerm = keywords.join(' | ');
        searchQuery = searchQuery.textSearch('content', searchTerm);
      }

      // Apply filters
      if (filters.sourceTypes && filters.sourceTypes.length > 0) {
        searchQuery = searchQuery.in('agent_sources.source_type', filters.sourceTypes);
      }

      const maxResults = Math.min(filters.maxResults || 20, 50);
      searchQuery = searchQuery.limit(maxResults);

      const { data: chunks, error } = await searchQuery;

      if (error) {
        console.error('❌ Keyword search error:', error);
        throw error;
      }

      if (!chunks || chunks.length === 0) {
        return [];
      }

      const results = chunks.map(chunk => ({
        chunkId: chunk.id,
        sourceId: chunk.source_id,
        content: chunk.content,
        similarity: this.calculateKeywordSimilarity(keywords, chunk.content),
        metadata: {
          sourceType: chunk.agent_sources.source_type as 'text' | 'file' | 'website' | 'qa',
          sourceName: chunk.agent_sources.title || 'Untitled',
          chunkIndex: chunk.chunk_index,
          createdAt: chunk.created_at
        }
      })).sort((a, b) => b.similarity - a.similarity);

      console.log('✅ Keyword search complete:', { resultsFound: results.length });
      return results;
    } catch (error) {
      console.error('❌ Keyword search failed:', error);
      throw error;
    }
  }

  private static calculateKeywordSimilarity(keywords: string[], content: string): number {
    const contentLower = content.toLowerCase();
    let totalMatches = 0;
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const matches = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
      totalMatches += matches;
    }
    
    return Math.min(totalMatches / (content.length / 100), 1.0);
  }
}
