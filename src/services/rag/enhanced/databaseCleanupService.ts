
import { supabase } from "@/integrations/supabase/client";

export class DatabaseCleanupService {
  /**
   * Find and report orphaned source pages
   */
  static async findOrphanedSourcePages(): Promise<{
    orphanedPages: Array<{ id: string; parent_source_id: string; url: string }>;
    count: number;
  }> {
    try {
      console.log('🔍 Checking for orphaned source pages...');
      
      const { data: orphanedPages, error } = await supabase
        .from('source_pages')
        .select('id, parent_source_id, url')
        .not('parent_source_id', 'in', 
          supabase
            .from('agent_sources')
            .select('id')
        );

      if (error) {
        console.error('Error finding orphaned pages:', error);
        throw error;
      }

      console.log(`Found ${orphanedPages?.length || 0} orphaned source pages`);
      return {
        orphanedPages: orphanedPages || [],
        count: orphanedPages?.length || 0
      };
    } catch (error) {
      console.error('Failed to find orphaned source pages:', error);
      return { orphanedPages: [], count: 0 };
    }
  }

  /**
   * Clean up orphaned source pages
   */
  static async cleanupOrphanedSourcePages(): Promise<{ cleaned: number; errors: string[] }> {
    try {
      console.log('🧹 Starting cleanup of orphaned source pages...');
      
      const { orphanedPages } = await this.findOrphanedSourcePages();
      
      if (orphanedPages.length === 0) {
        console.log('✅ No orphaned pages found');
        return { cleaned: 0, errors: [] };
      }

      const errors: string[] = [];
      let cleaned = 0;

      // Clean up in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < orphanedPages.length; i += batchSize) {
        const batch = orphanedPages.slice(i, i + batchSize);
        const pageIds = batch.map(page => page.id);

        try {
          const { error } = await supabase
            .from('source_pages')
            .delete()
            .in('id', pageIds);

          if (error) {
            errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          } else {
            cleaned += batch.length;
            console.log(`✅ Cleaned batch of ${batch.length} orphaned pages`);
          }
        } catch (batchError) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${batchError}`);
        }
      }

      console.log(`🎯 Cleanup complete: ${cleaned} pages cleaned, ${errors.length} errors`);
      return { cleaned, errors };
    } catch (error) {
      console.error('Failed to cleanup orphaned source pages:', error);
      return { cleaned: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  /**
   * Validate parent source exists
   */
  static async validateParentSource(parentSourceId: string): Promise<boolean> {
    try {
      if (!parentSourceId || parentSourceId === 'undefined' || parentSourceId === 'null') {
        return false;
      }

      const { data, error } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('id', parentSourceId)
        .maybeSingle();

      if (error) {
        console.error('Error validating parent source:', error);
        return false;
      }

      return data !== null;
    } catch (error) {
      console.error('Failed to validate parent source:', error);
      return false;
    }
  }

  /**
   * Get database health metrics
   */
  static async getDatabaseHealth(): Promise<{
    orphanedPages: number;
    invalidSources: number;
    totalPages: number;
    totalSources: number;
  }> {
    try {
      const [orphanedResult, totalPagesResult, totalSourcesResult] = await Promise.allSettled([
        this.findOrphanedSourcePages(),
        supabase.from('source_pages').select('*', { count: 'exact', head: true }),
        supabase.from('agent_sources').select('*', { count: 'exact', head: true })
      ]);

      const orphanedPages = orphanedResult.status === 'fulfilled' ? orphanedResult.value.count : 0;
      const totalPages = totalPagesResult.status === 'fulfilled' ? (totalPagesResult.value.count || 0) : 0;
      const totalSources = totalSourcesResult.status === 'fulfilled' ? (totalSourcesResult.value.count || 0) : 0;

      return {
        orphanedPages,
        invalidSources: 0, // Will implement if needed
        totalPages,
        totalSources
      };
    } catch (error) {
      console.error('Failed to get database health:', error);
      return {
        orphanedPages: 0,
        invalidSources: 0,
        totalPages: 0,
        totalSources: 0
      };
    }
  }
}
