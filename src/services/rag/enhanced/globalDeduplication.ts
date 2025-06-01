
import { supabase } from "@/integrations/supabase/client";
import { CompressionEngine } from "./compressionEngine";

export interface DeduplicationResult {
  isDuplicate: boolean;
  existingChunkId?: string;
  newChunkId?: string;
  refCount: number;
}

export interface DeduplicationStats {
  totalChunks: number;
  uniqueChunks: number;
  duplicateChunks: number;
  spaceSavedBytes: number;
  compressionRatio: number;
}

export class GlobalDeduplicationService {
  // Check if content already exists and handle deduplication
  static async deduplicateContent(
    content: string,
    sourceId: string,
    chunkIndex: number = 0
  ): Promise<DeduplicationResult> {
    try {
      // Generate content hash
      const contentHash = await CompressionEngine.generateContentHash(content);
      
      // Check if chunk already exists
      const { data: existingChunk, error } = await supabase
        .from('semantic_chunks')
        .select('id, ref_count, compressed_blob')
        .eq('content_hash', contentHash)
        .single();

      if (existingChunk && !error) {
        // Chunk exists - increment reference count
        const newRefCount = existingChunk.ref_count + 1;
        
        await supabase
          .from('semantic_chunks')
          .update({ 
            ref_count: newRefCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingChunk.id);

        // Create mapping to existing chunk
        await supabase
          .from('source_to_chunk_map')
          .insert({
            source_id: sourceId,
            chunk_id: existingChunk.id,
            chunk_index: chunkIndex
          });

        console.log(`♻️ Reused existing chunk ${existingChunk.id} (global dedup, ref_count: ${newRefCount})`);

        return {
          isDuplicate: true,
          existingChunkId: existingChunk.id,
          refCount: newRefCount
        };
      } else {
        // New content - compress and store
        const compressionResult = await CompressionEngine.compressForStorage(content);
        const tokenCount = Math.ceil(content.length / 3.5); // Rough token estimation
        
        const { data: newChunk, error: insertError } = await supabase
          .from('semantic_chunks')
          .insert({
            content_hash: contentHash,
            compressed_blob: compressionResult.compressedData,
            token_count: tokenCount,
            ref_count: 1
          })
          .select('id')
          .single();

        if (newChunk && !insertError) {
          // Create mapping to new chunk
          await supabase
            .from('source_to_chunk_map')
            .insert({
              source_id: sourceId,
              chunk_id: newChunk.id,
              chunk_index: chunkIndex
            });

          console.log(`✨ Created new compressed chunk ${newChunk.id} (${(compressionResult.compressionRatio * 100).toFixed(1)}% ratio)`);

          return {
            isDuplicate: false,
            newChunkId: newChunk.id,
            refCount: 1
          };
        } else {
          throw new Error(`Failed to create chunk: ${insertError?.message}`);
        }
      }
    } catch (error) {
      console.error('Deduplication failed:', error);
      throw error;
    }
  }

  // Get deduplication statistics for a customer
  static async getDeduplicationStats(customerId: string): Promise<DeduplicationStats> {
    try {
      // Get all chunks referenced by this customer's sources
      const { data: customerChunks } = await supabase
        .from('source_to_chunk_map')
        .select(`
          chunk_id,
          semantic_chunks (
            ref_count,
            compressed_blob,
            token_count
          )
        `)
        .in('source_id', 
          // Subquery to get customer's source IDs
          supabase
            .from('agent_sources')
            .select('id')
            .eq('team_id', customerId)
        );

      if (!customerChunks || customerChunks.length === 0) {
        return {
          totalChunks: 0,
          uniqueChunks: 0,
          duplicateChunks: 0,
          spaceSavedBytes: 0,
          compressionRatio: 1.0
        };
      }

      // Calculate statistics
      const uniqueChunkIds = new Set(customerChunks.map(c => c.chunk_id));
      const totalChunks = customerChunks.length;
      const uniqueChunks = uniqueChunkIds.size;
      const duplicateChunks = totalChunks - uniqueChunks;

      // Calculate space savings from deduplication
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;

      for (const mapping of customerChunks) {
        const chunk = mapping.semantic_chunks;
        if (chunk) {
          // Estimate original size from token count
          const estimatedOriginalSize = (chunk.token_count || 0) * 3.5;
          totalOriginalSize += estimatedOriginalSize;
          
          // Compressed size from blob
          const compressedSize = chunk.compressed_blob ? 
            (chunk.compressed_blob.length * 0.75) : // Base64 overhead estimation
            estimatedOriginalSize;
          totalCompressedSize += compressedSize;
        }
      }

      const compressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1.0;
      const spaceSavedBytes = totalOriginalSize - totalCompressedSize;

      return {
        totalChunks,
        uniqueChunks,
        duplicateChunks,
        spaceSavedBytes: Math.max(0, spaceSavedBytes),
        compressionRatio
      };
    } catch (error) {
      console.error('Failed to get deduplication stats:', error);
      return {
        totalChunks: 0,
        uniqueChunks: 0,
        duplicateChunks: 0,
        spaceSavedBytes: 0,
        compressionRatio: 1.0
      };
    }
  }

  // Clean up orphaned chunks (chunks with ref_count = 0)
  static async cleanupOrphanedChunks(): Promise<number> {
    try {
      const { data: orphanedChunks } = await supabase
        .from('semantic_chunks')
        .select('id')
        .eq('ref_count', 0);

      if (!orphanedChunks || orphanedChunks.length === 0) {
        return 0;
      }

      const chunkIds = orphanedChunks.map(c => c.id);
      
      const { error } = await supabase
        .from('semantic_chunks')
        .delete()
        .in('id', chunkIds);

      if (error) {
        throw new Error(`Failed to delete orphaned chunks: ${error.message}`);
      }

      console.log(`🧹 Cleaned up ${chunkIds.length} orphaned chunks`);
      return chunkIds.length;
    } catch (error) {
      console.error('Cleanup of orphaned chunks failed:', error);
      return 0;
    }
  }

  // Decrement reference count for chunks when a source is deleted
  static async decrementChunkReferences(sourceId: string): Promise<number> {
    try {
      // Get all chunk mappings for this source
      const { data: mappings } = await supabase
        .from('source_to_chunk_map')
        .select('chunk_id')
        .eq('source_id', sourceId);

      if (!mappings || mappings.length === 0) {
        return 0;
      }

      let decrementedCount = 0;

      // Decrement ref_count for each chunk
      for (const mapping of mappings) {
        const { data: chunk } = await supabase
          .from('semantic_chunks')
          .select('ref_count')
          .eq('id', mapping.chunk_id)
          .single();

        if (chunk) {
          const newRefCount = Math.max(0, chunk.ref_count - 1);
          
          await supabase
            .from('semantic_chunks')
            .update({ 
              ref_count: newRefCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', mapping.chunk_id);

          decrementedCount++;
        }
      }

      // Delete all mappings for this source
      await supabase
        .from('source_to_chunk_map')
        .delete()
        .eq('source_id', sourceId);

      // Clean up any orphaned chunks
      const cleanedCount = await this.cleanupOrphanedChunks();

      console.log(`📉 Decremented refs for ${decrementedCount} chunks, cleaned ${cleanedCount} orphaned chunks`);
      
      return decrementedCount;
    } catch (error) {
      console.error('Failed to decrement chunk references:', error);
      return 0;
    }
  }

  // Get global deduplication metrics across all customers
  static async getGlobalDeduplicationMetrics(): Promise<{
    totalChunks: number;
    uniqueChunks: number;
    avgRefCount: number;
    totalSpaceSaved: number;
    topDuplicatedChunks: Array<{ id: string; refCount: number; estimatedSize: number }>;
  }> {
    try {
      const { data: allChunks } = await supabase
        .from('semantic_chunks')
        .select('id, ref_count, token_count, compressed_blob')
        .order('ref_count', { ascending: false })
        .limit(1000); // Limit for performance

      if (!allChunks || allChunks.length === 0) {
        return {
          totalChunks: 0,
          uniqueChunks: 0,
          avgRefCount: 0,
          totalSpaceSaved: 0,
          topDuplicatedChunks: []
        };
      }

      const totalReferences = allChunks.reduce((sum, chunk) => sum + chunk.ref_count, 0);
      const uniqueChunks = allChunks.length;
      const avgRefCount = totalReferences / uniqueChunks;

      // Calculate space saved from deduplication
      let totalSpaceSaved = 0;
      for (const chunk of allChunks) {
        if (chunk.ref_count > 1) {
          const estimatedSize = (chunk.token_count || 0) * 3.5;
          const spaceSavedForChunk = estimatedSize * (chunk.ref_count - 1);
          totalSpaceSaved += spaceSavedForChunk;
        }
      }

      // Get top duplicated chunks
      const topDuplicatedChunks = allChunks
        .filter(chunk => chunk.ref_count > 1)
        .slice(0, 10)
        .map(chunk => ({
          id: chunk.id,
          refCount: chunk.ref_count,
          estimatedSize: (chunk.token_count || 0) * 3.5
        }));

      return {
        totalChunks: totalReferences,
        uniqueChunks,
        avgRefCount,
        totalSpaceSaved,
        topDuplicatedChunks
      };
    } catch (error) {
      console.error('Failed to get global deduplication metrics:', error);
      return {
        totalChunks: 0,
        uniqueChunks: 0,
        avgRefCount: 0,
        totalSpaceSaved: 0,
        topDuplicatedChunks: []
      };
    }
  }
}
