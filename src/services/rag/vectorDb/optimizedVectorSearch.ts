import { supabase } from "@/integrations/supabase/client";

export interface VectorSearchOptions {
  minSimilarity?: number;
  maxResults?: number;
  agentId?: string;
  sourceTypes?: ('text' | 'file' | 'website' | 'qa')[];
  dateRange?: {
    start: string;
    end: string;
  };
  includeMetadata?: boolean;
  rerank?: boolean;
}

export interface VectorSearchResult {
  chunkId: string;
  content: string;
  similarity: number;
  sourceId: string;
  sourceType: string;
  sourceTitle: string;
  metadata?: Record<string, any>;
  chunkIndex: number;
}

export interface SearchPerformanceMetrics {
  queryTime: number;
  resultsCount: number;
  indexHits: number;
  filterTime: number;
  rankingTime: number;
}

export class OptimizedVectorSearch {
  // Optimized vector similarity search with filtering
  static async searchSimilarChunks(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<{
    results: VectorSearchResult[];
    metrics: SearchPerformanceMetrics;
  }> {
    const startTime = Date.now();
    console.log('🔍 Performing optimized vector search');

    const {
      minSimilarity = 0.3,
      maxResults = 10,
      agentId,
      sourceTypes,
      dateRange,
      includeMetadata = true,
      rerank = true
    } = options;

    try {
      // Build the query with optimized joins and filtering
      let query = supabase
        .from('source_embeddings')
        .select(`
          chunk_id,
          embedding,
          source_chunks!inner(
            id,
            content,
            chunk_index,
            metadata,
            source_id,
            agent_sources!inner(
              id,
              title,
              source_type,
              agent_id,
              created_at
            )
          )
        `)
        .not('embedding', 'is', null);

      // Apply agent filter if specified
      if (agentId) {
        query = query.eq('source_chunks.agent_sources.agent_id', agentId);
      }

      // Apply source type filter if specified
      if (sourceTypes && sourceTypes.length > 0) {
        query = query.in('source_chunks.agent_sources.source_type', sourceTypes);
      }

      // Apply date range filter if specified
      if (dateRange) {
        query = query
          .gte('source_chunks.agent_sources.created_at', dateRange.start)
          .lte('source_chunks.agent_sources.created_at', dateRange.end);
      }

      // Limit initial results for performance
      query = query.limit(maxResults * 3); // Get more candidates for reranking

      const { data: embeddings, error } = await query;

      if (error) {
        throw new Error(`Vector search failed: ${error.message}`);
      }

      const filterTime = Date.now() - startTime;

      // Calculate similarities and filter by minimum threshold
      const rankingStartTime = Date.now();
      const candidates = (embeddings || [])
        .map(item => {
          const embedding = JSON.parse(item.embedding as unknown as string) as number[];
          const similarity = this.calculateCosineSimilarity(queryEmbedding, embedding);
          
          if (similarity < minSimilarity) return null;

          const sourceData = item.source_chunks?.agent_sources;
          const metadata = includeMetadata ? (item.source_chunks?.metadata as any) : undefined;
          
          return {
            chunkId: item.chunk_id,
            content: item.source_chunks?.content || '',
            similarity,
            sourceId: item.source_chunks?.source_id || '',
            sourceType: sourceData?.source_type || '',
            sourceTitle: sourceData?.title || '',
            metadata: metadata ? (typeof metadata === 'object' ? metadata : {}) : {},
            chunkIndex: item.source_chunks?.chunk_index || 0
          } as VectorSearchResult;
        })
        .filter((item): item is VectorSearchResult => item !== null)
        .sort((a, b) => b.similarity - a.similarity);

      // Apply reranking if enabled
      const results = rerank 
        ? await this.rerankResults(candidates.slice(0, maxResults * 2), queryEmbedding)
        : candidates;

      const finalResults = results.slice(0, maxResults);
      const rankingTime = Date.now() - rankingStartTime;
      const totalTime = Date.now() - startTime;

      const metrics: SearchPerformanceMetrics = {
        queryTime: totalTime,
        resultsCount: finalResults.length,
        indexHits: embeddings?.length || 0,
        filterTime,
        rankingTime
      };

      console.log(`✅ Vector search completed in ${totalTime}ms: ${finalResults.length} results`);

      return { results: finalResults, metrics };

    } catch (error: any) {
      console.error('Vector search error:', error);
      throw new Error(`Vector search failed: ${error.message}`);
    }
  }

  // Hybrid search combining vector and keyword search
  static async hybridSearch(
    queryEmbedding: number[],
    keywords: string[],
    options: VectorSearchOptions = {}
  ): Promise<{
    results: VectorSearchResult[];
    metrics: SearchPerformanceMetrics;
  }> {
    console.log('🔀 Performing hybrid vector + keyword search');

    const startTime = Date.now();

    // Perform vector search
    const vectorResults = await this.searchSimilarChunks(queryEmbedding, {
      ...options,
      maxResults: (options.maxResults || 10) * 2
    });

    // Perform keyword search
    const keywordResults = await this.keywordSearch(keywords, {
      ...options,
      maxResults: (options.maxResults || 10) * 2
    });

    // Combine and rerank results
    const combinedResults = this.combineSearchResults(
      vectorResults.results,
      keywordResults,
      options.maxResults || 10
    );

    const totalTime = Date.now() - startTime;

    return {
      results: combinedResults,
      metrics: {
        queryTime: totalTime,
        resultsCount: combinedResults.length,
        indexHits: vectorResults.metrics.indexHits,
        filterTime: vectorResults.metrics.filterTime,
        rankingTime: vectorResults.metrics.rankingTime
      }
    };
  }

  // Keyword search for text matching
  private static async keywordSearch(
    keywords: string[],
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    if (keywords.length === 0) return [];

    const { agentId, sourceTypes, maxResults = 20 } = options;

    // Build keyword search query
    const searchTerms = keywords.map(k => k.toLowerCase()).join(' | ');
    
    let query = supabase
      .from('source_chunks')
      .select(`
        id,
        content,
        chunk_index,
        metadata,
        source_id,
        agent_sources!inner(
          id,
          title,
          source_type,
          agent_id
        )
      `)
      .textSearch('content', searchTerms);

    if (agentId) {
      query = query.eq('agent_sources.agent_id', agentId);
    }

    if (sourceTypes && sourceTypes.length > 0) {
      query = query.in('agent_sources.source_type', sourceTypes);
    }

    const { data: chunks, error } = await query.limit(maxResults);

    if (error) {
      console.error('Keyword search error:', error);
      return [];
    }

    return (chunks || []).map(chunk => {
      const metadata = chunk.metadata as any;
      return {
        chunkId: chunk.id,
        content: chunk.content,
        similarity: this.calculateKeywordRelevance(chunk.content, keywords),
        sourceId: chunk.source_id,
        sourceType: chunk.agent_sources?.source_type || '',
        sourceTitle: chunk.agent_sources?.title || '',
        metadata: metadata ? (typeof metadata === 'object' ? metadata : {}) : {},
        chunkIndex: chunk.chunk_index
      };
    });
  }

  // Calculate cosine similarity between two vectors
  private static calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  // Calculate keyword relevance score
  private static calculateKeywordRelevance(content: string, keywords: string[]): number {
    const contentLower = content.toLowerCase();
    const contentWords = contentLower.split(/\s+/);
    
    let matches = 0;
    let totalScore = 0;

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const exactMatches = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
      
      if (exactMatches > 0) {
        matches++;
        totalScore += exactMatches * (keywordLower.length / contentWords.length);
      }
    }

    return Math.min(matches / keywords.length + totalScore, 1);
  }

