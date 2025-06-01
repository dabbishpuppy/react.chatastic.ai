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
  // Process chunks with global deduplication using Zstd compression
  static async processChunksGlobally(
    chunks: string[],
    sourceId: string,
    customerId: string
  ): Promise<ChunkProcessingResult> {
    let uniqueChunks = 0;
    let duplicateChunks = 0;
    let totalCompressedSize = 0;
    let totalOriginalSize = 0;

    console.log(`🔍 Processing ${chunks.length} chunks with Zstd compression and global deduplication`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const contentHash = await CompressionEngine.generateContentHash(chunk);
      
      // Check if chunk exists in source_chunks table by content_hash
      const { data: existingChunk } = await supabase
        .from('source_chunks')
        .select('id, content')
        .eq('content_hash', contentHash)
        .single();

      if (existingChunk) {
        // Chunk exists - create mapping to existing chunk
        await supabase
          .from('source_to_chunk_map')
          .insert({
            source_id: sourceId,
            chunk_id: existingChunk.id,
            chunk_index: i
          });

        duplicateChunks++;
        console.log(`🔄 Reused existing chunk ${existingChunk.id} (global dedup)`);
      } else {
        // New chunk - compress with Zstd and store
        const compressionResult = await CompressionEngine.compressForStorage(chunk);
        
        const { data: newChunk, error } = await supabase
          .from('source_chunks')
          .insert({
            source_id: sourceId,
            chunk_index: i,
            content: chunk,
            content_hash: contentHash,
            token_count: this.estimateTokens(chunk),
            metadata: {
              compressed_blob: compressionResult.compressedData,
              original_size: compressionResult.originalSize,
              compressed_size: compressionResult.compressedSize,
              compression_ratio: compressionResult.compressionRatio,
              compression_algorithm: 'zstd-level-19'
            }
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
          console.log(`✨ Created new Zstd compressed chunk ${newChunk.id} (${(compressionResult.compressionRatio * 100).toFixed(1)}% ratio)`);
        }
      }
      
      totalOriginalSize += new TextEncoder().encode(chunk).length;
    }

    const spaceSaved = totalOriginalSize - totalCompressedSize;
    const deduplicationRatio = duplicateChunks / chunks.length;

    console.log(`📊 Zstd compression results: ${totalOriginalSize} → ${totalCompressedSize} bytes (${(totalCompressedSize/totalOriginalSize * 100).toFixed(1)}% ratio)`);
    console.log(`♻️ Deduplication: ${duplicateChunks}/${chunks.length} chunks (${(deduplicationRatio * 100).toFixed(1)}%) were duplicates`);

    // Update source with compression stats
    await supabase
      .from('agent_sources')
      .update({
        unique_chunks: uniqueChunks,
        duplicate_chunks: duplicateChunks,
        total_content_size: totalOriginalSize,
        compressed_content_size: totalCompressedSize,
        global_compression_ratio: totalCompressedSize / totalOriginalSize,
        compression_algorithm: 'zstd-level-19',
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
    
    // For each chunk, check if it's referenced by other sources
    for (const chunkId of chunkIds) {
      const { count } = await supabase
        .from('source_to_chunk_map')
        .select('*', { count: 'exact', head: true })
        .eq('chunk_id', chunkId)
        .neq('source_id', sourceId);

      if (count === 0) {
        // No other sources reference this chunk, safe to delete
        await supabase
          .from('source_chunks')
          .delete()
          .eq('id', chunkId);
      }
    }

    // Delete all mappings for this source
    await supabase
      .from('source_to_chunk_map')
      .delete()
      .eq('source_id', sourceId);

    return chunkIds.length;
  }

  // Get global deduplication statistics with Zstd compression metrics
  static async getGlobalStats(): Promise<{
    totalChunks: number;
    uniqueChunks: number;
    duplicateReferences: number;
    compressionRatio: number;
    spaceSavedGB: number;
    compressionAlgorithm: string;
  }> {
    // Get total unique chunks
    const { count: uniqueChunks } = await supabase
      .from('source_chunks')
      .select('*', { count: 'exact', head: true });

    // Get total references (including duplicates via mappings)
    const { count: totalReferences } = await supabase
      .from('source_to_chunk_map')
      .select('*', { count: 'exact', head: true });

    const duplicateReferences = (totalReferences || 0) - (uniqueChunks || 0);

    // Get Zstd compression stats from metadata
    const { data: compressionData } = await supabase
      .from('source_chunks')
      .select('metadata, token_count');

    let totalCompressedBytes = 0;
    let estimatedOriginalBytes = 0;
    let compressionAlgorithm = 'zstd-level-19';

    compressionData?.forEach(chunk => {
      const metadata = chunk.metadata as any;
      if (metadata?.compressed_size) {
        totalCompressedBytes += metadata.compressed_size;
        estimatedOriginalBytes += metadata.original_size || (chunk.token_count * 4);
        
        // Track the compression algorithm used
        if (metadata.compression_algorithm) {
          compressionAlgorithm = metadata.compression_algorithm;
        }
      }
    });

    const compressionRatio = estimatedOriginalBytes > 0 ? totalCompressedBytes / estimatedOriginalBytes : 0;
    const spaceSavedBytes = estimatedOriginalBytes - totalCompressedBytes;
    const spaceSavedGB = spaceSavedBytes / (1024 * 1024 * 1024);

    console.log(`📈 Global Zstd compression stats: ${(compressionRatio * 100).toFixed(1)}% ratio, ${spaceSavedGB.toFixed(2)}GB saved`);

    return {
      totalChunks: totalReferences || 0,
      uniqueChunks: uniqueChunks || 0,
      duplicateReferences,
      compressionRatio,
      spaceSavedGB,
      compressionAlgorithm
    };
  }

  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4); // Rough estimation: 1 token ≈ 4 characters
  }
}
