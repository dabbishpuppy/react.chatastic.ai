import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TrainingRefs } from '../types';

export class TrainingRealtimeService {
  static shouldIgnoreUpdate(eventType: string, payload: any, refs: TrainingRefs): boolean {
    const now = Date.now();
    
    // REDUCED: Much less aggressive filtering - only ignore very recent completions
    if (refs.agentCompletionStateRef.current.isCompleted) {
      const timeSinceCompletion = now - refs.agentCompletionStateRef.current.completedAt;
      
      // Only ignore updates for first 10 seconds after completion (reduced from 30s)
      if (timeSinceCompletion < 10000) {
        console.log(`🚫 BRIEF POST-COMPLETION: Ignoring ${eventType} - agent completed ${timeSinceCompletion}ms ago`);
        return true;
      }
      
      console.log(`🔄 POST-COMPLETION: Allowing ${eventType} - sufficient time passed (${timeSinceCompletion}ms)`);
    }

    // IMMEDIATE: For any new content, immediately reset completion state
    if (eventType === 'agent_sources_insert' || 
        (eventType === 'agent_sources_update' && payload?.new?.created_at !== payload?.old?.created_at) ||
        (eventType === 'source_pages_insert')) {
      console.log(`🔄 NEW CONTENT DETECTED: IMMEDIATE reset of completion state due to ${eventType}`);
      refs.agentCompletionStateRef.current = {
        isCompleted: false,
        completedAt: 0,
        lastCompletedSessionId: ''
      };
      refs.trainingStateRef.current = 'idle';
      refs.completedSessionsRef.current.clear();
      refs.lastTrainingActionRef.current = 'none';
      refs.currentTrainingSessionRef.current = '';
      
      // Dispatch immediate state reset event
      window.dispatchEvent(new CustomEvent('trainingStateReset', {
        detail: { reason: eventType, timestamp: Date.now() }
      }));
      
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
          event: 'INSERT',
          schema: 'public',
          table: 'source_pages',
          filter: websiteSources.length > 0 ? `parent_source_id=in.(${websiteSources.join(',')})` : 'parent_source_id=eq.00000000-0000-0000-0000-000000000000'
        },
        (payload) => {
          console.log('➕ New source page inserted - IMMEDIATE reset and check');
          
          // Immediate reset for new page inserts
          refs.agentCompletionStateRef.current = {
            isCompleted: false,
            completedAt: 0,
            lastCompletedSessionId: ''
          };
          refs.trainingStateRef.current = 'idle';
          refs.completedSessionsRef.current.clear();
          refs.lastTrainingActionRef.current = 'none';
          
          window.dispatchEvent(new CustomEvent('trainingStateReset', {
            detail: { reason: 'source_pages_insert', timestamp: Date.now() }
          }));
          
          addTrackedTimer(() => protectedCheckTrainingCompletion(agentId), 1000);
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
          console.log('➕ New agent source added - IMMEDIATE reset and scheduling check');
          
          // Immediate reset for new sources
          refs.agentCompletionStateRef.current = {
            isCompleted: false,
            completedAt: 0,
            lastCompletedSessionId: ''
          };
          refs.trainingStateRef.current = 'idle';
          refs.completedSessionsRef.current.clear();
          refs.lastTrainingActionRef.current = 'none';
          refs.currentTrainingSessionRef.current = '';
          
          window.dispatchEvent(new CustomEvent('trainingStateReset', {
            detail: { reason: 'agent_sources_insert', timestamp: Date.now() }
          }));
          
          addTrackedTimer(() => protectedCheckTrainingCompletion(agentId), 1000);
        }
      )
      
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          refs.hasEverConnectedRef.current = true;
          
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
          
          // Setup polling if not recently completed
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
