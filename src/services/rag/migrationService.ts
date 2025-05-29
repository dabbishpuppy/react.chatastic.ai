
import { supabase } from "@/integrations/supabase/client";

interface MigrationProgress {
  table_name: string;
  total_rows: number;
  migrated_rows: number;
  completion_percentage: number;
}

interface CompressionStats {
  avg_compression_ratio: number;
  total_original_size: number;
  total_compressed_size: number;
  space_saved_percentage: number;
}

export class MigrationService {
  // Run safe migration backfill for existing data
  static async runSafeMigrationBackfill(batchSize: number = 500): Promise<{
    processed_sources: number;
    processed_chunks: number;
    timestamp: string;
  }> {
    console.log(`🔄 Starting safe migration backfill (batch size: ${batchSize})...`);
    
    const { data: result, error } = await supabase
      .rpc('safe_migration_backfill', { batch_size: batchSize });

    if (error) {
      console.error('Migration backfill error:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }

    console.log(`✅ Migration backfill completed:`, result);
    return result;
  }

  // Get migration progress for monitoring
  static async getMigrationProgress(): Promise<MigrationProgress[]> {
    const { data: progress, error } = await supabase
      .from('migration_progress')
      .select('*');

    if (error) {
      console.error('Error fetching migration progress:', error);
      return [];
    }

    return progress || [];
  }

  // Get compression statistics
  static async getCompressionStats(): Promise<CompressionStats | null> {
    const { data: stats, error } = await supabase
      .rpc('get_compression_stats');

    if (error) {
      console.error('Error fetching compression stats:', error);
      return null;
    }

    return stats?.[0] || null;
  }

  // Bulk populate content hashes for chunks
  static async bulkPopulateContentHashes(batchSize: number = 1000): Promise<number> {
    console.log(`🔄 Starting bulk content hash population (batch size: ${batchSize})...`);
    
    const { data: processedCount, error } = await supabase
      .rpc('bulk_populate_content_hashes', { batch_size: batchSize });

    if (error) {
      console.error('Bulk hash population error:', error);
      throw new Error(`Hash population failed: ${error.message}`);
    }

    console.log(`✅ Processed ${processedCount} chunks for content hash population`);
    return processedCount;
  }

  // Monitor system health and performance
  static async getSystemHealth(): Promise<{
    migrationProgress: MigrationProgress[];
    compressionStats: CompressionStats | null;
    orphanedChunks: number;
  }> {
    console.log('📊 Gathering system health metrics...');
    
    const [migrationProgress, compressionStats] = await Promise.all([
      this.getMigrationProgress(),
      this.getCompressionStats()
    ]);

    // Check for orphaned chunks
    const { data: orphanedCount, error: orphanError } = await supabase
      .rpc('cleanup_orphaned_chunks');

    const orphanedChunks = orphanError ? 0 : orphanedCount;

    return {
      migrationProgress,
      compressionStats,
      orphanedChunks
    };
  }

  // Run full system optimization
  static async runSystemOptimization(): Promise<{
    migrationResult: any;
    hashesProcessed: number;
    orphanedCleaned: number;
    compressionStats: CompressionStats | null;
  }> {
    console.log('🚀 Running full system optimization...');
    
    try {
      // Step 1: Run migration backfill
      const migrationResult = await this.runSafeMigrationBackfill(1000);
      
      // Step 2: Populate content hashes
      const hashesProcessed = await this.bulkPopulateContentHashes(2000);
      
      // Step 3: Cleanup orphaned chunks
      const { data: orphanedCleaned, error: cleanupError } = await supabase
        .rpc('cleanup_orphaned_chunks');
      
      if (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      
      // Step 4: Get final compression stats
      const compressionStats = await this.getCompressionStats();
      
      console.log('✅ System optimization completed successfully');
      
      return {
        migrationResult,
        hashesProcessed,
        orphanedCleaned: orphanedCleaned || 0,
        compressionStats
      };
      
    } catch (error) {
      console.error('System optimization failed:', error);
      throw error;
    }
  }
}
