import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';
import { SourceProcessor } from '@/services/rag/retraining/sourceProcessor';

interface TrainingProgress {
  agentId: string;
  status: 'idle' | 'training' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
  currentlyProcessing?: string[];
  sessionId?: string;
}

interface DatabaseSource {
  id: string;
  source_type: string;
  metadata: any;
  title: string;
  content?: string;
}

export const useTrainingNotifications = () => {
  const { agentId } = useParams();
  
  // Simplified refs for better state management
  const pageLoadTimestampRef = useRef<number>(Date.now());
  const hasEverConnectedRef = useRef<boolean>(false);
  const crawlInitiationInProgressRef = useRef<boolean>(false);
  const crawlInitiationStartTimeRef = useRef<number>(0);
  
  // CRITICAL: Agent-level completion tracking - PERMANENT STATE
  const agentCompletionStateRef = useRef<{
    isCompleted: boolean;
    completedAt: number;
    lastCompletedSessionId: string;
  }>({
    isCompleted: false,
    completedAt: 0,
    lastCompletedSessionId: ''
  });
  
  // Training state management - STRENGTHENED
  const currentTrainingSessionRef = useRef<string>('');
  const trainingStateRef = useRef<'idle' | 'training' | 'completed' | 'failed'>('idle');
  const completedSessionsRef = useRef<Set<string>>(new Set());
  const lastCompletionCheckRef = useRef<number>(0);
  
  // Toast tracking - prevent duplicates
  const shownToastsRef = useRef<Set<string>>(new Set());
  
  // Timer tracking for cleanup
  const pendingTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  // CRITICAL: Completion and session isolation flags
  const sessionCompletionFlagRef = useRef<Set<string>>(new Set());
  const globalTrainingActiveRef = useRef<boolean>(false);
  const lastTrainingActionRef = useRef<'start' | 'complete' | 'none'>('none');
  
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Helper function to clear all pending timers
  const clearAllTimers = () => {
    console.log(`🧹 Clearing ${pendingTimersRef.current.size} pending timers`);
    pendingTimersRef.current.forEach(timer => clearTimeout(timer));
    pendingTimersRef.current.clear();
  };

  // Helper function to add tracked timer
  const addTrackedTimer = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      pendingTimersRef.current.delete(timer);
      callback();
    }, delay);
    pendingTimersRef.current.add(timer);
    return timer;
  };

  // CRITICAL: Check if we should prevent any training action - ENHANCED
  const shouldPreventTrainingAction = (action: 'start' | 'check', sessionId?: string): boolean => {
    const now = Date.now();
    const recentActionThreshold = 5000; // Increased to 5 seconds
    
    // AGENT-LEVEL COMPLETION CHECK - HIGHEST PRIORITY
    if (agentCompletionStateRef.current.isCompleted) {
      const timeSinceCompletion = now - agentCompletionStateRef.current.completedAt;
      if (timeSinceCompletion < 30000) { // 30 second grace period
        console.log(`🚫 AGENT-LEVEL: Preventing ${action} - agent completed ${timeSinceCompletion}ms ago`);
        return true;
      }
    }
    
    // If we just completed training, block all actions for a period
    if (lastTrainingActionRef.current === 'complete' && 
        now - lastCompletionCheckRef.current < recentActionThreshold) {
      console.log(`🚫 Preventing ${action} - recently completed training`);
      return true;
    }
    
    // If this specific session has completed, block all actions for it
    if (sessionId && sessionCompletionFlagRef.current.has(sessionId)) {
      console.log(`🚫 Preventing ${action} for completed session: ${sessionId}`);
      return true;
    }
    
    // If global training is completed state, prevent start actions
    if (action === 'start' && trainingStateRef.current === 'completed') {
      console.log(`🚫 Preventing start - global training state is completed`);
      return true;
    }
    
    return false;
  };

  // CRITICAL: Mark agent-level completion - PERMANENT STATE
  const markAgentCompletion = (sessionId: string) => {
    const now = Date.now();
    console.log(`🎯 MARKING AGENT-LEVEL COMPLETION for session: ${sessionId}`);
    
    agentCompletionStateRef.current = {
      isCompleted: true,
      completedAt: now,
      lastCompletedSessionId: sessionId
    };
    
    // Clear all timers immediately
    clearAllTimers();
    
    // Mark global states
    globalTrainingActiveRef.current = false;
    lastTrainingActionRef.current = 'complete';
    lastCompletionCheckRef.current = now;
    
    // Mark this session and all related sessions as completed
    completedSessionsRef.current.add(sessionId);
    sessionCompletionFlagRef.current.add(sessionId);
  };

  // New function to mark parent sources as trained
  const markParentSourcesAsTrained = async (agentId: string) => {
    try {
      console.log('🎓 Marking parent sources as trained for agent:', agentId);
      
      // Get all parent sources (sources without parent_source_id)
      const { data: parentSources, error } = await supabase
        .from('agent_sources')
        .select('id, metadata')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .is('parent_source_id', null);

      if (error) {
        console.error('Error fetching parent sources:', error);
        return;
      }

      if (parentSources && parentSources.length > 0) {
        // Update each parent source to mark as trained
        const updatePromises = parentSources.map(source => {
          const existingMetadata = (source.metadata as Record<string, any>) || {};
          const updatedMetadata = {
            ...existingMetadata,
            training_completed: true,
            last_trained_at: new Date().toISOString()
          };

          return supabase
            .from('agent_sources')
            .update({ metadata: updatedMetadata })
            .eq('id', source.id);
        });

        await Promise.all(updatePromises);
        console.log('✅ Marked all parent sources as trained');
      }
    } catch (error) {
      console.error('Error marking parent sources as trained:', error);
    }
  };

  // Listen for crawl initiation events to suppress false connection warnings
  useEffect(() => {
    const handleCrawlStarted = () => {
      console.log('🚀 Crawl initiation detected - extending connection grace period');
      crawlInitiationInProgressRef.current = true;
      crawlInitiationStartTimeRef.current = Date.now();
      
      addTrackedTimer(() => {
        crawlInitiationInProgressRef.current = false;
        console.log('✅ Crawl initiation grace period ended');
      }, 45000);
    };

    const handleCrawlCompleted = () => {
      console.log('✅ Crawl completed - clearing initiation flags');
      crawlInitiationInProgressRef.current = false;
    };

    window.addEventListener('crawlStarted', handleCrawlStarted);
    window.addEventListener('crawlCompleted', handleCrawlCompleted);
    
    return () => {
      window.removeEventListener('crawlStarted', handleCrawlStarted);
      window.removeEventListener('crawlCompleted', handleCrawlCompleted);
      clearAllTimers();
    };
  }, []);

  useEffect(() => {
    if (!agentId) return;

    console.log('🔔 Setting up FINAL training notifications for agent:', agentId);

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
        .channel(`final-training-notifications-${agentId}`)
        
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
              // CRITICAL: Check agent-level completion first
              if (shouldPreventTrainingAction('check')) {
                console.log('🚫 AGENT-LEVEL: Prevented check from source_pages update');
                return;
              }
              
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
            
            if (oldMetadata?.processing_status !== metadata?.processing_status) {
              // CRITICAL: Check agent-level completion first
              if (shouldPreventTrainingAction('check')) {
                console.log('🚫 AGENT-LEVEL: Prevented check from agent_sources update');
                return;
              }
              
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
            if ((payload.new as any)?.source_type === 'website') {
              addTrackedTimer(initializeSubscriptions, 500);
            }
            
            // CRITICAL: Check agent-level completion first
            if (!shouldPreventTrainingAction('check')) {
              addTrackedTimer(() => checkTrainingCompletion(agentId), 1000);
            }
          }
        )
        
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            hasEverConnectedRef.current = true;
            if (pollInterval) clearInterval(pollInterval);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            setIsConnected(false);
            
            const timeSincePageLoad = Date.now() - pageLoadTimestampRef.current;
            const timeSinceCrawlStart = Date.now() - crawlInitiationStartTimeRef.current;
            const isAfterPageLoadGracePeriod = timeSincePageLoad > 10000;
            const isCrawlInitiationActive = crawlInitiationInProgressRef.current;
            const isCrawlRecentlyStarted = timeSinceCrawlStart < 45000;
            
            const shouldShowConnectionWarning = hasEverConnectedRef.current && 
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
            
            pollInterval = setInterval(() => {
              if (!shouldPreventTrainingAction('check')) {
                checkTrainingCompletion(agentId);
              }
            }, 15000);
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

  const checkTrainingCompletion = async (agentId: string) => {
    try {
      const now = Date.now();
      
      // CRITICAL: Agent-level completion check FIRST
      if (shouldPreventTrainingAction('check')) {
        console.log('🚫 AGENT-LEVEL: Prevented checkTrainingCompletion');
        return;
      }
      
      // Debounce to prevent excessive calls
      if (now - lastCompletionCheckRef.current < 3000) {
        console.log('🚫 Debounced checkTrainingCompletion call');
        return;
      }
      lastCompletionCheckRef.current = now;
      
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata, title, content, crawl_status')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) {
        console.error('Error fetching agent sources:', sourcesError);
        return;
      }

      if (!agentSources || agentSources.length === 0) {
        return;
      }

      const sourcesNeedingTraining = [];
      let totalPagesNeedingProcessing = 0;
      let totalPagesProcessed = 0;
      let currentlyProcessingPages: string[] = [];
      let hasFailedSources = false;

      for (const source of agentSources as DatabaseSource[]) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          const { data: pages } = await supabase
            .from('source_pages')
            .select('id, url, processing_status, status')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          if (pages && pages.length > 0) {
            const pendingPages = pages.filter(p => !p.processing_status || p.processing_status === 'pending');
            const processingPages = pages.filter(p => p.processing_status === 'processing');
            const processedPages = pages.filter(p => p.processing_status === 'processed');
            const failedPages = pages.filter(p => p.processing_status === 'failed');

            if (failedPages.length > 0) {
              hasFailedSources = true;
            }

            if (pendingPages.length > 0 || processingPages.length > 0) {
              sourcesNeedingTraining.push(source);
            }
            
            totalPagesNeedingProcessing += pages.length;
            totalPagesProcessed += processedPages.length;
            
            currentlyProcessingPages.push(...processingPages.map(p => p.url || p.id));
          }
        } else {
          const hasContent = source.source_type === 'qa' ? 
            (metadata?.question && metadata?.answer) :
            source.content && source.content.trim().length > 0;

          if (hasContent) {
            if (metadata.processing_status === 'failed') {
              hasFailedSources = true;
            }
            
            if (metadata.processing_status !== 'completed') {
              sourcesNeedingTraining.push(source);
              totalPagesNeedingProcessing += 1;
              
              if (metadata.processing_status === 'completed') {
                totalPagesProcessed += 1;
              } else if (metadata.processing_status === 'processing') {
                currentlyProcessingPages.push(source.title);
              }
            } else {
              totalPagesNeedingProcessing += 1;
              totalPagesProcessed += 1;
            }
          }
        }
      }

      const progress = totalPagesNeedingProcessing > 0 ? 
        Math.round((totalPagesProcessed / totalPagesNeedingProcessing) * 100) : 100;

      // Simplified status determination
      let status: 'idle' | 'training' | 'completed' | 'failed' = 'idle';
      
      if (hasFailedSources && sourcesNeedingTraining.length === 0) {
        status = 'failed';
      } else if (currentlyProcessingPages.length > 0) {
        status = 'training';
      } else if (sourcesNeedingTraining.length === 0 && totalPagesNeedingProcessing > 0) {
        status = 'completed';
      } else {
        status = 'idle';
      }

      // CRITICAL: Use existing session or create ONLY if no completion yet
      let sessionId = currentTrainingSessionRef.current;
      
      // PREVENT SESSION ID REGENERATION after any completion
      if (!sessionId && !agentCompletionStateRef.current.isCompleted) {
        sessionId = `${agentId}-${Date.now()}`;
        currentTrainingSessionRef.current = sessionId;
      } else if (!sessionId && agentCompletionStateRef.current.isCompleted) {
        // Use the last completed session ID to prevent new session creation
        sessionId = agentCompletionStateRef.current.lastCompletedSessionId || `${agentId}-completed`;
        console.log('🔒 Using last completed session ID to prevent regeneration:', sessionId);
      }

      const newProgress: TrainingProgress = {
        agentId,
        status,
        progress,
        totalSources: totalPagesNeedingProcessing,
        processedSources: totalPagesProcessed,
        currentlyProcessing: currentlyProcessingPages,
        sessionId
      };

      console.log('📊 Training status update:', {
        status,
        sessionId,
        progress,
        currentState: trainingStateRef.current,
        agentCompleted: agentCompletionStateRef.current.isCompleted,
        lastAction: lastTrainingActionRef.current
      });

      setTrainingProgress(newProgress);

      // Handle status transitions with strengthened toast management
      const previousStatus = trainingStateRef.current;
      trainingStateRef.current = status;

      // Training completed - AGENT-LEVEL COMPLETION HANDLING
      if (status === 'completed' && 
          previousStatus !== 'completed' &&
          totalPagesNeedingProcessing > 0 &&
          totalPagesProcessed === totalPagesNeedingProcessing &&
          !completedSessionsRef.current.has(sessionId) &&
          !agentCompletionStateRef.current.isCompleted) {
        
        console.log('🎉 FINAL COMPLETION! Processing completion for session:', sessionId);
        
        // CRITICAL: Mark agent-level completion IMMEDIATELY
        markAgentCompletion(sessionId);
        
        // Mark all parent sources as trained
        await markParentSourcesAsTrained(agentId);
        
        const completionToastId = `completion-${sessionId}`;
        if (!shownToastsRef.current.has(completionToastId)) {
          shownToastsRef.current.add(completionToastId);
          
          toast({
            title: "Training Complete",
            description: "Your AI agent is trained and ready",
            duration: 5000,
          });

          window.dispatchEvent(new CustomEvent('trainingCompleted', {
            detail: { agentId, progress: newProgress }
          }));
        }
      }

      // Training failed - clear timers on failure
      if (status === 'failed' && previousStatus !== 'failed') {
        console.log('❌ Training failed for session:', sessionId);
        
        clearAllTimers();
        globalTrainingActiveRef.current = false;
        
        const failureToastId = `failure-${sessionId}`;
        if (!shownToastsRef.current.has(failureToastId)) {
          shownToastsRef.current.add(failureToastId);
          
          toast({
            title: "Training Failed",
            description: "Training process encountered an error. Please try again.",
            variant: "destructive",
            duration: 5000,
          });
        }
      }

    } catch (error) {
      console.error('Error in FINAL checkTrainingCompletion:', error);
      setTrainingProgress(prev => prev ? { ...prev, status: 'failed' } : null);
    }
  };

  const startTraining = async () => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting FINAL training for agent:', agentId);

      // CRITICAL: Agent-level completion check FIRST
      if (shouldPreventTrainingAction('start')) {
        console.log('🚫 AGENT-LEVEL: PREVENTED training start - conditions not met');
        return;
      }

      // Reset agent-level completion state when explicitly starting training
      console.log('🔄 Resetting agent-level completion state for new training');
      agentCompletionStateRef.current = {
        isCompleted: false,
        completedAt: 0,
        lastCompletedSessionId: ''
      };

      // Create new session
      const sessionId = `training-${agentId}-${Date.now()}`;
      
      currentTrainingSessionRef.current = sessionId;
      trainingStateRef.current = 'training';
      globalTrainingActiveRef.current = true;
      lastTrainingActionRef.current = 'start';

      // Clear previous completion state
      completedSessionsRef.current.clear();
      sessionCompletionFlagRef.current.clear();
      clearAllTimers();

      // Show "Training Started" toast immediately
      const startToastId = `start-${sessionId}`;
      if (!shownToastsRef.current.has(startToastId)) {
        shownToastsRef.current.add(startToastId);
        
        console.log('📢 Showing training start toast for session:', sessionId);
        toast({
          title: "Training Started",
          description: "Processing sources for AI training...",
          duration: 3000,
        });
      }

      // ... keep existing code (source processing logic)
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata, title, content')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) throw sourcesError;
      if (!agentSources || agentSources.length === 0) return;

      const sourcesToProcess = [];
      let totalPages = 0;

      for (const source of agentSources as DatabaseSource[]) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          const { data: unprocessedPages } = await supabase
            .from('source_pages')
            .select('id')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed')
            .in('processing_status', ['pending', null]);

          if (unprocessedPages && unprocessedPages.length > 0) {
            sourcesToProcess.push(source);
            totalPages += unprocessedPages.length;
          }
        } else {
          const hasContent = source.source_type === 'qa' ? 
            (metadata?.question && metadata?.answer) :
            source.content && source.content.trim().length > 0;

          if (hasContent && metadata.processing_status !== 'completed') {
            sourcesToProcess.push(source);
            totalPages += 1;
          }
        }
      }

      if (sourcesToProcess.length === 0) {
        trainingStateRef.current = 'completed';
        globalTrainingActiveRef.current = false;
        markAgentCompletion(sessionId);
        setTrainingProgress({
          agentId,
          status: 'completed',
          progress: 100,
          totalSources: 0,
          processedSources: 0,
          sessionId
        });
        return;
      }

      // Set initial training progress
      setTrainingProgress({
        agentId,
        status: 'training',
        progress: 0,
        totalSources: totalPages,
        processedSources: 0,
        currentlyProcessing: [],
        sessionId
      });

      // Process sources
      const processingPromises = sourcesToProcess.map(async (source) => {
        return SourceProcessor.processSource(source);
      });

      await Promise.allSettled(processingPromises);

      // Check completion after processing - only if not already completed
      if (!agentCompletionStateRef.current.isCompleted) {
        addTrackedTimer(() => checkTrainingCompletion(agentId), 2000);
      }

    } catch (error) {
      console.error('Failed to start FINAL training:', error);
      
      trainingStateRef.current = 'failed';
      globalTrainingActiveRef.current = false;
      clearAllTimers();
      
      const isConflictError = error?.message?.includes('409') || error?.status === 409;
      
      if (isConflictError) {
        toast({
          title: "Training In Progress",
          description: "Training is already running - no action needed",
        });
        setTrainingProgress(prev => prev ? { ...prev, status: 'training' } : null);
      } else {
        toast({
          title: "Training Failed",
          description: "Failed to start training process",
          variant: "destructive",
        });
        setTrainingProgress(prev => prev ? { ...prev, status: 'failed' } : null);
      }
    }
  };

  return {
    trainingProgress,
    startTraining: async () => {
      if (!agentId) return;
      await startTraining();
    },
    checkTrainingCompletion: () => agentId && !shouldPreventTrainingAction('check') && checkTrainingCompletion(agentId),
    isConnected
  };
};
