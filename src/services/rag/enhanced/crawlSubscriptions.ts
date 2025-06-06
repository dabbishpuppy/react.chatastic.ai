
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
      // Subscribe to source_pages changes (correct table)
      const pagesChannel = supabase
        .channel(`source-pages-${parentSourceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'source_pages',
            filter: `parent_source_id=eq.${parentSourceId}`
          },
          async (payload) => {
            console.log('📡 Source page update:', payload);
            
            try {
              const status = await CrawlApiService.checkCrawlStatus(parentSourceId);
              onUpdate(status);
            } catch (error) {
              console.error('Error fetching updated status:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Pages subscription status:', status);
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
        supabase.removeChannel(pagesChannel);
        supabase.removeChannel(sourceChannel);
      };
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
      return () => {}; // Return empty cleanup function
    }
  }
}
