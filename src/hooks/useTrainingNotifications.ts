
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
  
  // Training state management - simplified
  const currentTrainingSessionRef = useRef<string>('');
  const trainingStateRef = useRef<'idle' | 'training' | 'completed' | 'failed'>('idle');
  const completedSessionsRef = useRef<Set<string>>(new Set());
  const lastCompletionCheckRef = useRef<number>(0);
  
  // Toast tracking - prevent duplicates
  const shownToastsRef = useRef<Set<string>>(new Set());
  
  // NEW: Timer tracking for cleanup
  const pendingTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  // NEW: Completion flag to prevent restart logic
  const sessionCompletionFlagRef = useRef<Set<string>>(new Set());
  
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // NEW: Helper function to clear all pending timers
  const clearAllTimers = () => {
    console.log(`🧹 Clearing ${pendingTimersRef.current.size} pending timers`);
    pendingTimersRef.current.forEach(timer => clearTimeout(timer));
    pendingTimersRef.current.clear();
  };

  // NEW: Helper function to add tracked timer
  const addTrackedTimer = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      pendingTimersRef.current.delete(timer);
      callback();
    }, delay);
    pendingTimersRef.current.add(timer);
    return timer;
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

    console.log('🔔 Setting up simplified training notifications for agent:', agentId);

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
        .channel(`simplified-training-notifications-${agentId}`)
        
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
              // NEW: Use tracked timer for debounced check
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
              // NEW: Use tracked timer for debounced check
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
            addTrackedTimer(() => checkTrainingCompletion(agentId), 1000);
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
            
            pollInterval = setInterval(() => checkTrainingCompletion(agentId), 15000);
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
      
      // Debounce to prevent excessive calls
      if (now - lastCompletionCheckRef.current < 3000) {
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

      // Session ID management
      const sessionId = currentTrainingSessionRef.current || `${agentId}-${Date.now()}`;

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
        currentState: trainingStateRef.current
      });

      setTrainingProgress(newProgress);

      // Handle status transitions with proper toast management
      const previousStatus = trainingStateRef.current;
      trainingStateRef.current = status;

      // Training completed - show toast only once and clear timers
      if (status === 'completed' && 
          previousStatus !== 'completed' &&
          totalPagesNeedingProcessing > 0 &&
          totalPagesProcessed === totalPagesNeedingProcessing &&
          !completedSessionsRef.current.has(sessionId)) {
        
        console.log('🎉 Training completed! Showing success notification for session:', sessionId);
        
        // NEW: Mark session as completed and clear timers
        completedSessionsRef.current.add(sessionId);
        sessionCompletionFlagRef.current.add(sessionId);
        clearAllTimers();
        
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

      // Training failed - show toast only once and clear timers
      if (status === 'failed' && previousStatus !== 'failed') {
        console.log('❌ Training failed for session:', sessionId);
        
        // NEW: Clear timers on failure
        clearAllTimers();
        
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
      console.error('Error in simplified checkTrainingCompletion:', error);
      setTrainingProgress(prev => prev ? { ...prev, status: 'failed' } : null);
    }
  };

  const startTraining = async () => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting simplified training for agent:', agentId);

      // Create new session
      const sessionId = `training-${agentId}-${Date.now()}`;
      
      // NEW: Check if this session has already completed (prevent restart after completion)
      if (sessionCompletionFlagRef.current.has(sessionId)) {
        console.log('⚠️ Session already completed, preventing restart:', sessionId);
        return;
      }
      
      currentTrainingSessionRef.current = sessionId;
      trainingStateRef.current = 'training';

      // Clear previous completion state
      completedSessionsRef.current.clear();
      
      // NEW: Clear any pending timers to prevent delayed logic
      clearAllTimers();

      // Show "Training Started" toast immediately - no delays
      const startToastId = `start-${sessionId}`;
      if (!shownToastsRef.current.has(startToastId)) {
        shownToastsRef.current.add(startToastId);
        
        console.log('📢 Showing training start toast immediately for session:', sessionId);
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
      addTrackedTimer(() => checkTrainingCompletion(agentId), 2000);

    } catch (error) {
      console.error('Failed to start simplified training:', error);
      
      trainingStateRef.current = 'failed';
      
      // NEW: Clear timers on error
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
    checkTrainingCompletion: () => agentId && checkTrainingCompletion(agentId),
    isConnected
  };
};
