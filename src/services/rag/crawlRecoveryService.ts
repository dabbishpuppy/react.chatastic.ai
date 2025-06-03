
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export class CrawlRecoveryService {
  // Trigger manual processing of stuck source pages
  static async triggerManualProcessing(): Promise<{ success: boolean; message: string; processedCount?: number }> {
    try {
      console.log('🔄 Triggering manual source page processing...');
      
      const { data, error } = await supabase.functions.invoke('process-source-pages');
      
      if (error) {
        console.error('❌ Manual processing failed:', error);
        throw error;
      }
      
      console.log('✅ Manual processing completed:', data);
      return {
        success: true,
        message: `Processing triggered successfully. Processed ${data?.processedCount || 0} pages.`,
        processedCount: data?.processedCount || 0
      };
    } catch (error) {
      console.error('Error triggering manual processing:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to trigger processing'
      };
    }
  }

  // Reset stuck parent source status
  static async resetStuckCrawlStatus(parentSourceId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔄 Resetting stuck crawl status for parent: ${parentSourceId}`);
      
      // Get current status
      const { data: currentSource, error: fetchError } = await supabase
        .from('agent_sources')
        .select('crawl_status, progress, total_jobs, completed_jobs')
        .eq('id', parentSourceId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Reset to in_progress if stuck in crawling state
      const { error: updateError } = await supabase
        .from('agent_sources')
        .update({
          crawl_status: 'in_progress',
          metadata: {
            ...currentSource.metadata,
            reset_at: new Date().toISOString(),
            reset_reason: 'Manual recovery from stuck state'
          }
        })
        .eq('id', parentSourceId);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Successfully reset crawl status');
      return {
        success: true,
        message: 'Crawl status reset successfully'
      };
    } catch (error) {
      console.error('Error resetting crawl status:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset status'
      };
    }
  }

  // Retry failed source pages
  static async retryFailedSourcePages(parentSourceId: string): Promise<{ success: boolean; message: string; retriedCount?: number }> {
    try {
      console.log(`🔄 Retrying failed source pages for parent: ${parentSourceId}`);
      
      // Get failed pages that haven't exceeded retry limit
      const { data: failedPages, error: fetchError } = await supabase
        .from('source_pages')
        .select('id, retry_count')
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'failed')
        .lt('retry_count', 3);

      if (fetchError) {
        throw fetchError;
      }

      if (!failedPages || failedPages.length === 0) {
        return {
          success: true,
          message: 'No failed pages found to retry',
          retriedCount: 0
        };
      }

      // Reset failed pages to pending
      const { error: updateError } = await supabase
        .from('source_pages')
        .update({
          status: 'pending',
          retry_count: supabase.sql`retry_count + 1`,
          error_message: null,
          started_at: null,
          completed_at: null
        })
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'failed')
        .lt('retry_count', 3);

      if (updateError) {
        throw updateError;
      }

      console.log(`✅ Successfully retried ${failedPages.length} failed pages`);
      return {
        success: true,
        message: `Successfully retried ${failedPages.length} failed pages`,
        retriedCount: failedPages.length
      };
    } catch (error) {
      console.error('Error retrying failed pages:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retry pages'
      };
    }
  }

  // Detect and recover stuck crawls
  static async detectAndRecoverStuckCrawls(agentId: string): Promise<{ success: boolean; message: string; recoveredCount?: number }> {
    try {
      console.log(`🔍 Detecting stuck crawls for agent: ${agentId}`);
      
      // Find parent sources that have been in crawling state for more than 10 minutes
      const stuckThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      
      const { data: stuckSources, error: fetchError } = await supabase
        .from('agent_sources')
        .select('id, title, url, updated_at')
        .eq('agent_id', agentId)
        .eq('source_type', 'website')
        .in('crawl_status', ['pending', 'in_progress'])
        .lt('updated_at', stuckThreshold.toISOString())
        .is('parent_source_id', null);

      if (fetchError) {
        throw fetchError;
      }

      if (!stuckSources || stuckSources.length === 0) {
        return {
          success: true,
          message: 'No stuck crawls detected',
          recoveredCount: 0
        };
      }

      let recoveredCount = 0;
      for (const source of stuckSources) {
        console.log(`🔧 Recovering stuck crawl: ${source.title} (${source.id})`);
        
        // Reset the stuck source
        const resetResult = await this.resetStuckCrawlStatus(source.id);
        if (resetResult.success) {
          recoveredCount++;
        }
      }

      // Trigger processing after recovery
      await this.triggerManualProcessing();

      return {
        success: true,
        message: `Recovered ${recoveredCount} stuck crawls and triggered processing`,
        recoveredCount
      };
    } catch (error) {
      console.error('Error detecting/recovering stuck crawls:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to recover stuck crawls'
      };
    }
  }

  // Complete recovery workflow
  static async performCompleteRecovery(parentSourceId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🚀 Starting complete recovery for parent: ${parentSourceId}`);
      
      // Step 1: Reset stuck status
      const resetResult = await this.resetStuckCrawlStatus(parentSourceId);
      if (!resetResult.success) {
        return resetResult;
      }

      // Step 2: Retry failed pages
      const retryResult = await this.retryFailedSourcePages(parentSourceId);
      if (!retryResult.success) {
        return retryResult;
      }

      // Step 3: Trigger manual processing
      const processResult = await this.triggerManualProcessing();
      if (!processResult.success) {
        return processResult;
      }

      const message = `Complete recovery successful: Status reset, ${retryResult.retriedCount || 0} pages retried, ${processResult.processedCount || 0} pages processed`;
      
      return {
        success: true,
        message
      };
    } catch (error) {
      console.error('Error in complete recovery:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Complete recovery failed'
      };
    }
  }
}
