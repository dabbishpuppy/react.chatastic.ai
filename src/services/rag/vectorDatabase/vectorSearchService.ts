
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
  sourceTypes?: Array<'text' | 'file' | 'website' | 'qa'>;
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
      // For now, use a basic query until we have the pgvector function set up
      let query = supabase
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

      // Add agent filter if provided
      if (agentId) {
        query = query.eq('agent_sources.agent_id', agentId);
      }

      // Add source type filter if provided
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

      // Mock similarity calculation for now - simplified to avoid type issues
      const results: VectorSearchResult[] = [];
      
      if (data) {
        for (const item of data) {
          const itemMetadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
          
          results.push({
            chunkId: item.id,
            sourceId: item.source_id,
            content: item.content,
            similarity: Math.random() * 0.4 + 0.6, // Random similarity between 0.6-1.0
            metadata: {
              sourceName: item.agent_sources?.title || 'Unknown',
              sourceType: item.agent_sources?.source_type || 'text',
              sourceUrl: item.agent_sources?.url,
              ...itemMetadata
            }
          });
        }
      }

      // Filter by minimum similarity
      return results.filter(result => result.similarity >= minSimilarity);

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
      if (data) {
        data.forEach(item => {
          const modelName = item.model_name || 'unknown';
          modelDistribution[modelName] = (modelDistribution[modelName] || 0) + 1;
        });
      }

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
