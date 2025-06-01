
import { supabase } from "@/integrations/supabase/client";
import { CrawlStatus } from "./crawlTypes";
import { CrawlApiService } from "./crawlApi";

export class CrawlSubscriptionService {
  static subscribeToCrawlUpdates(
    parentSourceId: string,
    onUpdate: (status: CrawlStatus) => void
  ) {
    console.log(`📡 Setting up real-time subscription for ${parentSourceId}`);

    try {
      // Subscribe to crawl_jobs changes
      const jobsChannel = supabase
        .channel(`crawl-jobs-${parentSourceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crawl_jobs',
            filter: `parent_source_id=eq.${parentSourceId}`
          },
          async (payload) => {
            console.log('📡 Crawl job update:', payload);
            
            try {
              const status = await CrawlApiService.checkCrawlStatus(parentSourceId);
              onUpdate(status);
            } catch (error) {
              console.error('Error fetching updated status:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status:', status);
        });

      // Subscribe to agent_sources changes for parent status
      const sourceChannel = supabase
        .channel(`agent-source-${parentSourceId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'agent_sources',
            filter: `id=eq.${parentSourceId}`
          },
          async (payload) => {
            console.log('📡 Parent source update:', payload);
            
            try {
              const status = await CrawlApiService.checkCrawlStatus(parentSourceId);
              onUpdate(status);
            } catch (error) {
              console.error('Error fetching updated status:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Source subscription status:', status);
        });

      return () => {
        supabase.removeChannel(jobsChannel);
        supabase.removeChannel(sourceChannel);
      };
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
      return () => {}; // Return empty cleanup function
    }
  }
}
