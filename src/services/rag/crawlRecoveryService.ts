
import { supabase } from "@/integrations/supabase/client";

export class CrawlRecoveryService {
  // Automatically detect and recover stuck crawls without user intervention
  static async autoRecoverStuckCrawls(agentId: string): Promise<{ success: boolean; message: string; recoveredCount?: number }> {
    try {
      console.log(`🔍 Auto-detecting stuck crawls for agent: ${agentId}`);
      
      // Find parent sources that have been stuck for more than 5 minutes
      const stuckThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      
      const { data: stuckSources, error: fetchError } = await supabase
        .from('agent_sources')
        .select('id, title, url, updated_at, crawl_status')
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
          message: 'All crawls are running normally',
          recoveredCount: 0
        };
      }

      let recoveredCount = 0;
      for (const source of stuckSources) {
        console.log(`🔧 Auto-recovering stuck crawl: ${source.title} (${source.id})`);
        
        // Reset the stuck source status
        const { error: resetError } = await supabase
          .from('agent_sources')
          .update({
            crawl_status: 'in_progress',
            metadata: {
              auto_recovered_at: new Date().toISOString(),
              recovery_reason: 'Automatic recovery from stuck state'
            }
          })
          .eq('id', source.id);

        if (!resetError) {
          recoveredCount++;
        }
      }

      // Automatically trigger processing after recovery
      await this.autoTriggerProcessing();

      return {
        success: true,
        message: `Auto-recovered ${recoveredCount} stuck crawls and resumed processing`,
        recoveredCount
      };
    } catch (error) {
      console.error('Error in auto-recovery:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Auto-recovery failed'
      };
    }
  }

  // Automatically retry failed source pages
  static async autoRetryFailedPages(parentSourceId: string): Promise<{ success: boolean; message: string; retriedCount?: number }> {
    try {
      console.log(`🔄 Auto-retrying failed pages for parent: ${parentSourceId}`);
      
      // Get failed pages that haven't exceeded retry limit (max 2 retries)
      const { data: failedPages, error: fetchError } = await supabase
        .from('source_pages')
        .select('id, retry_count')
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'failed')
        .lt('retry_count', 2);

      if (fetchError) {
        throw fetchError;
      }

      if (!failedPages || failedPages.length === 0) {
        return {
          success: true,
          message: 'No failed pages to retry',
          retriedCount: 0
        };
      }

      // Reset failed pages to pending with incremented retry count
      for (const page of failedPages) {
        const { error: updateError } = await supabase
          .from('source_pages')
          .update({
            status: 'pending',
            retry_count: page.retry_count + 1,
            error_message: null,
            started_at: null,
            completed_at: null
          })
          .eq('id', page.id);

        if (updateError) {
          console.error(`Error updating page ${page.id}:`, updateError);
        }
      }

      console.log(`✅ Auto-retried ${failedPages.length} failed pages`);
      return {
        success: true,
        message: `Auto-retried ${failedPages.length} failed pages`,
        retriedCount: failedPages.length
      };
    } catch (error) {
      console.error('Error auto-retrying failed pages:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to auto-retry pages'
      };
    }
  }

  // Automatically trigger processing without user intervention
  static async autoTriggerProcessing(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Auto-triggering source page processing...');
      
      const { data, error } = await supabase.functions.invoke('process-source-pages');
      
      if (error) {
        console.error('❌ Auto-processing failed:', error);
        throw error;
      }
      
      console.log('✅ Auto-processing triggered successfully:', data);
      return {
        success: true,
        message: `Auto-processing started successfully. Processing ${data?.processedCount || 0} pages.`
      };
    } catch (error) {
      console.error('Error in auto-processing:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Auto-processing failed'
      };
    }
  }

  // Complete automatic recovery workflow
  static async performAutoRecovery(parentSourceId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🚀 Starting automatic recovery for parent: ${parentSourceId}`);
      
      // Step 1: Auto-retry failed pages
      const retryResult = await this.autoRetryFailedPages(parentSourceId);
      
      // Step 2: Auto-trigger processing
      const processResult = await this.autoTriggerProcessing();
      
      const message = `Automatic recovery completed: ${retryResult.retriedCount || 0} pages retried, ${processResult.success ? 'processing resumed' : 'processing had issues'}`;
      
      return {
        success: retryResult.success && processResult.success,
        message
      };
    } catch (error) {
      console.error('Error in automatic recovery:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Automatic recovery failed'
      };
    }
  }
}
