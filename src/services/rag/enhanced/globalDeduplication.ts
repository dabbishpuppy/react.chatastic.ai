
import { supabase } from "@/integrations/supabase/client";
import { CompressionEngine } from "./compressionEngine";

export interface ChunkProcessingResult {
  uniqueChunks: number;
  duplicateChunks: number;
  totalCompressedSize: number;
  spaceSaved: number;
  deduplicationRatio: number;
}

export class GlobalDeduplicationService {
  // Process chunks with global deduplication across all customers
  static async processChunksGlobally(
    chunks: string[],
    sourceId: string,
    customerId: string
  ): Promise<ChunkProcessingResult> {
    let uniqueChunks = 0;
    let duplicateChunks = 0;
    let totalCompressedSize = 0;
    let totalOriginalSize = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const contentHash = await CompressionEngine.generateContentHash(chunk);
      
      // Check if chunk exists globally
      const { data: existingChunk } = await supabase
        .from('semantic_chunks')
        .select('id, ref_count, compressed_blob')
        .eq('content_hash', contentHash)
        .single();

      if (existingChunk) {
        // Chunk exists globally - increment reference
        await supabase
          .from('semantic_chunks')
          .update({ 
            ref_count: existingChunk.ref_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingChunk.id);

        // Create mapping without storing duplicate content
        await supabase
          .from('source_to_chunk_map')
          .insert({
            source_id: sourceId,
            chunk_id: existingChunk.id,
            chunk_index: i
          });

        duplicateChunks++;
        console.log(`🔄 Reused global chunk ${existingChunk.id}`);
      } else {
        // New chunk - compress and store
        const compressionResult = await CompressionEngine.compressWithZstd(chunk, 19);
        
        const { data: newChunk, error } = await supabase
          .from('semantic_chunks')
          .insert({
            content_hash: contentHash,
            compressed_blob: compressionResult.compressed,
            token_count: this.estimateTokens(chunk),
            ref_count: 1
          })
          .select('id')
          .single();

        if (!error && newChunk) {
          await supabase
            .from('source_to_chunk_map')
            .insert({
              source_id: sourceId,
              chunk_id: newChunk.id,
              chunk_index: i
            });

          uniqueChunks++;
          totalCompressedSize += compressionResult.compressedSize;
          console.log(`✨ Created new global chunk ${newChunk.id} (${compressionResult.ratio.toFixed(2)}x compression)`);
        }
      }
      
      totalOriginalSize += new TextEncoder().encode(chunk).length;
    }

    const spaceSaved = totalOriginalSize - totalCompressedSize;
    const deduplicationRatio = duplicateChunks / chunks.length;

    // Update source with compression stats
    await supabase
      .from('agent_sources')
      .update({
        unique_chunks: uniqueChunks,
        duplicate_chunks: duplicateChunks,
        total_content_size: totalOriginalSize,
        compressed_content_size: totalCompressedSize,
        global_compression_ratio: totalCompressedSize / totalOriginalSize,
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId);

    return {
      uniqueChunks,
      duplicateChunks,
      totalCompressedSize,
      spaceSaved,
      deduplicationRatio
    };
  }

  // Cleanup orphaned chunks when sources are deleted
  static async cleanupOrphanedChunks(sourceId: string): Promise<number> {
    // Get all chunk IDs referenced by this source
    const { data: chunkMappings } = await supabase
      .from('source_to_chunk_map')
      .select('chunk_id')
      .eq('source_id', sourceId);

    if (!chunkMappings || chunkMappings.length === 0) {
      return 0;
    }

    const chunkIds = chunkMappings.map(m => m.chunk_id);
    
    // Decrement ref_count for each chunk
    for (const chunkId of chunkIds) {
      const { data: chunk } = await supabase
        .from('semantic_chunks')
        .select('ref_count')
        .eq('id', chunkId)
        .single();

      if (chunk) {
        const newRefCount = chunk.ref_count - 1;
        
        if (newRefCount <= 0) {
          // Delete chunk if no more references
          await supabase
            .from('semantic_chunks')
            .delete()
            .eq('id', chunkId);
        } else {
          // Decrement reference count
          await supabase
            .from('semantic_chunks')
            .update({ ref_count: newRefCount })
            .eq('id', chunkId);
        }
      }
    }

    // Delete all mappings for this source
    await supabase
      .from('source_to_chunk_map')
      .delete()
      .eq('source_id', sourceId);

    return chunkIds.length;
  }

  // Get global deduplication statistics
  static async getGlobalStats(): Promise<{
    totalChunks: number;
    uniqueChunks: number;
    duplicateReferences: number;
    compressionRatio: number;
    spaceSavedGB: number;
  }> {
    // Get total unique chunks
    const { count: uniqueChunks } = await supabase
      .from('semantic_chunks')
      .select('*', { count: 'exact', head: true });

    // Get total references (including duplicates)
    const { data: refCounts } = await supabase
      .from('semantic_chunks')
      .select('ref_count');

    const totalChunks = refCounts?.reduce((sum, chunk) => sum + chunk.ref_count, 0) || 0;
    const duplicateReferences = totalChunks - (uniqueChunks || 0);

    // Get compression stats
    const { data: compressionData } = await supabase
      .from('semantic_chunks')
      .select('compressed_blob, token_count');

    let totalCompressedBytes = 0;
    let estimatedOriginalBytes = 0;

    compressionData?.forEach(chunk => {
      totalCompressedBytes += chunk.compressed_blob?.length || 0;
      estimatedOriginalBytes += (chunk.token_count || 0) * 4; // ~4 chars per token
    });

    const compressionRatio = estimatedOriginalBytes > 0 ? totalCompressedBytes / estimatedOriginalBytes : 0;
    const spaceSavedBytes = estimatedOriginalBytes - totalCompressedBytes;
    const spaceSavedGB = spaceSavedBytes / (1024 * 1024 * 1024);

    return {
      totalChunks,
      uniqueChunks: uniqueChunks || 0,
      duplicateReferences,
      compressionRatio,
      spaceSavedGB
    };
  }

  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4); // Rough estimation: 1 token ≈ 4 characters
  }
}