  // Combine vector and keyword search results
  private static combineSearchResults(
    vectorResults: VectorSearchResult[],
    keywordResults: VectorSearchResult[],
    maxResults: number
  ): VectorSearchResult[] {
    const resultMap = new Map<string, VectorSearchResult>();

    vectorResults.forEach(result => {
      resultMap.set(result.chunkId, {
        ...result,
        similarity: result.similarity * 1.1
      });
    });

    keywordResults.forEach(result => {
      const existing = resultMap.get(result.chunkId);
      if (existing) {
        existing.similarity = Math.min(existing.similarity + result.similarity * 0.3, 1);
      } else {
        resultMap.set(result.chunkId, result);
      }
    });

    return Array.from(resultMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  // Advanced reranking using multiple signals
  private static async rerankResults(
    results: VectorSearchResult[],
    queryEmbedding: number[]
  ): Promise<VectorSearchResult[]> {
    return results.map(result => {
      let rerankScore = result.similarity;

      const contentLength = result.content.length;
      if (contentLength > 500) rerankScore += 0.05;
      if (contentLength > 1000) rerankScore += 0.05;

      if (/#{1,6}\s|<h[1-6]>|\n\s*[-*+]\s/i.test(result.content)) {
        rerankScore += 0.03;
      }

      return {
        ...result,
        similarity: Math.min(rerankScore, 1)
      };
    }).sort((a, b) => b.similarity - a.similarity);
  }

  // Get search performance analytics
  static async getSearchAnalytics(
    agentId: string,
    timeRange: { start: string; end: string }
  ): Promise<{
    totalSearches: number;
    avgQueryTime: number;
    avgResultsCount: number;
    popularSources: Array<{ sourceId: string; title: string; searchCount: number }>;
  }> {
    return {
      totalSearches: 0,
      avgQueryTime: 0,
      avgResultsCount: 0,
      popularSources: []
    };
  }

  // Create optimized indexes for vector search
  static async optimizeVectorIndexes(): Promise<void> {
    console.log('🚀 Optimizing vector search indexes');
    console.log('✅ Vector indexes optimization completed (placeholder)');
  }
}
