
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

  // ENHANCED: Helper to reset completion state when new sources are added
  const resetCompletionState = (reason: string) => {
    console.log(`🔄 RESET COMPLETION STATE: ${reason}`);
    refs.agentCompletionStateRef.current = {
      isCompleted: false,
      completedAt: 0,
      lastCompletedSessionId: ''
    };
    refs.sessionCompletionFlagRef.current.clear();
    refs.completedSessionsRef.current.clear();
    refs.lastTrainingActionRef.current = 'reset';
    refs.lastCompletionCheckRef.current = 0;
  };

  // Initialize prevention logic with enhanced filtering
  const { shouldPreventTrainingAction, markAgentCompletion, isCompletionRelatedUpdate } = useTrainingPrevention(refs);

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

  // ENHANCED: Helper to detect if this is a post-completion page processing event
  const isPostCompletionProcessing = (payload: any): boolean => {
    const updatedPage = payload.new;
    const oldPage = payload.old;
    
    // If agent is in completion state, ignore all page processing updates
    if (refs.agentCompletionStateRef.current.isCompleted) {
      console.log('🚫 ENHANCED: Ignoring page update - agent in completion state');
      return true;
    }
    
    // If this is just a processing status update after completion
    if (oldPage?.processing_status !== updatedPage?.processing_status && 
        updatedPage?.processing_status === 'processed') {
      const timeSinceLastCompletion = Date.now() - refs.lastCompletionCheckRef.current;
      if (timeSinceLastCompletion < 60000) { // 1 minute protection
        console.log('🚫 ENHANCED: Ignoring post-completion page processing update');
        return true;
      }
    }
    
    return false;
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

    console.log('🔔 Setting up ENHANCED training notifications for agent:', agentId);

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
            const updatedPage = payload.new as any;
            const oldPage = payload.old as any;
            
            // ENHANCED: Filter out completion-related and post-completion updates
            if (isCompletionRelatedUpdate(oldPage, updatedPage)) {
              console.log('🚫 ENHANCED: Ignoring completion-related source_pages update');
              return;
            }
            
            if (isPostCompletionProcessing(payload)) {
              console.log('🚫 ENHANCED: Ignoring post-completion page processing');
              return;
            }
            
            if (oldPage?.processing_status !== updatedPage?.processing_status) {
              if (shouldPreventTrainingAction('check')) {
                console.log('🚫 ENHANCED AGENT-LEVEL: Prevented check from source_pages update');
                return;
              }
              
              // ADDITIONAL CHECK: Don't trigger for pages that just completed processing
              if (updatedPage?.processing_status === 'processed' && 
                  refs.agentCompletionStateRef.current.isCompleted) {
                console.log('🚫 ENHANCED: Ignoring processed page update - agent already completed');
                return;
              }
              
              console.log('✅ ENHANCED: Legitimate source_pages update, checking completion');
              addTrackedTimer(() => checkTrainingCompletion(agentId), 2000);
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
            
            // ENHANCED: Filter out completion-related updates
            if (isCompletionRelatedUpdate(oldSource, updatedSource)) {
              console.log('🚫 ENHANCED: Ignoring completion-related agent_sources update');
              return;
            }
            
            if (oldMetadata?.processing_status !== metadata?.processing_status) {
              if (shouldPreventTrainingAction('check')) {
                console.log('🚫 ENHANCED AGENT-LEVEL: Prevented check from agent_sources update');
                return;
              }
              
              // ADDITIONAL CHECK: Don't trigger for completed sources when agent is completed
              if (metadata?.processing_status === 'completed' && 
                  refs.agentCompletionStateRef.current.isCompleted) {
                console.log('🚫 ENHANCED: Ignoring completed source update - agent already completed');
                return;
              }
              
              console.log('✅ ENHANCED: Legitimate agent_sources update, checking completion');
              addTrackedTimer(() => checkTrainingCompletion(agentId), 2000);
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
            const newSource = payload.new as any;
            
            // RESET COMPLETION STATE: New source added - agent needs retraining
            console.log('🆕 NEW SOURCE DETECTED - Resetting completion state');
            resetCompletionState(`New source added: ${newSource.title || newSource.id}`);
            
            // Dispatch event to notify components about new source
            window.dispatchEvent(new CustomEvent('sourceCreated', {
              detail: { source: newSource, requiresTraining: true }
            }));
            
            if (newSource?.source_type === 'website') {
              addTrackedTimer(initializeSubscriptions, 500);
            }
            
            if (!shouldPreventTrainingAction('check')) {
              console.log('✅ ENHANCED: New source added, checking completion');
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
            
            // ENHANCED: Don't poll if agent is completed
            if (!refs.agentCompletionStateRef.current.isCompleted) {
              pollInterval = setInterval(() => {
                if (!shouldPreventTrainingAction('check')) {
                  checkTrainingCompletion(agentId);
                }
              }, 15000);
            }
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
