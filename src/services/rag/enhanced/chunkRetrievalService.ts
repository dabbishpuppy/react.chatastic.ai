
import { supabase } from "@/integrations/supabase/client";
import { CompressionEngine } from "./compressionEngine";

export interface RetrievedChunk {
  id: string;
  content: string;
  tokenCount: number;
  chunkIndex: number;
  contentHash: string;
  refCount: number;
}

export class ChunkRetrievalService {
  // Retrieve and decompress chunks for a source
  static async getSourceChunks(sourceId: string): Promise<RetrievedChunk[]> {
    try {
      console.log(`🔍 Retrieving chunks for source: ${sourceId}`);

      // Get chunk mappings for this source
      const { data: mappings, error: mappingError } = await supabase
        .from('source_to_chunk_map')
        .select(`
          chunk_index,
          chunk_id,
          semantic_chunks(
            id,
            content_hash,
            compressed_blob,
            token_count,
            ref_count
          )
        `)
        .eq('source_id', sourceId)
        .order('chunk_index', { ascending: true });

      if (mappingError) {
        throw new Error(`Failed to retrieve chunk mappings: ${mappingError.message}`);
      }

      if (!mappings || mappings.length === 0) {
        console.log(`No chunks found for source: ${sourceId}`);
        return [];
      }

      const retrievedChunks: RetrievedChunk[] = [];

      // Decompress each chunk
      for (const mapping of mappings) {
        const chunk = mapping.semantic_chunks as any;
        if (chunk && chunk.compressed_blob) {
          try {
            // Convert bytea to base64 string for decompression
            const compressedData = btoa(String.fromCharCode(...new Uint8Array(chunk.compressed_blob)));
            
            // Decompress the content
            const decompressedContent = await CompressionEngine.decompressFromStorage(compressedData);

            retrievedChunks.push({
              id: chunk.id,
              content: decompressedContent,
              tokenCount: chunk.token_count,
              chunkIndex: mapping.chunk_index,
              contentHash: chunk.content_hash,
              refCount: chunk.ref_count
            });

          } catch (decompressionError) {
            console.error(`Failed to decompress chunk ${chunk.id}:`, decompressionError);
            // Skip this chunk but continue with others
          }
        }
      }

      console.log(`✅ Retrieved and decompressed ${retrievedChunks.length} chunks for source: ${sourceId}`);
      return retrievedChunks;

    } catch (error) {
      console.error('Failed to retrieve source chunks:', error);
      throw error;
    }
  }

  // Get deduplication statistics
  static async getDeduplicationStats(customerId?: string): Promise<{
    totalChunks: number;
    uniqueChunks: number;
    totalReferences: number;
    averageRefCount: number;
    compressionRatio: number;
    spaceSavedMB: number;
  }> {
    try {
      // Get total unique chunks
      const { count: uniqueChunks } = await supabase
        .from('semantic_chunks')
        .select('*', { count: 'exact', head: true });

      // Get total references (all mappings)
      let mappingQuery = supabase
        .from('source_to_chunk_map')
        .select('*', { count: 'exact', head: true });

      if (customerId) {
        // Filter by customer if specified
        mappingQuery = mappingQuery
          .eq('agent_sources.team_id', customerId);
      }

      const { count: totalReferences } = await mappingQuery;

      // Get compression stats
      const { data: chunks } = await supabase
        .from('semantic_chunks')
        .select('ref_count, token_count')
        .limit(1000); // Sample for performance

      let totalRefCount = 0;
      let totalTokens = 0;
      
      if (chunks) {
        for (const chunk of chunks) {
          totalRefCount += chunk.ref_count || 1;
          totalTokens += chunk.token_count || 0;
        }
      }

      const averageRefCount = chunks && chunks.length > 0 ? totalRefCount / chunks.length : 1;
      
      // Estimate compression (assume ~4 chars per token, 75% compression)
      const estimatedOriginalSize = totalTokens * 4;
      const estimatedCompressedSize = estimatedOriginalSize * 0.25;
      const compressionRatio = estimatedOriginalSize > 0 ? estimatedCompressedSize / estimatedOriginalSize : 0;
      const spaceSavedMB = (estimatedOriginalSize - estimatedCompressedSize) / (1024 * 1024);

      return {
        totalChunks: totalReferences || 0,
        uniqueChunks: uniqueChunks || 0,
        totalReferences: totalReferences || 0,
        averageRefCount,
        compressionRatio,
        spaceSavedMB
      };

    } catch (error) {
      console.error('Failed to get deduplication stats:', error);
      return {
        totalChunks: 0,
        uniqueChunks: 0,
        totalReferences: 0,
        averageRefCount: 1,
        compressionRatio: 0,
        spaceSavedMB: 0
      };
    }
  }

  // Cleanup orphaned chunks (called when sources are deleted)
  static async cleanupOrphanedChunks(): Promise<number> {
    try {
      console.log('🧹 Starting orphaned chunks cleanup...');

      // Use the database function for efficient cleanup
      const { data: deletedCount, error } = await supabase
        .rpc('cleanup_unused_chunks');

      if (error) {
        console.error('Cleanup function failed:', error);
        return 0;
      }

      console.log(`✅ Cleaned up ${deletedCount} orphaned chunks`);
      return deletedCount || 0;

    } catch (error) {
      console.error('Cleanup failed:', error);
      return 0;
    }
  }

  // Search chunks by content similarity (for deduplication analysis)
  static async findSimilarChunks(contentHash: string, limit: number = 10): Promise<RetrievedChunk[]> {
    try {
      const { data: chunks, error } = await supabase
        .from('semantic_chunks')
        .select('*')
        .eq('content_hash', contentHash)
        .limit(limit);

      if (error) {
        throw new Error(`Failed to find similar chunks: ${error.message}`);
      }

      const retrievedChunks: RetrievedChunk[] = [];

      if (chunks) {
        for (const chunk of chunks) {
          try {
            // Decompress content for analysis
            const compressedData = btoa(String.fromCharCode(...new Uint8Array(chunk.compressed_blob)));
            const decompressedContent = await CompressionEngine.decompressFromStorage(compressedData);

            retrievedChunks.push({
              id: chunk.id,
              content: decompressedContent,
              tokenCount: chunk.token_count,
              chunkIndex: 0, // Not applicable for similarity search
              contentHash: chunk.content_hash,
              refCount: chunk.ref_count
            });
          } catch (decompressionError) {
            console.warn(`Failed to decompress chunk ${chunk.id} for similarity search:`, decompressionError);
          }
        }
      }

      return retrievedChunks;

    } catch (error) {
      console.error('Failed to find similar chunks:', error);
      return [];
    }
  }
}
