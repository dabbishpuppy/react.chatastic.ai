
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TrainingRefs } from '../types';

export class TrainingRealtimeService {
  static shouldIgnoreUpdate(eventType: string, payload: any, refs: TrainingRefs): boolean {
    const now = Date.now();
    
    // ENHANCED: Less aggressive filtering - only ignore if recently completed AND no new content
    if (refs.agentCompletionStateRef.current.isCompleted) {
      const timeSinceCompletion = now - refs.agentCompletionStateRef.current.completedAt;
      
      // Only ignore updates for first 30 seconds after completion (reduced from 2 minutes)
      if (timeSinceCompletion < 30000) {
        console.log(`🚫 BRIEF POST-COMPLETION: Ignoring ${eventType} - agent completed ${timeSinceCompletion}ms ago`);
        return true;
      }
      
      // After 30 seconds, allow updates that might indicate new content
      console.log(`🔄 POST-COMPLETION: Allowing ${eventType} - sufficient time passed (${timeSinceCompletion}ms)`);
    }

    // ENHANCED: For new content, reset completion state
    if (eventType === 'agent_sources_insert' || 
        (eventType === 'agent_sources_update' && payload?.new?.created_at !== payload?.old?.created_at)) {
      console.log(`🔄 NEW CONTENT DETECTED: Resetting completion state due to ${eventType}`);
      refs.agentCompletionStateRef.current = {
        isCompleted: false,
        completedAt: 0,
        lastCompletedSessionId: ''
      };
      refs.trainingStateRef.current = 'idle';
      refs.completedSessionsRef.current.clear();
      refs.lastTrainingActionRef.current = 'none';
      return false; // Allow the update to proceed
    }

    return false;
  }

  static setupRealtimeChannels(
    agentId: string,
    websiteSources: string[],
    refs: TrainingRefs,
    protectedCheckTrainingCompletion: (agentId: string) => void,
    addTrackedTimer: (callback: () => void, delay: number) => NodeJS.Timeout,
    setIsConnected: (connected: boolean) => void,
    setupProtectedPolling: () => NodeJS.Timeout,
    pollInterval: NodeJS.Timeout | null
  ) {
    const channel = supabase
      .channel(`enhanced-training-notifications-${agentId}`)
      
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_pages',
          filter: websiteSources.length > 0 ? `parent_source_id=in.(${websiteSources.join(',')})` : 'parent_source_id=eq.00000000-0000-0000-0000-000000000000'
        },
        (payload) => {
          // ENHANCED: Better filtering for page updates
          if (this.shouldIgnoreUpdate('source_pages_update', payload, refs)) {
            return;
          }

          const updatedPage = payload.new as any;
          const oldPage = payload.old as any;
          
          if (oldPage?.processing_status !== updatedPage?.processing_status) {
            console.log('📄 Source page processing status changed, scheduling protected check');
            addTrackedTimer(() => protectedCheckTrainingCompletion(agentId), 2000);
          }
        }
      )
      
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          // ENHANCED: Better filtering for source updates
          if (this.shouldIgnoreUpdate('agent_sources_update', payload, refs)) {
            return;
          }

          const updatedSource = payload.new as any;
          const oldSource = payload.old as any;
          const metadata = updatedSource.metadata || {};
          const oldMetadata = oldSource?.metadata || {};
          
          if (oldMetadata?.processing_status !== metadata?.processing_status) {
            console.log('🗂️ Agent source processing status changed, scheduling protected check');
            addTrackedTimer(() => protectedCheckTrainingCompletion(agentId), 2000);
          }
        }
      )
      
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          // ENHANCED: Always allow new source inserts and reset completion state
          console.log('➕ New agent source added - resetting completion state and scheduling check');
          
          // Reset completion state for new sources
          refs.agentCompletionStateRef.current = {
            isCompleted: false,
            completedAt: 0,
            lastCompletedSessionId: ''
          };
          refs.trainingStateRef.current = 'idle';
          refs.completedSessionsRef.current.clear();
          refs.lastTrainingActionRef.current = 'none';
          
          addTrackedTimer(() => protectedCheckTrainingCompletion(agentId), 1000);
        }
      )
      
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          refs.hasEverConnectedRef.current = true;
          
          // Clear any existing polling and don't restart if completed
          if (pollInterval) {
            clearInterval(pollInterval);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setIsConnected(false);
          
          const timeSincePageLoad = Date.now() - refs.pageLoadTimestampRef.current;
          const timeSinceCrawlStart = Date.now() - refs.crawlInitiationStartTimeRef.current;
          const isAfterPageLoadGracePeriod = timeSincePageLoad > 10000;
          const isCrawlInitiationActive = refs.crawlInitiationInProgressRef.current;
          const isCrawlRecentlyStarted = timeSinceCrawlStart < 45000;
          
          const shouldShowConnectionWarning = refs.hasEverConnectedRef.current && 
            isAfterPageLoadGracePeriod && 
            !isCrawlInitiationActive && 
            !isCrawlRecentlyStarted;
          
          if (shouldShowConnectionWarning) {
            console.log('⚠️ Showing connection issue toast - not related to crawl initiation');
            toast({
              title: "Connection Issue",
              description: "Training updates may be delayed. We're working on it.",
              duration: 3000,
            });
          }
          
          // ENHANCED: Setup polling if not recently completed
          const timeSinceCompletion = Date.now() - refs.agentCompletionStateRef.current.completedAt;
          if (!refs.agentCompletionStateRef.current.isCompleted || timeSinceCompletion > 60000) {
            console.log('🔄 Setting up protected polling due to connection issue');
            setupProtectedPolling();
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }

  static async initializeSubscriptions(agentId: string): Promise<string[]> {
    try {
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('agent_id', agentId)
        .eq('source_type', 'website')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching website sources:', error);
        return [];
      }

      const websiteSources = sources?.map(s => s.id) || [];
      console.log('📄 Found website sources to monitor:', websiteSources);
      return websiteSources;
    } catch (error) {
      console.error('Error initializing subscriptions:', error);
      return [];
    }
  }
}
