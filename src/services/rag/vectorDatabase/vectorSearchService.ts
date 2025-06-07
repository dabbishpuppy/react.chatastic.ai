
import { supabase } from '@/integrations/supabase/client';

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
  sourceTypes?: string[];
}

export class VectorSearchService {
  /**
   * Perform semantic search using vector similarity
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
      // Convert array to vector format for pgvector
      const vectorString = `[${queryEmbedding.join(',')}]`;
      
      let query = supabase
        .rpc('search_similar_chunks', {
          query_embedding: vectorString,
          match_threshold: minSimilarity,
          match_count: maxResults
        });

      // Add agent filter if provided
      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Vector search error:', error);
        throw error;
      }

      return data?.map((item: any) => ({
        chunkId: item.chunk_id,
        sourceId: item.source_id,
        content: item.content,
        similarity: item.similarity,
        metadata: item.metadata || {}
      })) || [];

    } catch (error) {
      console.error('Vector search failed:', error);
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
      let query = supabase
        .from('source_embeddings')
        .select('model_name');

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const modelDistribution: Record<string, number> = {};
      data?.forEach(item => {
        modelDistribution[item.model_name] = (modelDistribution[item.model_name] || 0) + 1;
      });

      return {
        totalEmbeddings: data?.length || 0,
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
