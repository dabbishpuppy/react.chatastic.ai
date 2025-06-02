import { supabase } from '@/integrations/supabase/client';

export interface SearchFilters {
  sourceTypes?: string[];
  agentIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minSimilarity?: number;
  maxResults?: number;
  excludeSources?: string[];
  includeMetadata?: boolean;
}

export interface SemanticSearchResult {
  chunkId: string;
  sourceId: string;
  content: string;
  similarity: number;
  metadata: {
    sourceName: string;
    sourceType: string;
    chunkIndex: number;
    createdAt: string;
    [key: string]: any;
  };
  embedding?: number[];
}

export class SemanticSearchService {
  static async searchSimilarChunks(
    query: string,
    agentId: string,
    filters?: SearchFilters
  ): Promise<SemanticSearchResult[]> {
    console.log('🔍 Semantic search:', {
      query: query.substring(0, 50) + '...',
      agentId,
      filters
    });

    try {
      // Generate query embedding (placeholder - would use actual embedding service)
      const queryEmbedding = await this.generateQueryEmbedding(query);

      // Build search query with correct joins
      let searchQuery = supabase
        .from('source_chunks')
        .select(`
          id,
          source_id,
          content,
          chunk_index,
          metadata,
          created_at
        `);

      // Join with agent_sources to filter by agent_id
      const { data: agentSources } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('agent_id', agentId);

      if (!agentSources || agentSources.length === 0) {
        console.log('No sources found for agent');
        return [];
      }

      const sourceIds = agentSources.map(source => source.id);
      searchQuery = searchQuery.in('source_id', sourceIds);

      // Apply additional filters
      if (filters?.excludeSources?.length) {
        searchQuery = searchQuery.not('source_id', 'in', `(${filters.excludeSources.join(',')})`);
      }

      if (filters?.dateRange) {
        searchQuery = searchQuery
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      const limit = Math.min(filters?.maxResults || 10, 50);
      searchQuery = searchQuery.limit(limit);

      const { data: chunks, error } = await searchQuery;

      if (error) {
        console.error('Semantic search error:', error);
        return [];
      }

      if (!chunks || chunks.length === 0) {
        console.log('No chunks found for semantic search');
        return [];
      }

      // Get source metadata for each chunk
      const uniqueSourceIds = [...new Set(chunks.map(chunk => chunk.source_id))];
      const { data: sources } = await supabase
        .from('agent_sources')
        .select('id, title, source_type')
        .in('id', uniqueSourceIds);

      const sourceMap = new Map(sources?.map(s => [s.id, s]) || []);

      // Calculate similarity scores and build results
      const results: SemanticSearchResult[] = chunks.map((chunk, index) => {
        const source = sourceMap.get(chunk.source_id);
        return {
          chunkId: chunk.id,
          sourceId: chunk.source_id,
          content: chunk.content,
          similarity: this.calculateMockSimilarity(query, chunk.content, index),
          metadata: {
            sourceName: source?.title || 'Unknown Source',
            sourceType: source?.source_type || 'text',
            chunkIndex: chunk.chunk_index,
            createdAt: chunk.created_at || new Date().toISOString(),
            ...chunk.metadata
          }
        };
      });

      // Filter by minimum similarity
      const filteredResults = results.filter(
        result => result.similarity >= (filters?.minSimilarity || 0.3)
      );

      // Sort by similarity
      const sortedResults = filteredResults.sort((a, b) => b.similarity - a.similarity);

      console.log('✅ Semantic search complete:', {
        totalChunks: chunks.length,
        filteredResults: sortedResults.length,
        avgSimilarity: sortedResults.reduce((sum, r) => sum + r.similarity, 0) / sortedResults.length
      });

      return sortedResults;

    } catch (error) {
      console.error('❌ Semantic search failed:', error);
      return [];
    }
  }

  static async searchByKeywords(
    keywords: string[],
    agentId: string,
    filters?: SearchFilters
  ): Promise<SemanticSearchResult[]> {
    console.log('🔤 Keyword search:', { keywords, agentId });

    if (keywords.length === 0) {
      return [];
    }

    try {
      // Create text search query
      const searchTerm = keywords.join(' | ');
      
      // Get agent sources first
      const { data: agentSources } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('agent_id', agentId);

      if (!agentSources || agentSources.length === 0) {
        return [];
      }

      const sourceIds = agentSources.map(source => source.id);

      let searchQuery = supabase
        .from('source_chunks')
        .select(`
          id,
          source_id,
          content,
          chunk_index,
          metadata,
          created_at
        `)
        .in('source_id', sourceIds)
        .textSearch('content', searchTerm);

      // Apply same filters as semantic search
      if (filters?.excludeSources?.length) {
        searchQuery = searchQuery.not('source_id', 'in', `(${filters.excludeSources.join(',')})`);
      }

      const limit = Math.min(filters?.maxResults || 10, 30);
      searchQuery = searchQuery.limit(limit);

      const { data: chunks, error } = await searchQuery;

      if (error) {
        console.error('Keyword search error:', error);
        return [];
      }

      if (!chunks || chunks.length === 0) {
        return [];
      }

      // Get source metadata
      const uniqueSourceIds = [...new Set(chunks.map(chunk => chunk.source_id))];
      const { data: sources } = await supabase
        .from('agent_sources')
        .select('id, title, source_type')
        .in('id', uniqueSourceIds);

      const sourceMap = new Map(sources?.map(s => [s.id, s]) || []);

      // Calculate keyword-based similarity
      const results: SemanticSearchResult[] = chunks.map((chunk) => {
        const source = sourceMap.get(chunk.source_id);
        return {
          chunkId: chunk.id,
          sourceId: chunk.source_id,
          content: chunk.content,
          similarity: this.calculateKeywordSimilarity(keywords, chunk.content),
          metadata: {
            sourceName: source?.title || 'Unknown Source',
            sourceType: source?.source_type || 'text',
            chunkIndex: chunk.chunk_index,
            createdAt: chunk.created_at || new Date().toISOString(),
            ...chunk.metadata
          }
        };
      });

      const filteredResults = results.filter(
        result => result.similarity >= (filters?.minSimilarity || 0.2)
      );

      console.log('✅ Keyword search complete:', { results: filteredResults.length });
      return filteredResults.sort((a, b) => b.similarity - a.similarity);

    } catch (error) {
      console.error('❌ Keyword search failed:', error);
      return [];
    }
  }

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
      const [semanticResults, keywordResults] = await Promise.all([
        this.searchSimilarChunks(query, agentId, filters),
        this.searchByKeywords(keywords, agentId, filters)
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

  private static async generateQueryEmbedding(query: string): Promise<number[]> {
    // Placeholder for actual embedding generation
    // In real implementation, this would call an embedding service
    console.log('📊 Generating query embedding (placeholder)');
    return new Array(1536).fill(0).map(() => Math.random());
  }

  private static calculateMockSimilarity(query: string, content: string, index: number): number {
    // Mock similarity calculation for testing
    const queryWords = query.toLowerCase().split(' ');
    const contentWords = content.toLowerCase().split(' ');
    
    const commonWords = queryWords.filter(word => 
      contentWords.some(cWord => cWord.includes(word) || word.includes(cWord))
    );
    
    const baseSimilarity = commonWords.length / queryWords.length;
    const positionPenalty = index * 0.05; // Later results get lower scores
    
    return Math.max(0.1, Math.min(0.95, baseSimilarity - positionPenalty));
  }

  private static calculateKeywordSimilarity(keywords: string[], content: string): number {
    const contentLower = content.toLowerCase();
    const matchingKeywords = keywords.filter(keyword => 
      contentLower.includes(keyword.toLowerCase())
    );
    
    return matchingKeywords.length / keywords.length;
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

  static async getSearchSuggestions(
    partialQuery: string,
    agentId: string,
    limit: number = 5
  ): Promise<string[]> {
    console.log('💡 Getting search suggestions:', { partialQuery });

    try {
      // Get recent successful queries for this agent from messages table
      const { data: recentQueries } = await supabase
        .from('messages')
        .select('content, conversations!inner(agent_id)')
        .eq('conversations.agent_id', agentId)
        .eq('is_agent', false)
        .ilike('content', `%${partialQuery}%`)
        .limit(limit * 2);

      if (!recentQueries) return [];

      // Filter and format suggestions
      const suggestions = recentQueries
        .map(q => q.content)
        .filter(content => 
          content.length > partialQuery.length && 
          content.length < 100 &&
          content.toLowerCase().includes(partialQuery.toLowerCase())
        )
        .slice(0, limit);

      return [...new Set(suggestions)]; // Remove duplicates

    } catch (error) {
      console.error('❌ Failed to get search suggestions:', error);
      return [];
    }
  }
}
