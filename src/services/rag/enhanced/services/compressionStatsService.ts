
import { supabase } from "@/integrations/supabase/client";
import { CompressionStats } from '../types/compressionTypes';

export class CompressionStatsService {
  // Get compression statistics and recommendations
  static async getCompressionStats(agentId: string): Promise<CompressionStats> {
    try {
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('original_size, compressed_size, compression_ratio, source_type')
        .eq('agent_id', agentId)
        .not('original_size', 'is', null)
        .not('compressed_size', 'is', null);
      
      if (error || !sources) {
        return {
          totalOriginalSize: 0,
          totalCompressedSize: 0,
          averageCompressionRatio: 0,
          spaceSaved: 0,
          recommendations: ['No compression data available']
        };
      }
      
      const totalOriginalSize = sources.reduce((sum, s) => sum + (s.original_size || 0), 0);
      const totalCompressedSize = sources.reduce((sum, s) => sum + (s.compressed_size || 0), 0);
      const averageCompressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 0;
      const spaceSaved = totalOriginalSize - totalCompressedSize;
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      if (averageCompressionRatio > 0.7) {
        recommendations.push('Consider using summary mode for informational pages');
      }
      
      if (averageCompressionRatio > 0.5) {
        recommendations.push('Implement advanced deduplication for better compression');
      }
      
      const websiteSources = sources.filter(s => s.source_type === 'website');
      if (websiteSources.length > 10) {
        recommendations.push('Use template detection for repetitive website content');
      }
      
      return {
        totalOriginalSize,
        totalCompressedSize,
        averageCompressionRatio,
        spaceSaved,
        recommendations
      };
      
    } catch (error) {
      console.error('Error getting compression stats:', error);
      return {
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageCompressionRatio: 0,
        spaceSaved: 0,
        recommendations: ['Error retrieving compression statistics']
      };
    }
  }
}
