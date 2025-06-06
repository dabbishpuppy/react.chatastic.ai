import { supabase } from "@/integrations/supabase/client";

export interface RecoveryResult {
  success: boolean;
  message: string;
  retriedCount?: number;
  timeoutCount?: number;
  details?: any;
}

export class CrawlRecoveryService {
  private static readonly PROCESSING_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 5000; // 5 seconds

  // Auto-retry failed pages with intelligent retry logic
  static async autoRetryFailedPages(parentSourceId: string): Promise<RecoveryResult> {
    try {
      console.log('🔄 Starting auto-retry for failed pages:', parentSourceId);

      // Step 1: Handle pages stuck in processing state (timeout recovery)
      const timeoutRecovery = await this.recoverTimeoutPages(parentSourceId);
      
      // Step 2: Retry genuinely failed pages
      const failureRecovery = await this.retryFailedPages(parentSourceId);
      
      // Step 3: Check for any remaining pending pages and ensure they get processed
      const pendingRecovery = await this.processPendingPages(parentSourceId);

      const totalRetried = (timeoutRecovery.retriedCount || 0) + 
                          (failureRecovery.retriedCount || 0) + 
                          (pendingRecovery.retriedCount || 0);

      if (totalRetried > 0) {
        return {
          success: true,
          message: `Successfully initiated retry for ${totalRetried} pages`,
          retriedCount: totalRetried,
          details: {
            timeoutRecovery: timeoutRecovery.retriedCount,
            failureRecovery: failureRecovery.retriedCount,
            pendingRecovery: pendingRecovery.retriedCount
          }
        };
      } else {
        return {
          success: true,
          message: "No pages needed retry - all processing completed",
          retriedCount: 0
        };
      }

    } catch (error) {
      console.error('❌ Auto-retry failed:', error);
      return {
        success: false,
        message: `Auto-retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retriedCount: 0
      };
    }
  }

  // Recover pages stuck in "processing" state due to timeouts
  private static async recoverTimeoutPages(parentSourceId: string): Promise<RecoveryResult> {
    try {
      const timeoutThreshold = new Date(Date.now() - this.PROCESSING_TIMEOUT).toISOString();
      
      const { data: timeoutPages, error } = await supabase
        .from('source_pages')
        .select('id, url, started_at')
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'processing')
        .lt('started_at', timeoutThreshold);

      if (error) {
        throw new Error(`Failed to find timeout pages: ${error.message}`);
      }

      if (!timeoutPages || timeoutPages.length === 0) {
        return { success: true, message: "No timeout pages found", retriedCount: 0 };
      }

      console.log(`🕐 Found ${timeoutPages.length} pages stuck in processing state`);

      // Get current retry counts for these pages
      const { data: currentRetries, error: retryError } = await supabase
        .from('source_pages')
        .select('id, retry_count')
        .in('id', timeoutPages.map(p => p.id));

      if (retryError) {
        throw new Error(`Failed to get retry counts: ${retryError.message}`);
      }

      // Filter pages that haven't exceeded max retries and update them individually
      let updatedCount = 0;
      for (const page of timeoutPages) {
        const currentPage = currentRetries?.find(r => r.id === page.id);
        const currentRetryCount = currentPage?.retry_count || 0;

        if (currentRetryCount < this.MAX_RETRIES) {
          const { error: updateError } = await supabase
            .from('source_pages')
            .update({
              status: 'pending',
              started_at: null,
              error_message: 'Recovered from timeout - retrying',
              retry_count: currentRetryCount + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', page.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      }

      return {
        success: true,
        message: `Recovered ${updatedCount} timeout pages`,
        retriedCount: updatedCount
      };

    } catch (error) {
      console.error('❌ Timeout recovery failed:', error);
      return {
        success: false,
        message: `Timeout recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retriedCount: 0
      };
    }
  }

