
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';
import { TrainingProgress } from './types';
import { useTrainingState } from './useTrainingState';
import { useTrainingPrevention } from './useTrainingPrevention';
import { useTrainingCompletion } from './useTrainingCompletion';
import { useTrainingStart } from './useTrainingStart';

export const useTrainingNotifications = () => {
  const { agentId } = useParams();
  const refs = useTrainingState();
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // ENHANCED: Track polling interval for proper cleanup
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Helper functions for timer management
  const clearAllTimers = () => {
    console.log(`🧹 Clearing ${refs.pendingTimersRef.current.size} pending timers`);
    refs.pendingTimersRef.current.forEach(timer => clearTimeout(timer));
    refs.pendingTimersRef.current.clear();
    
    // ENHANCED: Clear polling interval too
    if (pollInterval) {
      console.log('🧹 Clearing polling interval');
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  };

  const addTrackedTimer = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      refs.pendingTimersRef.current.delete(timer);
      callback();
    }, delay);
    refs.pendingTimersRef.current.add(timer);
    return timer;
  };

  // Initialize prevention logic
  const { shouldPreventTrainingAction, markAgentCompletion } = useTrainingPrevention(refs);

  // Initialize completion logic
  const { checkTrainingCompletion } = useTrainingCompletion(
    refs,
    shouldPreventTrainingAction,
    markAgentCompletion,
    setTrainingProgress
  );

  // Initialize start logic
  const { startTraining } = useTrainingStart(
    refs,
    markAgentCompletion,
    setTrainingProgress,
    checkTrainingCompletion,
    clearAllTimers,
    addTrackedTimer
  );

  // ENHANCED: Much stronger post-completion filtering
  const shouldIgnoreUpdate = (eventType: string, payload: any) => {
    const now = Date.now();
    
    // PRIORITY 1: If agent is completed, ignore ALL updates
    if (refs.agentCompletionStateRef.current.isCompleted) {
      const timeSinceCompletion = now - refs.agentCompletionStateRef.current.completedAt;
      console.log(`🚫 ENHANCED POST-COMPLETION: Ignoring ${eventType} - agent completed ${timeSinceCompletion}ms ago`);
      return true;
    }

    // PRIORITY 2: If training state is completed, ignore processing updates
    if (refs.trainingStateRef.current === 'completed') {
      console.log(`🚫 ENHANCED POST-COMPLETION: Ignoring ${eventType} - training state is completed`);
      return true;
    }

    // PRIORITY 3: If last action was complete and recent, ignore updates
    if (refs.lastTrainingActionRef.current === 'complete') {
      const timeSinceLastAction = now - refs.lastCompletionCheckRef.current;
      if (timeSinceLastAction < 120000) { // Extended to 2 minutes
        console.log(`🚫 ENHANCED POST-COMPLETION: Ignoring ${eventType} - recent completion action (${timeSinceLastAction}ms ago)`);
        return true;
      }
    }

    // PRIORITY 4: If this is a processing status update and we have completed sessions
    if (payload?.new?.processing_status === 'processed' || payload?.new?.processing_status === 'completed') {
      if (refs.completedSessionsRef.current.size > 0) {
        console.log(`🚫 ENHANCED POST-COMPLETION: Ignoring processing update - have completed sessions`);
        return true;
      }
    }

    return false;
  };

  // ENHANCED: Protected check function that respects completion state
  const protectedCheckTrainingCompletion = (agentId: string) => {
    // ENHANCED: Multiple layers of protection
    if (refs.agentCompletionStateRef.current.isCompleted) {
      console.log('🚫 PROTECTED CHECK: Agent already completed, skipping check');
      return;
    }

    if (refs.trainingStateRef.current === 'completed') {
      console.log('🚫 PROTECTED CHECK: Training state is completed, skipping check');
      return;
    }

    if (shouldPreventTrainingAction('check')) {
      console.log('🚫 PROTECTED CHECK: Prevention logic blocked check');
      return;
    }

    console.log('✅ PROTECTED CHECK: Proceeding with training completion check');
    checkTrainingCompletion(agentId);
  };

  // ENHANCED: Protected polling with completion awareness
  const setupProtectedPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    const newPollInterval = setInterval(() => {
      if (!agentId) return;
      
      // ENHANCED: Check completion state before polling
      if (refs.agentCompletionStateRef.current.isCompleted) {
        console.log('🚫 POLLING: Agent completed, stopping polls');
        clearInterval(newPollInterval);
        setPollInterval(null);
        return;
      }

      if (refs.trainingStateRef.current === 'completed') {
        console.log('🚫 POLLING: Training completed, stopping polls');
        clearInterval(newPollInterval);
        setPollInterval(null);
        return;
      }

      console.log('🔄 POLLING: Running protected completion check');
      protectedCheckTrainingCompletion(agentId);
    }, 15000);

    setPollInterval(newPollInterval);
    return newPollInterval;
  };

  // Listen for crawl initiation events
  useEffect(() => {
    const handleCrawlStarted = () => {
      console.log('🚀 Crawl initiation detected - extending connection grace period');
      refs.crawlInitiationInProgressRef.current = true;
      refs.crawlInitiationStartTimeRef.current = Date.now();
      
      addTrackedTimer(() => {
        refs.crawlInitiationInProgressRef.current = false;
        console.log('✅ Crawl initiation grace period ended');
      }, 45000);
    };

    const handleCrawlCompleted = () => {
      console.log('✅ Crawl completed - clearing initiation flags');
      refs.crawlInitiationInProgressRef.current = false;
    };

    // ENHANCED: Listen for training completion to clear all active processes
    const handleTrainingCompleted = () => {
      console.log('🎉 ENHANCED: Training completed event - clearing all processes');
      clearAllTimers();
      
      // Force clear any remaining polling
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
    };

    window.addEventListener('crawlStarted', handleCrawlStarted);
    window.addEventListener('crawlCompleted', handleCrawlCompleted);
    window.addEventListener('trainingCompleted', handleTrainingCompleted);
    
    return () => {
      window.removeEventListener('crawlStarted', handleCrawlStarted);
      window.removeEventListener('crawlCompleted', handleCrawlCompleted);
      window.removeEventListener('trainingCompleted', handleTrainingCompleted);
      clearAllTimers();
    };
  }, []);

  // Main effect for setting up subscriptions
  useEffect(() => {
    if (!agentId) return;

    console.log('🔔 Setting up ENHANCED training notifications for agent:', agentId);

    let websiteSources: string[] = [];

    const initializeSubscriptions = async () => {
      try {
        const { data: sources, error } = await supabase
          .from('agent_sources')
          .select('id')
          .eq('agent_id', agentId)
          .eq('source_type', 'website')
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching website sources:', error);
          return;
        }

        websiteSources = sources?.map(s => s.id) || [];
        console.log('📄 Found website sources to monitor:', websiteSources);

        setupRealtimeChannels();
      } catch (error) {
        console.error('Error initializing subscriptions:', error);
      }
    };

    const setupRealtimeChannels = () => {
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
            // ENHANCED: Strong post-completion filtering
            if (shouldIgnoreUpdate('source_pages_update', payload)) {
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
            // ENHANCED: Strong post-completion filtering
            if (shouldIgnoreUpdate('agent_sources_update', payload)) {
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
            // ENHANCED: Strong post-completion filtering
            if (shouldIgnoreUpdate('agent_sources_insert', payload)) {
              return;
            }

            if ((payload.new as any)?.source_type === 'website') {
              addTrackedTimer(initializeSubscriptions, 500);
            }
            
            console.log('➕ New agent source added, scheduling protected check');
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
              setPollInterval(null);
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
            
            // ENHANCED: Only setup polling if not completed
            if (!refs.agentCompletionStateRef.current.isCompleted && 
                refs.trainingStateRef.current !== 'completed') {
              console.log('🔄 Setting up protected polling due to connection issue');
              setupProtectedPolling();
            }
          }
        });

      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
        supabase.removeChannel(channel);
      };
    };

    initializeSubscriptions();

    return () => {
      clearAllTimers();
    };
  }, [agentId]);

  return {
    trainingProgress,
    startTraining: async () => {
      if (!agentId) return;
      
      // ENHANCED: STRONGEST possible check before starting
      const timeSinceCompletion = Date.now() - refs.agentCompletionStateRef.current.completedAt;
      
      if (refs.agentCompletionStateRef.current.isCompleted && timeSinceCompletion < 300000) { // 5 minutes
        console.log('🚫 ULTIMATE PROTECTION: Agent completed recently, completely blocking start');
        return;
      }
      
      if (refs.trainingStateRef.current === 'completed') {
        console.log('🚫 ULTIMATE PROTECTION: Training state completed, completely blocking start');
        return;
      }
      
      if (refs.completedSessionsRef.current.size > 0) {
        console.log('🚫 ULTIMATE PROTECTION: Have completed sessions, completely blocking start');
        return;
      }
      
      await startTraining(agentId);
    },
    checkTrainingCompletion: () => agentId && protectedCheckTrainingCompletion(agentId),
    isConnected
  };
};
