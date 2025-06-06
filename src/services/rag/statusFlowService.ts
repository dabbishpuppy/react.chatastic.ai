import { supabase } from "@/integrations/supabase/client";

export class StatusFlowService {
  // Monitor and update status flow for website sources
  static async checkAndUpdateSourceStatus(sourceId: string): Promise<void> {
    try {
      const { data: source, error } = await supabase
        .from('agent_sources')
        .select('id, crawl_status, total_jobs, completed_jobs, failed_jobs')
        .eq('id', sourceId)
        .single();

      if (error || !source) {
        console.error('Error fetching source for status update:', error);
        return;
      }

      // Check if all child pages are completed
      const { data: childPages, error: childError } = await supabase
        .from('source_pages')
        .select('status')
        .eq('parent_source_id', sourceId);

      if (childError) {
        console.error('Error fetching child pages:', childError);
        return;
      }

      const totalPages = childPages?.length || 0;
      const completedPages = childPages?.filter(p => p.status === 'completed').length || 0;
      const failedPages = childPages?.filter(p => p.status === 'failed').length || 0;

      console.log(`📊 Status check for ${sourceId}: ${completedPages}/${totalPages} completed, ${failedPages} failed`);

      // Determine new status based on progress
      let newStatus = source.crawl_status;

      if (totalPages === 0) {
        // No pages discovered yet, keep current status
        return;
      }

      if (completedPages + failedPages === totalPages) {
        // All pages processed
        if (completedPages > 0) {
          newStatus = 'crawled'; // Ready for training
        } else {
          newStatus = 'failed'; // All pages failed
        }
      } else if (completedPages > 0 || failedPages > 0) {
        // Some pages processed, still in progress
        newStatus = 'in_progress';
      }

      // Only update if status has changed
      if (newStatus !== source.crawl_status) {
        await this.updateSourceStatus(sourceId, newStatus, {
          completed_jobs: completedPages,
          failed_jobs: failedPages,
          total_jobs: totalPages,
          progress: Math.round(((completedPages + failedPages) / totalPages) * 100)
        });

        console.log(`✅ Updated source ${sourceId} status: ${source.crawl_status} → ${newStatus}`);
      }

    } catch (error) {
      console.error('Error in status flow check:', error);
    }
  }

  private static async updateSourceStatus(
    sourceId: string, 
    status: string, 
    additionalData: Record<string, any> = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('agent_sources')
      .update({
        crawl_status: status,
        updated_at: new Date().toISOString(),
        ...additionalData
      })
      .eq('id', sourceId);

    if (error) {
      console.error('Error updating source status:', error);
    }
  }

  // Set up real-time monitoring for status changes
  static setupStatusMonitoring(agentId: string): (() => void) {
    console.log(`📡 Setting up status monitoring for agent: ${agentId}`);

    const channel = supabase
      .channel(`status-flow-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_pages'
        },
        async (payload) => {
          const updatedPage = payload.new as any;
          if (updatedPage.parent_source_id) {
            // Check parent source status when child page updates
            await this.checkAndUpdateSourceStatus(updatedPage.parent_source_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
