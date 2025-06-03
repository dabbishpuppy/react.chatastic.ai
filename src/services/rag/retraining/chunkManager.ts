
import { supabase } from "@/integrations/supabase/client";

export class ChunkManager {
  static async deleteExistingChunks(sourceId: string): Promise<void> {
    console.log(`🗑️ Deleting existing chunks for source: ${sourceId}`);
    
    // First, get all chunk IDs for this source
    const { data: chunks, error: chunksQueryError } = await supabase
      .from('source_chunks')
      .select('id')
      .eq('source_id', sourceId);

    if (chunksQueryError) {
      throw new Error(`Failed to query existing chunks: ${chunksQueryError.message}`);
    }

    if (chunks && chunks.length > 0) {
      const chunkIds = chunks.map(chunk => chunk.id);

      // Delete embeddings first (foreign key constraint)
      const { error: embeddingError } = await supabase
        .from('source_embeddings')
        .delete()
        .in('chunk_id', chunkIds);

      if (embeddingError) {
        console.warn(`Warning: Failed to delete existing embeddings: ${embeddingError.message}`);
      }

      // Delete chunks
      const { error: chunkError } = await supabase
        .from('source_chunks')
        .delete()
        .eq('source_id', sourceId);

      if (chunkError) {
        throw new Error(`Failed to delete existing chunks: ${chunkError.message}`);
      }

      console.log(`✅ Deleted ${chunks.length} existing chunks and embeddings for source: ${sourceId}`);
    } else {
      console.log(`ℹ️ No existing chunks found for source: ${sourceId}`);
    }
  }

  static async storeChunks(sourceId: string, chunks: any[]): Promise<void> {
    if (chunks.length === 0) return;

    const chunkData = chunks.map((chunk, index) => ({
      source_id: sourceId,
      chunk_index: index,
      content: chunk.content,
      token_count: chunk.tokenCount,
      metadata: chunk.metadata
    }));

    const { error: insertError } = await supabase
      .from('source_chunks')
      .insert(chunkData);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    console.log(`💾 Stored ${chunks.length} chunks in database`);
  }
}
