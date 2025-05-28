
import { supabase } from "@/integrations/supabase/client";
import { SourceEmbedding } from "@/types/rag";

export class EmbeddingService {
  // Store embeddings for chunks
  static async storeEmbeddings(embeddings: Array<{
    chunk_id: string;
    embedding: number[];
    model_name: string;
  }>): Promise<SourceEmbedding[]> {
    const { data: stored, error } = await supabase
      .from('source_embeddings')
      .insert(embeddings)
      .select();

    if (error) throw new Error(`Failed to store embeddings: ${error.message}`);
    return stored || [];
  }

  // Search similar embeddings using vector similarity
  static async searchSimilar(
    agentId: string,
    queryEmbedding: number[],
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<Array<SourceEmbedding & { similarity: number; chunk: any; source: any }>> {
    // Use SQL function for vector similarity search
    const { data, error } = await supabase.rpc('search_similar_embeddings', {
      agent_id: agentId,
      query_embedding: queryEmbedding,
      similarity_threshold: threshold,
      match_count: limit
    });

    if (error) throw new Error(`Failed to search embeddings: ${error.message}`);
    return data || [];
  }

  // Delete embeddings for a chunk
  static async deleteEmbeddingsByChunk(chunkId: string): Promise<boolean> {
    const { error } = await supabase
      .from('source_embeddings')
      .delete()
      .eq('chunk_id', chunkId);

    if (error) throw new Error(`Failed to delete embeddings: ${error.message}`);
    return true;
  }

  // Delete embeddings for an agent (across all sources)
  static async deleteEmbeddingsByAgent(agentId: string): Promise<boolean> {
    const { error } = await supabase.rpc('delete_agent_embeddings', {
      agent_id: agentId
    });

    if (error) throw new Error(`Failed to delete agent embeddings: ${error.message}`);
    return true;
  }

  // Get embedding statistics for an agent
  static async getEmbeddingStats(agentId: string): Promise<{
    total_embeddings: number;
    models_used: string[];
    last_updated: string;
  }> {
    const { data, error } = await supabase.rpc('get_agent_embedding_stats', {
      agent_id: agentId
    });

    if (error) throw new Error(`Failed to get embedding stats: ${error.message}`);
    return data || { total_embeddings: 0, models_used: [], last_updated: '' };
  }
}
