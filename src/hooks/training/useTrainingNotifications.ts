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

  // Helper functions for timer management
  const clearAllTimers = () => {
    console.log(`🧹 Clearing ${refs.pendingTimersRef.current.size} pending timers`);
    refs.pendingTimersRef.current.forEach(timer => clearTimeout(timer));
    refs.pendingTimersRef.current.clear();
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

  // Listen for clear prevention events
  useEffect(() => {
    const handleClearPrevention = (event: CustomEvent) => {
      const { agentId: eventAgentId } = event.detail;
      if (eventAgentId === agentId) {
        console.log('🧹 Clearing prevention state for agent:', agentId);
        
        // Reset all prevention-related refs
        refs.agentCompletionStateRef.current = {
          isCompleted: false,
          completedAt: 0,
          lastCompletedSessionId: ''
        };
        refs.activeTrainingSessionRef.current = '';
        refs.trainingStartTimeRef.current = 0;
        refs.globalTrainingActiveRef.current = false;
        refs.lastTrainingActionRef.current = 'none'; // FIXED: Use valid enum value instead of empty string
        refs.lastCompletionCheckRef.current = 0;
        refs.completedSessionsRef.current.clear();
        refs.sessionCompletionFlagRef.current.clear();
        
        console.log('✅ Prevention state cleared successfully');
      }
    };

    window.addEventListener('clearTrainingPrevention', handleClearPrevention as EventListener);
    
    return () => {
      window.removeEventListener('clearTrainingPrevention', handleClearPrevention as EventListener);
    };
  }, [agentId, refs]);

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

    window.addEventListener('crawlStarted', handleCrawlStarted);
    window.addEventListener('crawlCompleted', handleCrawlCompleted);
    
    return () => {
      window.removeEventListener('crawlStarted', handleCrawlStarted);
      window.removeEventListener('crawlCompleted', handleCrawlCompleted);
      clearAllTimers();
    };
  }, []);

  // Main effect for setting up subscriptions
  useEffect(() => {
    if (!agentId) return;

    console.log('🔔 Setting up IMPROVED training notifications for agent:', agentId);

    let pollInterval: NodeJS.Timeout;
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
        .channel(`improved-training-notifications-${agentId}`)
        
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'source_pages',
            filter: websiteSources.length > 0 ? `parent_source_id=in.(${websiteSources.join(',')})` : 'parent_source_id=eq.00000000-0000-0000-0000-000000000000'
          },
          (payload) => {
            const updatedPage = payload.new as any;
            const oldPage = payload.old as any;
            
            if (oldPage?.processing_status !== updatedPage?.processing_status) {
              // REDUCED PREVENTION CHECKS: Only check every 5 seconds instead of always
              const lastCheck = refs.lastCompletionCheckRef.current;
              const now = Date.now();
              if (now - lastCheck < 5000) {
                console.log('⏭️ Skipping check - too recent');
                return;
              }
              
              if (!shouldPreventTrainingAction('check')) {
                addTrackedTimer(() => checkTrainingCompletion(agentId), 2000);
              }
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
            const updatedSource = payload.new as any;
            const oldSource = payload.old as any;
            const metadata = updatedSource.metadata || {};
            const oldMetadata = oldSource?.metadata || {};
            
            if (oldMetadata?.processing_status !== metadata?.processing_status) {
              // REDUCED PREVENTION CHECKS: Only check every 5 seconds
              const lastCheck = refs.lastCompletionCheckRef.current;
              const now = Date.now();
              if (now - lastCheck < 5000) {
                console.log('⏭️ Skipping check - too recent');
                return;
              }
              
              if (!shouldPreventTrainingAction('check')) {
                addTrackedTimer(() => checkTrainingCompletion(agentId), 2000);
              }
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
            if ((payload.new as any)?.source_type === 'website') {
              addTrackedTimer(initializeSubscriptions, 500);
            }
            
            if (!shouldPreventTrainingAction('check')) {
              addTrackedTimer(() => checkTrainingCompletion(agentId), 1000);
            }
          }
        )
        
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            refs.hasEverConnectedRef.current = true;
            if (pollInterval) clearInterval(pollInterval);
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
            
            // REDUCED POLLING: Only poll every 30 seconds instead of 15
            pollInterval = setInterval(() => {
              if (!shouldPreventTrainingAction('check')) {
                checkTrainingCompletion(agentId);
              }
            }, 30000);
          }
        });

      return () => {
        if (pollInterval) clearInterval(pollInterval);
        supabase.removeChannel(channel);
      };
    };

    initializeSubscriptions();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      clearAllTimers();
    };
  }, [agentId]);

  return {
    trainingProgress,
    startTraining: async () => {
      if (!agentId) return;
      await startTraining(agentId);
    },
    checkTrainingCompletion: () => agentId && !shouldPreventTrainingAction('check') && checkTrainingCompletion(agentId),
    isConnected
  };
};
