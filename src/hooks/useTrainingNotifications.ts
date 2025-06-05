
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
  
  // State management refs - FIXED: More conservative prevention logic
  const pageLoadTimestampRef = useRef<number>(Date.now());
  const hasEverConnectedRef = useRef<boolean>(false);
  const crawlInitiationInProgressRef = useRef<boolean>(false);
  const crawlInitiationStartTimeRef = useRef<number>(0);
  
  // FIXED: Agent-level completion tracking with better isolation
  const agentCompletionStateRef = useRef<{
    isCompleted: boolean;
    completedAt: number;
    lastCompletedSessionId: string;
    gracePeriodActive: boolean;
  }>({
    isCompleted: false,
    completedAt: 0,
    lastCompletedSessionId: '',
    gracePeriodActive: false
  });
  
  // FIXED: Training state management with better session isolation
  const currentTrainingSessionRef = useRef<string>('');
  const trainingStateRef = useRef<'idle' | 'training' | 'completed' | 'failed'>('idle');
  const completedSessionsRef = useRef<Set<string>>(new Set());
  const lastCompletionCheckRef = useRef<number>(0);
  
  // Toast tracking - prevent duplicates
  const shownToastsRef = useRef<Set<string>>(new Set());
  
  // Timer tracking for cleanup
  const pendingTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  // FIXED: More conservative completion and session isolation flags
  const sessionCompletionFlagRef = useRef<Set<string>>(new Set());
  const globalTrainingActiveRef = useRef<boolean>(false);
  const lastTrainingActionRef = useRef<'start' | 'complete' | 'none'>('none');
  const trainingInitiatedByUserRef = useRef<boolean>(false);
  
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

  // FIXED: Much more conservative prevention logic
  const shouldPreventTrainingAction = (action: 'start' | 'check', sessionId?: string): boolean => {
    const now = Date.now();
    
    // CRITICAL: Only prevent during active grace period, not after completion
    if (agentCompletionStateRef.current.gracePeriodActive) {
      const timeSinceCompletion = now - agentCompletionStateRef.current.completedAt;
      if (timeSinceCompletion < 10000) { // Reduced to 10 seconds
        console.log(`🚫 GRACE PERIOD: Preventing ${action} - in grace period (${timeSinceCompletion}ms)`);
        return true;
      } else {
        // Grace period expired, clear it
        agentCompletionStateRef.current.gracePeriodActive = false;
        console.log(`✅ Grace period expired, allowing actions again`);
      }
    }
    
    // FIXED: Only prevent checks for recently completed sessions, not all actions
    if (action === 'check' && sessionId && sessionCompletionFlagRef.current.has(sessionId)) {
      const timeSinceAction = now - lastCompletionCheckRef.current;
      if (timeSinceAction < 5000) { // Reduced debounce time
        console.log(`🚫 Preventing check for completed session: ${sessionId}`);
        return true;
      }
    }
    
    // FIXED: Don't prevent start actions unless explicitly in training
    if (action === 'start' && globalTrainingActiveRef.current && trainingStateRef.current === 'training') {
      console.log(`🚫 Preventing start - training already active`);
      return true;
    }
    
    return false;
  };

  // FIXED: Mark agent-level completion with grace period management
  const markAgentCompletion = (sessionId: string) => {
    const now = Date.now();
    console.log(`🎯 MARKING AGENT-LEVEL COMPLETION for session: ${sessionId}`);
    
    agentCompletionStateRef.current = {
      isCompleted: true,
      completedAt: now,
      lastCompletedSessionId: sessionId,
      gracePeriodActive: true
    };
    
    // Clear grace period after a short time
    addTrackedTimer(() => {
      agentCompletionStateRef.current.gracePeriodActive = false;
      console.log(`✅ Grace period ended for session: ${sessionId}`);
    }, 10000);
    
    // Mark global states
    globalTrainingActiveRef.current = false;
    lastTrainingActionRef.current = 'complete';
    lastCompletionCheckRef.current = now;
    
    // Mark this session as completed
    completedSessionsRef.current.add(sessionId);
    sessionCompletionFlagRef.current.add(sessionId);
  };

  // Mark parent sources as trained
  const markParentSourcesAsTrained = async (agentId: string) => {
    try {
      console.log('🎓 Marking parent sources as trained for agent:', agentId);
      
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

  // Listen for crawl initiation events
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

    console.log('🔔 Setting up FIXED training notifications for agent:', agentId);

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
        .channel(`fixed-training-notifications-${agentId}`)
        
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
              // FIXED: More conservative prevention check
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
              // FIXED: More conservative prevention check
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
            
            // FIXED: More conservative prevention check
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
              console.log('⚠️ Showing connection issue toast');
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
      
      // FIXED: More conservative prevention check
      if (shouldPreventTrainingAction('check')) {
        console.log('🚫 Prevented checkTrainingCompletion');
        return;
      }
      
      // FIXED: Reduced debounce time
      if (now - lastCompletionCheckRef.current < 2000) {
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

      console.log('🔍 FIXED: Checking training completion for', agentSources.length, 'sources');

      for (const source of agentSources as DatabaseSource[]) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          const { data: pages } = await supabase
            .from('source_pages')
            .select('id, url, processing_status, status')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          if (pages && pages.length > 0) {
            const pendingPages = pages.filter(p => 
              !p.processing_status || 
              p.processing_status === 'pending' || 
              p.processing_status === null
            );
            const processingPages = pages.filter(p => p.processing_status === 'processing');
            const processedPages = pages.filter(p => p.processing_status === 'processed');
            const failedPages = pages.filter(p => p.processing_status === 'failed');

            console.log(`📊 Website source ${source.title}:`, {
              totalPages: pages.length,
              pending: pendingPages.length,
              processing: processingPages.length,
              processed: processedPages.length,
              failed: failedPages.length
            });

            if (failedPages.length > 0) {
              hasFailedSources = true;
            }

            if (pendingPages.length > 0 || processingPages.length > 0) {
              sourcesNeedingTraining.push(source);
              console.log(`✅ NEEDS TRAINING: ${source.title} has ${pendingPages.length + processingPages.length} unprocessed pages`);
            } else {
              console.log(`✅ PROCESSED: ${source.title} all pages processed`);
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
              
              if (metadata.processing_status === 'processing') {
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

      // FIXED: Better status determination with user-initiated training awareness
      let status: 'idle' | 'training' | 'completed' | 'failed' = 'idle';
      
      console.log('🔍 FIXED Status determination:', {
        sourcesNeedingTraining: sourcesNeedingTraining.length,
        currentlyProcessingPages: currentlyProcessingPages.length,
        hasFailedSources,
        totalPagesNeedingProcessing,
        totalPagesProcessed,
        trainingInitiatedByUser: trainingInitiatedByUserRef.current,
        globalTrainingActive: globalTrainingActiveRef.current
      });
      
      if (hasFailedSources && sourcesNeedingTraining.length === 0) {
        status = 'failed';
        console.log('❌ Status: FAILED (has failed sources, no pending)');
      } else if (currentlyProcessingPages.length > 0 || globalTrainingActiveRef.current) {
        status = 'training';
        console.log('🔄 Status: TRAINING (pages currently processing or training active)');
      } else if (sourcesNeedingTraining.length === 0 && totalPagesNeedingProcessing > 0) {
        status = 'completed';
        console.log('✅ Status: COMPLETED (no sources need training, all processed)');
      } else {
        status = 'idle';
        console.log('⏸️ Status: IDLE (default state)');
      }

      // FIXED: Better session management - don't regenerate sessions unnecessarily
      let sessionId = currentTrainingSessionRef.current;
      
      if (!sessionId && (status === 'training' || trainingInitiatedByUserRef.current)) {
        sessionId = `${agentId}-${Date.now()}`;
        currentTrainingSessionRef.current = sessionId;
        console.log('🆔 Created new session for active training:', sessionId);
      } else if (!sessionId) {
        sessionId = `${agentId}-check`;
        console.log('🔍 Using temporary session for check:', sessionId);
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

      console.log('📊 FIXED Training status update:', {
        status,
        sessionId,
        progress,
        sourcesNeedingTraining: sourcesNeedingTraining.length,
        currentState: trainingStateRef.current,
        gracePeriodActive: agentCompletionStateRef.current.gracePeriodActive
      });

      setTrainingProgress(newProgress);

      // FIXED: Handle status transitions with better state management
      const previousStatus = trainingStateRef.current;
      trainingStateRef.current = status;

      // Training completed - FIXED: Only trigger completion once per session
      if (status === 'completed' && 
          previousStatus !== 'completed' &&
          totalPagesNeedingProcessing > 0 &&
          totalPagesProcessed === totalPagesNeedingProcessing &&
          !completedSessionsRef.current.has(sessionId) &&
          !agentCompletionStateRef.current.gracePeriodActive) {
        
        console.log('🎉 FIXED COMPLETION! Processing completion for session:', sessionId);
        
        // CRITICAL: Mark agent-level completion IMMEDIATELY
        markAgentCompletion(sessionId);
        
        // Mark all parent sources as trained
        await markParentSourcesAsTrained(agentId);
        
        // Reset user-initiated flag
        trainingInitiatedByUserRef.current = false;
        
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

      // Training failed
      if (status === 'failed' && previousStatus !== 'failed') {
        console.log('❌ Training failed for session:', sessionId);
        
        clearAllTimers();
        globalTrainingActiveRef.current = false;
        trainingInitiatedByUserRef.current = false;
        
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
      console.error('Error in FIXED checkTrainingCompletion:', error);
      setTrainingProgress(prev => prev ? { ...prev, status: 'failed' } : null);
    }
  };

  const startTraining = async () => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting FIXED training for agent:', agentId);

      // FIXED: More conservative prevention check for starts
      if (shouldPreventTrainingAction('start')) {
        console.log('🚫 PREVENTED training start - conditions not met');
        return;
      }

      // FIXED: Set user-initiated flag and reset completion state properly
      trainingInitiatedByUserRef.current = true;
      
      console.log('🔄 Resetting completion state for new user-initiated training');
      agentCompletionStateRef.current = {
        isCompleted: false,
        completedAt: 0,
        lastCompletedSessionId: '',
        gracePeriodActive: false
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
        trainingInitiatedByUserRef.current = false;
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

      // Check completion after processing
      if (!agentCompletionStateRef.current.gracePeriodActive) {
        addTrackedTimer(() => checkTrainingCompletion(agentId), 2000);
      }

    } catch (error) {
      console.error('Failed to start FIXED training:', error);
      
      trainingStateRef.current = 'failed';
      globalTrainingActiveRef.current = false;
      trainingInitiatedByUserRef.current = false;
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