  // Retry pages that explicitly failed
  private static async retryFailedPages(parentSourceId: string): Promise<RecoveryResult> {
    try {
      const { data: failedPages, error } = await supabase
        .from('source_pages')
        .select('id, url, retry_count, error_message')
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'failed')
        .lt('retry_count', this.MAX_RETRIES);

      if (error) {
        throw new Error(`Failed to find failed pages: ${error.message}`);
      }

      if (!failedPages || failedPages.length === 0) {
        return { success: true, message: "No retryable failed pages found", retriedCount: 0 };
      }

      console.log(`🔁 Found ${failedPages.length} failed pages to retry`);

      // Filter out pages that failed due to 409 conflicts (these are often recoverable)
      const retryablePages = failedPages.filter(page => 
        !page.error_message?.includes('409') || 
        !page.error_message?.includes('already processing')
      );

      if (retryablePages.length === 0) {
        return { success: true, message: "No retryable pages (all were 409 conflicts)", retriedCount: 0 };
      }

      // Update failed pages to pending for retry individually
      let updatedCount = 0;
      for (const page of retryablePages) {
        const { error: updateError } = await supabase
          .from('source_pages')
          .update({
            status: 'pending',
            started_at: null,
            completed_at: null,
            error_message: null,
            retry_count: (page.retry_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', page.id);

        if (!updateError) {
          updatedCount++;
        }
      }

      return {
        success: true,
        message: `Retrying ${updatedCount} failed pages`,
        retriedCount: updatedCount
      };

    } catch (error) {
      console.error('❌ Failed page retry failed:', error);
      return {
        success: false,
        message: `Failed page retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retriedCount: 0
      };
    }
  }

  // Ensure pending pages get processed
  private static async processPendingPages(parentSourceId: string): Promise<RecoveryResult> {
    try {
      const { data: pendingPages, error } = await supabase
        .from('source_pages')
        .select('id, url')
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'pending');

      if (error) {
        throw new Error(`Failed to find pending pages: ${error.message}`);
      }

      if (!pendingPages || pendingPages.length === 0) {
        return { success: true, message: "No pending pages found", retriedCount: 0 };
      }

      console.log(`⏳ Found ${pendingPages.length} pending pages - triggering processing`);

      // Trigger processing for pending pages by calling the edge function
      try {
        const { data, error: processingError } = await supabase.functions.invoke('process-source-pages', {
          body: { parentSourceId }
        });

        // Handle 409 conflicts as success (processing already in progress)
        if (processingError && (processingError.message?.includes('409') || processingError.status === 409)) {
          console.log('✅ Processing already in progress - this is expected');
          return {
            success: true,
            message: `Processing triggered for ${pendingPages.length} pending pages`,
            retriedCount: pendingPages.length
          };
        }

        if (processingError) {
          console.warn('⚠️ Processing trigger warning:', processingError);
          // Don't throw - this might be expected behavior
        }

      } catch (functionError) {
        console.warn('⚠️ Function invocation warning:', functionError);
        // Don't fail the entire recovery for this
      }

      return {
        success: true,
        message: `Triggered processing for ${pendingPages.length} pending pages`,
        retriedCount: pendingPages.length
      };

    } catch (error) {
      console.error('❌ Pending page processing failed:', error);
      return {
        success: false,
        message: `Pending page processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retriedCount: 0
      };
    }
  }

  // Get comprehensive recovery status
  static async getRecoveryStatus(parentSourceId: string): Promise<{
    totalPages: number;
    completedPages: number;
    failedPages: number;
    pendingPages: number;
    processingPages: number;
    timeoutPages: number;
    retryablePages: number;
    needsRecovery: boolean;
  }> {
    try {
      const { data: pages, error } = await supabase
        .from('source_pages')
        .select('id, status, started_at, retry_count, error_message')
        .eq('parent_source_id', parentSourceId);

      if (error || !pages) {
        throw new Error(`Failed to get recovery status: ${error?.message}`);
      }

      const now = Date.now();
      const timeoutThreshold = now - this.PROCESSING_TIMEOUT;

      const stats = {
        totalPages: pages.length,
        completedPages: pages.filter(p => p.status === 'completed').length,
        failedPages: pages.filter(p => p.status === 'failed').length,
        pendingPages: pages.filter(p => p.status === 'pending').length,
        processingPages: pages.filter(p => p.status === 'processing').length,
        timeoutPages: pages.filter(p => 
          p.status === 'processing' && 
          p.started_at && 
          new Date(p.started_at).getTime() < timeoutThreshold
        ).length,
        retryablePages: pages.filter(p => 
          p.status === 'failed' && 
          (p.retry_count || 0) < this.MAX_RETRIES
        ).length,
        needsRecovery: false
      };

      // Determine if recovery is needed
      stats.needsRecovery = stats.timeoutPages > 0 || 
                          stats.retryablePages > 0 || 
                          (stats.pendingPages > 0 && stats.processingPages === 0);

      return stats;

    } catch (error) {
      console.error('❌ Failed to get recovery status:', error);
      return {
        totalPages: 0,
        completedPages: 0,
        failedPages: 0,
        pendingPages: 0,
        processingPages: 0,
        timeoutPages: 0,
        retryablePages: 0,
        needsRecovery: false
      };
    }
  }

  // Manual recovery trigger
  static async manualRecovery(parentSourceId: string): Promise<RecoveryResult> {
    console.log('🛠️ Starting manual recovery for:', parentSourceId);
    
    const status = await this.getRecoveryStatus(parentSourceId);
    
    if (!status.needsRecovery) {
      return {
        success: true,
        message: "No recovery needed - all pages processed successfully",
        retriedCount: 0
      };
    }

    return await this.autoRetryFailedPages(parentSourceId);
  }
}
