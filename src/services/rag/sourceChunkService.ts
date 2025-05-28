
import { supabase } from "@/integrations/supabase/client";
import { SourceChunk } from "@/types/rag";

export class SourceChunkService {
  // Create chunks for a source
  static async createChunks(chunks: Array<{
    source_id: string;
    chunk_index: number;
    content: string;
    token_count: number;
    metadata?: Record<string, any>;
  }>): Promise<SourceChunk[]> {
    const { data: createdChunks, error } = await supabase
      .from('source_chunks')
      .insert(chunks)
      .select();

    if (error) throw new Error(`Failed to create chunks: ${error.message}`);
    return (createdChunks || []).map(chunk => ({
      ...chunk,
      metadata: chunk.metadata as Record<string, any> || {}
    }));
  }

  // Get chunks for a source
  static async getChunksBySource(sourceId: string): Promise<SourceChunk[]> {
    const { data: chunks, error } = await supabase
      .from('source_chunks')
      .select('*')
      .eq('source_id', sourceId)
      .order('chunk_index', { ascending: true });

    if (error) throw new Error(`Failed to fetch chunks: ${error.message}`);
    return (chunks || []).map(chunk => ({
      ...chunk,
      metadata: chunk.metadata as Record<string, any> || {}
    }));
  }

  // Get chunks for an agent (across all sources)
  static async getChunksByAgent(agentId: string): Promise<SourceChunk[]> {
    const { data: chunks, error } = await supabase
      .from('source_chunks')
      .select(`
        *,
        agent_sources!inner(agent_id)
      `)
      .eq('agent_sources.agent_id', agentId)
      .eq('agent_sources.is_active', true);

    if (error) throw new Error(`Failed to fetch agent chunks: ${error.message}`);
    return (chunks || []).map(chunk => ({
      ...chunk,
      metadata: chunk.metadata as Record<string, any> || {}
    }));
  }

  // Delete chunks for a source
  static async deleteChunksBySource(sourceId: string): Promise<boolean> {
    const { error } = await supabase
      .from('source_chunks')
      .delete()
      .eq('source_id', sourceId);

    if (error) throw new Error(`Failed to delete chunks: ${error.message}`);
    return true;
  }

  // Get chunk with embedding
  static async getChunkWithEmbedding(chunkId: string): Promise<SourceChunk & { embedding?: number[] }> {
    const { data, error } = await supabase
      .from('source_chunks')
      .select(`
        *,
        source_embeddings(embedding)
      `)
      .eq('id', chunkId)
      .single();

    if (error) throw new Error(`Failed to fetch chunk with embedding: ${error.message}`);
    
    return {
      ...data,
      metadata: data.metadata as Record<string, any> || {},
      embedding: data.source_embeddings?.[0]?.embedding as number[]
    };
  }
}
