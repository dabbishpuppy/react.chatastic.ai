
import { supabase } from "@/integrations/supabase/client";

interface ChunkForDeduplication {
  source_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  metadata?: Record<string, any>;
}

interface DeduplicationResult {
  uniqueChunks: ChunkForDeduplication[];
  duplicateChunks: Array<ChunkForDeduplication & { duplicateOfChunkId: string }>;
  stats: {
    totalProcessed: number;
    uniqueCount: number;
    duplicateCount: number;
    deduplicationRate: number;
  };
}

export class DeduplicationService {
  // Process chunks for deduplication using the new optimized content_hash system
  static async processChunksForDeduplication(
    chunks: ChunkForDeduplication[],
    agentId: string
  ): Promise<DeduplicationResult> {
    console.log(`🔍 Processing ${chunks.length} chunks for deduplication...`);
    
    const uniqueChunks: ChunkForDeduplication[] = [];
    const duplicateChunks: Array<ChunkForDeduplication & { duplicateOfChunkId: string }> = [];

    try {
      for (const chunk of chunks) {
        // Calculate content hash using the database function
        const { data: contentHash, error: hashError } = await supabase
          .rpc('calculate_content_hash', { content: chunk.content });

        if (hashError) {
          console.error('Error calculating hash:', hashError);
          // Treat as unique if hash calculation fails
          uniqueChunks.push(chunk);
          continue;
        }

        // Check for existing chunks with the same hash across the agent's sources
        const { data: existingChunks, error: searchError } = await supabase
          .from('source_chunks')
          .select(`
            id,
            source_id,
            agent_sources!inner(agent_id)
          `)
          .eq('content_hash', contentHash)
          .eq('agent_sources.agent_id', agentId)
          .eq('is_duplicate', false) // Only check against non-duplicate chunks
          .limit(1);

        if (searchError) {
          console.error('Error searching for duplicates:', searchError);
          uniqueChunks.push(chunk);
          continue;
        }

        if (existingChunks && existingChunks.length > 0) {
          // Found duplicate
          const originalChunk = existingChunks[0];
          duplicateChunks.push({
            ...chunk,
            duplicateOfChunkId: originalChunk.id
          });
          
          console.log(`🔄 Duplicate found: chunk from ${chunk.source_id} matches ${originalChunk.id}`);
        } else {
          // Unique chunk
          uniqueChunks.push(chunk);
        }
      }

      const stats = {
        totalProcessed: chunks.length,
        uniqueCount: uniqueChunks.length,
        duplicateCount: duplicateChunks.length,
        deduplicationRate: duplicateChunks.length / chunks.length
      };

      console.log(`✅ Deduplication complete: ${stats.uniqueCount} unique, ${stats.duplicateCount} duplicates (${(stats.deduplicationRate * 100).toFixed(1)}% dedup rate)`);

      return {
        uniqueChunks,
        duplicateChunks,
        stats
      };

    } catch (error) {
      console.error('Deduplication process failed:', error);
      throw error;
    }
  }

  // Get deduplication statistics for an agent
  static async getDeduplicationStats(agentId: string): Promise<{
    totalChunks: number;
    uniqueChunks: number;
    duplicateChunks: number;
    deduplicationRate: number;
    spaceSaved: number;
  }> {
    const { data: stats, error } = await supabase
      .from('source_chunks')
      .select(`
        id,
        is_duplicate,
        content,
        agent_sources!inner(agent_id)
      `)
      .eq('agent_sources.agent_id', agentId);

    if (error || !stats) {
      console.error('Error fetching deduplication stats:', error);
      return {
        totalChunks: 0,
        uniqueChunks: 0,
        duplicateChunks: 0,
        deduplicationRate: 0,
        spaceSaved: 0
      };
    }

    const totalChunks = stats.length;
    const duplicateChunks = stats.filter(chunk => chunk.is_duplicate).length;
    const uniqueChunks = totalChunks - duplicateChunks;
    const deduplicationRate = totalChunks > 0 ? duplicateChunks / totalChunks : 0;
    
    // Calculate approximate space saved (content length of duplicates)
    const spaceSaved = stats
      .filter(chunk => chunk.is_duplicate)
      .reduce((sum, chunk) => sum + (chunk.content?.length || 0), 0);

    return {
      totalChunks,
      uniqueChunks,
      duplicateChunks,
      deduplicationRate,
      spaceSaved
    };
  }

  // Cleanup orphaned chunks using the new maintenance function
  static async cleanupOrphanedChunks(): Promise<number> {
    console.log('🧹 Cleaning up orphaned chunks...');
    
    const { data: deletedCount, error } = await supabase
      .rpc('cleanup_orphaned_chunks');

    if (error) {
      console.error('Error cleaning up orphaned chunks:', error);
      return 0;
    }

    console.log(`✅ Cleaned up ${deletedCount} orphaned chunks`);
    return deletedCount;
  }
}
