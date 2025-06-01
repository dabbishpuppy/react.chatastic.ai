
import { CompressionStats } from "./crawlTypes";

export class CompressionAnalyticsService {
  private static readonly supabaseUrl = 'https://lndfjlkzvxbnoxfuboxz.supabase.co';
  private static readonly apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZGZqbGt6dnhibm94ZnVib3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTM1MjQsImV4cCI6MjA2MzA2OTUyNH0.81qrGi1n9MpVIGNeJ8oPjyaUbuCKKKXfZXVuF90azFk';

  static async getCompressionStats(customerId: string): Promise<CompressionStats> {
    try {
      const url = `${this.supabaseUrl}/rest/v1/agent_sources?customer_id=eq.${customerId}&source_type=eq.website&select=total_content_size,compressed_content_size,unique_chunks,duplicate_chunks,global_compression_ratio`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Error fetching compression stats:', response.statusText);
        return this.getDefaultStats();
      }

      const sources = await response.json();
      return this.calculateStats(sources);
    } catch (error) {
      console.error('Error in getCompressionStats:', error);
      return this.getDefaultStats();
    }
  }

  private static getDefaultStats(): CompressionStats {
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

  private static calculateStats(sources: any[]): CompressionStats {
    const totalOriginalSize = sources.reduce((sum: number, source: any) => sum + (source.total_content_size || 0), 0);
    const totalCompressedSize = sources.reduce((sum: number, source: any) => sum + (source.compressed_content_size || 0), 0);
    const totalUniqueChunks = sources.reduce((sum: number, source: any) => sum + (source.unique_chunks || 0), 0);
    const totalDuplicateChunks = sources.reduce((sum: number, source: any) => sum + (source.duplicate_chunks || 0), 0);
    const avgCompressionRatio = sources.length 
      ? sources.reduce((sum: number, source: any) => sum + (source.global_compression_ratio || 0), 0) / sources.length 
      : 0;

    return {
      totalOriginalSize,
      totalCompressedSize,
      totalUniqueChunks,
      totalDuplicateChunks,
      avgCompressionRatio,
      spaceSavedBytes: totalOriginalSize - totalCompressedSize,
      spaceSavedPercentage: totalOriginalSize > 0 ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100 : 0
    };
  }
}
