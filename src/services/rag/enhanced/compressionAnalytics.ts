
import { supabase } from "@/integrations/supabase/client";
import { CompressionStats } from "./crawlTypes";

export class CompressionAnalyticsService {
  static async getCompressionStats(customerId: string): Promise<CompressionStats> {
    try {
      // Get overall compression statistics for the customer
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select(`
          total_content_size,
          compressed_content_size,
          unique_chunks,
          duplicate_chunks,
          global_compression_ratio
        `)
        .eq('team_id', customerId)
        .eq('source_type', 'website')
        .not('total_content_size', 'is', null);

      if (error) throw error;

      if (!sources || sources.length === 0) {
        return {
          totalOriginalSize: 0,
          totalCompressedSize: 0,
          totalUniqueChunks: 0,
          totalDuplicateChunks: 0,
          avgCompressionRatio: 0,
          spaceSavedBytes: 0,
          spaceSavedPercentage: 0
        };
      }

      const totalOriginalSize = sources.reduce((sum, s) => sum + (s.total_content_size || 0), 0);
      const totalCompressedSize = sources.reduce((sum, s) => sum + (s.compressed_content_size || 0), 0);
      const totalUniqueChunks = sources.reduce((sum, s) => sum + (s.unique_chunks || 0), 0);
      const totalDuplicateChunks = sources.reduce((sum, s) => sum + (s.duplicate_chunks || 0), 0);
      
      const avgCompressionRatio = sources.length > 0 
        ? sources.reduce((sum, s) => sum + (s.global_compression_ratio || 0), 0) / sources.length
        : 0;

      const spaceSavedBytes = totalOriginalSize - totalCompressedSize;
      const spaceSavedPercentage = totalOriginalSize > 0 
        ? (spaceSavedBytes / totalOriginalSize) * 100 
        : 0;

      return {
        totalOriginalSize,
        totalCompressedSize,
        totalUniqueChunks,
        totalDuplicateChunks,
        avgCompressionRatio,
        spaceSavedBytes,
        spaceSavedPercentage
      };
    } catch (error) {
      console.error('Error getting compression stats:', error);
      return {
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        totalUniqueChunks: 0,
        totalDuplicateChunks: 0,
        avgCompressionRatio: 0,
        spaceSavedBytes: 0,
        spaceSavedPercentage: 0
      };
    }
  }

  static async getGlobalDeduplicationStats(): Promise<{
    totalChunks: number;
    uniqueChunks: number;
    duplicateChunks: number;
    deduplicationRatio: number;
  }> {
    try {
      const { data: chunkStats, error } = await supabase
        .from('semantic_chunks')
        .select('ref_count');

      if (error) throw error;

      const totalChunks = chunkStats?.reduce((sum, chunk) => sum + chunk.ref_count, 0) || 0;
      const uniqueChunks = chunkStats?.length || 0;
      const duplicateChunks = totalChunks - uniqueChunks;
      const deduplicationRatio = totalChunks > 0 ? (duplicateChunks / totalChunks) * 100 : 0;

      return {
        totalChunks,
        uniqueChunks,
        duplicateChunks,
        deduplicationRatio
      };
    } catch (error) {
      console.error('Error getting global deduplication stats:', error);
      return {
        totalChunks: 0,
        uniqueChunks: 0,
        duplicateChunks: 0,
        deduplicationRatio: 0
      };
    }
  }
}
