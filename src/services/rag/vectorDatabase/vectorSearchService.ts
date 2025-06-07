import { supabase } from '@/integrations/supabase/client';
import type { ChunkWithAgent, FlatChunkWithAgent } from './types';

export interface VectorSearchResult {
  chunkId: string;
  sourceId: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

export interface VectorSearchOptions {
  maxResults?: number;
  minSimilarity?: number;
  agentId?: string;
  sourceTypes?: Array<'text' | 'file' | 'website' | 'qa'>;
}

export class VectorSearchService {
  /**
   * Approach 1: Using generic on .from() to short-circuit inference
   */
  static async searchSimilarChunks(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const {
      maxResults = 10,
      minSimilarity = 0.7,
      agentId,
      sourceTypes = []
    } = options;

    try {
      // Method 1: Generic on .from() with explicit type
      let query = supabase
        .from<ChunkWithAgent>('source_chunks')
        .select(`
          id,
          source_id,
          content,
          metadata,
          agent_sources!inner (
            id,
            title,
            source_type,
            url,
            agent_id
          )
        `)
        .limit(maxResults);

      // Add filters
      if (agentId) {
        query = query.eq('agent_sources.agent_id', agentId);
      }

      if (sourceTypes.length > 0) {
        const validSourceTypes = sourceTypes.filter(type => 
          ['text', 'file', 'website', 'qa'].includes(type)
        );
        if (validSourceTypes.length > 0) {
          query = query.in('agent_sources.source_type', validSourceTypes);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Vector search error:', error);
        throw error;
      }

      // Process results with proper typing
      const results: VectorSearchResult[] = [];
      
      if (data) {
        for (const item of data) {
          const itemMetadata = item.metadata || {};
          
          results.push({
            chunkId: item.id,
            sourceId: item.source_id,
            content: item.content,
            similarity: Math.random() * 0.4 + 0.6, // Mock similarity
            metadata: {
              sourceName: item.agent_sources?.title || 'Unknown',
              sourceType: item.agent_sources?.source_type || 'text',
              sourceUrl: item.agent_sources?.url,
              ...itemMetadata
            }
          });
        }
      }

      return results.filter(result => result.similarity >= minSimilarity);

    } catch (error) {
      console.error('Vector search failed:', error);
      return [];
    }
  }

  /**
   * Approach 2: Using generic on .select() method
   */
  static async searchWithSelectGeneric(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const { maxResults = 10, agentId } = options;

    try {
      const { data, error } = await supabase
        .from('source_chunks')
        .select<'*, agent_sources!inner(*)', ChunkWithAgent>(`
          id,
          source_id,
          content,
          metadata,
          agent_sources!inner (
            id,
            title,
            source_type,
            url,
            agent_id
          )
        `)
        .eq('agent_sources.agent_id', agentId || '')
        .limit(maxResults);

      if (error) throw error;

      return (data || []).map(item => ({
        chunkId: item.id,
        sourceId: item.source_id,
        content: item.content,
        similarity: 0.8,
        metadata: {
          sourceName: item.agent_sources.title,
          sourceType: item.agent_sources.source_type,
          sourceUrl: item.agent_sources.url
        }
      }));
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Approach 3: Using PostgrestFilterBuilder annotation
   */
  static async searchWithQueryTypeAnnotation(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const { maxResults = 10, agentId } = options;

    try {
      // Explicitly type the query variable to short-circuit inference
      const query: any = supabase
        .from('source_chunks')
        .select(`
          id,
          source_id,
          content,
          metadata,
          agent_sources!inner (
            id,
            title,
            source_type,
            url,
            agent_id
          )
        `)
        .limit(maxResults);

      if (agentId) {
        query.eq('agent_sources.agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Cast the result to our known type
      const typedData = data as ChunkWithAgent[];

      return typedData.map(item => ({
        chunkId: item.id,
        sourceId: item.source_id,
        content: item.content,
        similarity: 0.8,
        metadata: {
          sourceName: item.agent_sources.title,
          sourceType: item.agent_sources.source_type,
          sourceUrl: item.agent_sources.url
        }
      }));
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Quick Workaround 1: Type assertion to 'any'
   */
  static async searchWithAnyWorkaround(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      const { data, error } = await (supabase
        .from('source_chunks')
        .select(`
          id,
          source_id,
          content,
          metadata,
          agent_sources!inner (
            id,
            title,
            source_type,
            url,
            agent_id
          )
        `)
        .limit(options.maxResults || 10) as any);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        chunkId: item.id,
        sourceId: item.source_id,
        content: item.content,
        similarity: 0.8,
        metadata: {
          sourceName: item.agent_sources?.title || 'Unknown',
          sourceType: item.agent_sources?.source_type || 'text'
        }
      }));
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Quick Workaround 2: Using @ts-ignore
   */
  static async searchWithTsIgnore(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      // @ts-ignore - Suppress deep instantiation error
      const { data, error } = await supabase
        .from('source_chunks')
        .select(`
          id,
          source_id,
          content,
          metadata,
          agent_sources!inner (
            id,
            title,
            source_type,
            url,
            agent_id
          )
        `)
        .limit(options.maxResults || 10);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        chunkId: item.id,
        sourceId: item.source_id,
        content: item.content,
        similarity: 0.8,
        metadata: {
          sourceName: item.agent_sources?.title || 'Unknown',
          sourceType: item.agent_sources?.source_type || 'text'
        }
      }));
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Store embeddings for a chunk
   */
  static async storeEmbedding(
    chunkId: string,
    embedding: number[],
    modelName: string = 'text-embedding-3-small'
  ): Promise<boolean> {
    try {
      const vectorString = `[${embedding.join(',')}]`;
      
      const { error } = await supabase
        .from('source_embeddings')
        .upsert({
          chunk_id: chunkId,
          embedding: vectorString,
          model_name: modelName
        });

      if (error) {
        console.error('Error storing embedding:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to store embedding:', error);
      return false;
    }
  }

  /**
   * Batch store embeddings for multiple chunks
   */
  static async batchStoreEmbeddings(
    embeddings: Array<{
      chunkId: string;
      embedding: number[];
      modelName?: string;
    }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const batchSize = 100;
    for (let i = 0; i < embeddings.length; i += batchSize) {
      const batch = embeddings.slice(i, i + batchSize);
      
      try {
        const records = batch.map(item => ({
          chunk_id: item.chunkId,
          embedding: `[${item.embedding.join(',')}]`,
          model_name: item.modelName || 'text-embedding-3-small'
        }));

        const { error } = await supabase
          .from('source_embeddings')
          .upsert(records);

        if (error) {
          console.error('Batch embedding storage error:', error);
          failed += batch.length;
        } else {
          success += batch.length;
        }
      } catch (error) {
        console.error('Batch embedding storage failed:', error);
        failed += batch.length;
      }
    }

    return { success, failed };
  }

  /**
   * Get embedding statistics
   */
  static async getEmbeddingStats(agentId?: string): Promise<{
    totalEmbeddings: number;
    modelDistribution: Record<string, number>;
    averageVectorSize: number;
  }> {
    try {
      // Use explicit any type to avoid deep inference
      const query: any = supabase
        .from('source_embeddings')
        .select('model_name');

      if (agentId) {
        query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const modelDistribution: Record<string, number> = {};
      const totalEmbeddings = Array.isArray(data) ? data.length : 0;
      
      if (data && totalEmbeddings > 0) {
        for (const record of data) {
          // Simple type assertion to avoid complex inference
          const modelName = (record as any)?.model_name || 'unknown';
          modelDistribution[modelName] = (modelDistribution[modelName] || 0) + 1;
        }
      }

      return {
        totalEmbeddings,
        modelDistribution,
        averageVectorSize: 1536 // Default for text-embedding-3-small
      };
    } catch (error) {
      console.error('Failed to get embedding stats:', error);
      return {
        totalEmbeddings: 0,
        modelDistribution: {},
        averageVectorSize: 0
      };
    }
  }
}
