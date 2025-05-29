
import { supabase } from "@/integrations/supabase/client";
import { SourceChunk } from "@/types/rag";

interface DeduplicationResult {
  isDuplicate: boolean;
  duplicateOfChunkId?: string;
  similarity?: number;
}

interface DeduplicationStats {
  totalChunks: number;
  duplicatesFound: number;
  uniqueChunks: number;
  deduplicationRate: number;
}

export class DeduplicationService {
  // Check if a chunk is a duplicate based on content hash
  static async checkChunkDuplicate(
    content: string,
    agentId: string,
    excludeSourceId?: string
  ): Promise<DeduplicationResult> {
    try {
      // Calculate content hash
      const contentHash = await this.calculateContentHash(content);

      // Query for existing chunks with the same hash
      let query = supabase
        .from('source_chunks')
        .select(`
          id,
          source_id,
          agent_sources!inner(agent_id)
        `)
        .eq('content_hash', contentHash)
        .eq('agent_sources.agent_id', agentId)
        .eq('is_duplicate', false);

      if (excludeSourceId) {
        query = query.neq('source_id', excludeSourceId);
      }

      const { data: existingChunks, error } = await query;

      if (error) {
        console.error('Error checking for duplicates:', error);
        return { isDuplicate: false };
      }

      if (existingChunks && existingChunks.length > 0) {
        return {
          isDuplicate: true,
          duplicateOfChunkId: existingChunks[0].id,
          similarity: 1.0 // Exact match based on hash
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error in duplicate check:', error);
      return { isDuplicate: false };
    }
  }

  // Process chunks for deduplication during bulk insert
  static async processChunksForDeduplication(
    chunks: Array<{
      source_id: string;
      chunk_index: number;
      content: string;
      token_count: number;
      metadata?: Record<string, any>;
    }>,
    agentId: string
  ): Promise<{
    uniqueChunks: typeof chunks;
    duplicateChunks: typeof chunks;
    stats: DeduplicationStats;
  }> {
    const uniqueChunks: typeof chunks = [];
    const duplicateChunks: typeof chunks = [];
    const processedHashes = new Set<string>();

    for (const chunk of chunks) {
      const contentHash = await this.calculateContentHash(chunk.content);

      // Check if we've already processed this hash in this batch
      if (processedHashes.has(contentHash)) {
        duplicateChunks.push(chunk);
        continue;
      }

      // Check against existing chunks in database
      const duplicateResult = await this.checkChunkDuplicate(
        chunk.content,
        agentId,
        chunk.source_id
      );

      if (duplicateResult.isDuplicate) {
        duplicateChunks.push(chunk);
      } else {
        uniqueChunks.push(chunk);
        processedHashes.add(contentHash);
      }
    }

    const stats: DeduplicationStats = {
      totalChunks: chunks.length,
      duplicatesFound: duplicateChunks.length,
      uniqueChunks: uniqueChunks.length,
      deduplicationRate: duplicateChunks.length / chunks.length
    };

    return { uniqueChunks, duplicateChunks, stats };
  }

  // Calculate SHA-256 hash of content
  private static async calculateContentHash(content: string): Promise<string> {
    // Normalize content for consistent hashing
    const normalizedContent = content
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    // Use SubtleCrypto for hash calculation
    const encoder = new TextEncoder();
    const data = encoder.encode(normalizedContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }

  // Mark chunks as duplicates in the database
  static async markChunksAsDuplicates(
    chunkIds: string[],
    duplicateOfChunkId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('source_chunks')
        .update({
          is_duplicate: true,
          duplicate_of_chunk_id: duplicateOfChunkId
        })
        .in('id', chunkIds);

      if (error) {
        console.error('Error marking chunks as duplicates:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markChunksAsDuplicates:', error);
      return false;
    }
  }

  // Get deduplication statistics for an agent
  static async getDeduplicationStats(agentId: string): Promise<DeduplicationStats> {
    try {
      const { data: totalChunks, error: totalError } = await supabase
        .from('source_chunks')
        .select('count', { count: 'exact' })
        .eq('agent_sources.agent_id', agentId);

      const { data: duplicateChunks, error: duplicateError } = await supabase
        .from('source_chunks')
        .select('count', { count: 'exact' })
        .eq('agent_sources.agent_id', agentId)
        .eq('is_duplicate', true);

      if (totalError || duplicateError) {
        console.error('Error getting deduplication stats:', totalError || duplicateError);
        return {
          totalChunks: 0,
          duplicatesFound: 0,
          uniqueChunks: 0,
          deduplicationRate: 0
        };
      }

      const total = (totalChunks as any)?.[0]?.count || 0;
      const duplicates = (duplicateChunks as any)?.[0]?.count || 0;
      const unique = total - duplicates;

      return {
        totalChunks: total,
        duplicatesFound: duplicates,
        uniqueChunks: unique,
        deduplicationRate: total > 0 ? duplicates / total : 0
      };
    } catch (error) {
      console.error('Error in getDeduplicationStats:', error);
      return {
        totalChunks: 0,
        duplicatesFound: 0,
        uniqueChunks: 0,
        deduplicationRate: 0
      };
    }
  }

  // Clean up orphaned duplicate references
  static async cleanupOrphanedDuplicates(): Promise<number> {
    try {
      // Find chunks marked as duplicates but their reference doesn't exist
      const { data: orphanedChunks, error: findError } = await supabase
        .from('source_chunks')
        .select('id')
        .eq('is_duplicate', true)
        .not('duplicate_of_chunk_id', 'is', null)
        .not('duplicate_of_chunk_id', 'in', 
          `(SELECT id FROM source_chunks WHERE is_duplicate = false)`
        );

      if (findError) {
        console.error('Error finding orphaned duplicates:', findError);
        return 0;
      }

      if (!orphanedChunks || orphanedChunks.length === 0) {
        return 0;
      }

      // Reset orphaned chunks to non-duplicate status
      const { error: updateError } = await supabase
        .from('source_chunks')
        .update({
          is_duplicate: false,
          duplicate_of_chunk_id: null
        })
        .in('id', orphanedChunks.map(chunk => chunk.id));

      if (updateError) {
        console.error('Error cleaning up orphaned duplicates:', updateError);
        return 0;
      }

      return orphanedChunks.length;
    } catch (error) {
      console.error('Error in cleanupOrphanedDuplicates:', error);
      return 0;
    }
  }
}
