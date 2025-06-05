
import { useState, useCallback, useEffect, useRef } from 'react';
import { EnhancedRetrainingChecker, type EnhancedRetrainingStatus } from '@/services/rag/retraining/enhancedRetrainingChecker';
import { useToast } from '@/hooks/use-toast';
import { useTrainingNotifications } from '@/hooks/useTrainingNotifications';

interface SessionBasedToast {
  id: string;
  sessionId: string;
  type: 'crawl_started' | 'crawl_completed' | 'training_started' | 'training_completed';
  shown: boolean;
}

export const useEnhancedAgentRetraining = (agentId?: string) => {
  // ALL useRef calls MUST be at the top to maintain consistent hook order
  const isTrainingActiveRef = useRef(false);
  const lastStatusUpdateRef = useRef<string>('');
  const lastLogTimeRef = useRef<number>(0);
  const currentSessionRef = useRef<string>('');
  const sessionToastsRef = useRef<Map<string, SessionBasedToast[]>>(new Map());
  const dialogLockedRef = useRef(false);
  
  // ALL useState calls MUST come after useRef calls
  const [progress, setProgress] = useState<any>(null);
  const [retrainingNeeded, setRetrainingNeeded] = useState<EnhancedRetrainingStatus | null>(null);
  
  // ALL custom hooks MUST come after useState calls
  const { toast } = useToast();
  const { trainingProgress, startTraining } = useTrainingNotifications();

  const isRetraining = trainingProgress?.status === 'training' || trainingProgress?.status === 'initializing';

  /**
   * Generate unique session ID for toast deduplication
   */
  const generateSessionId = useCallback(() => {
    const sessionId = `${agentId}-${Date.now()}`;
    currentSessionRef.current = sessionId;
    sessionToastsRef.current.set(sessionId, []);
    console.log('🆔 Generated new session ID:', sessionId);
    return sessionId;
  }, [agentId]);

  /**
   * Show session-based toast with deduplication
   */
  const showSessionToast = useCallback((
    sessionId: string, 
    type: SessionBasedToast['type'], 
    title: string, 
    description: string
  ) => {
    const sessionToasts = sessionToastsRef.current.get(sessionId) || [];
    const existingToast = sessionToasts.find(t => t.type === type);
    
    if (existingToast && existingToast.shown) {
      console.log(`🚫 Toast "${type}" already shown for session ${sessionId}`);
      return;
    }

    const toastId = `${sessionId}-${type}`;
    console.log(`🎯 Showing session toast: ${type} for session ${sessionId}`);
    
    toast({
      id: toastId,
      title,
      description,
      duration: 3000,
    });

    // Mark as shown
    const newToast: SessionBasedToast = {
      id: toastId,
      sessionId,
      type,
      shown: true
    };

    if (existingToast) {
      existingToast.shown = true;
    } else {
      sessionToasts.push(newToast);
      sessionToastsRef.current.set(sessionId, sessionToasts);
    }
  }, [toast]);

  // ALL useEffect calls MUST come after custom hooks
  useEffect(() => {
    if (trainingProgress) {
      const statusKey = `${trainingProgress.status}-${trainingProgress.progress}`;
      
      if (lastStatusUpdateRef.current === statusKey) {
        return;
      }
      lastStatusUpdateRef.current = statusKey;
      
      const now = Date.now();
      const shouldLog = now - lastLogTimeRef.current > 10000;
      
      if (shouldLog) {
        console.log('🔄 Enhanced training status update:', {
          status: trainingProgress.status,
          progress: trainingProgress.progress,
          totalChunks: trainingProgress.totalChunks,
          processedChunks: trainingProgress.processedChunks,
          sessionId: trainingProgress.sessionId
        });
        lastLogTimeRef.current = now;
      }
      
      // Handle training state transitions with session-based toasts
      if (trainingProgress.status === 'training' || trainingProgress.status === 'initializing') {
        isTrainingActiveRef.current = true;
        
        // Show "Starting Training" toast only once per session
        if (trainingProgress.sessionId && !sessionToastsRef.current.get(trainingProgress.sessionId)?.some(t => t.type === 'training_started' && t.shown)) {
          showSessionToast(trainingProgress.sessionId, 'training_started', '🧠 Training Started', 'Initializing training process...');
        }
      } else if (trainingProgress.status === 'completed') {
        isTrainingActiveRef.current = false;
        
        // Show "Training Completed" toast only once per session
        if (trainingProgress.sessionId && !sessionToastsRef.current.get(trainingProgress.sessionId)?.some(t => t.type === 'training_completed' && t.shown)) {
          showSessionToast(trainingProgress.sessionId, 'training_completed', '🎉 Training Completed', 'Your AI agent is trained and ready.');
          
          // Dispatch training completed event for cross-tab sync
          window.dispatchEvent(new CustomEvent('trainingCompleted', {
            detail: { 
              agentId,
              sessionId: trainingProgress.sessionId,
              status: 'completed'
            }
          }));
        }
        
        currentSessionRef.current = '';
      }
      
      setProgress({
        totalSources: trainingProgress.totalSources,
        processedSources: trainingProgress.processedSources,
        totalChunks: trainingProgress.totalChunks || 0,
        processedChunks: trainingProgress.processedChunks || 0,
        status: trainingProgress.status === 'training' ? 'processing' : 
               trainingProgress.status === 'completed' ? 'completed' : 
               trainingProgress.status === 'initializing' ? 'pending' : 'pending'
      });
    }
  }, [trainingProgress, showSessionToast, agentId]);

  /**
   * Enhanced retraining check with race condition prevention
   */
  const checkRetrainingNeeded = useCallback(async (forceRefresh = false) => {
    if (!agentId) return;

    try {
      // Prevent checks while dialog is locked (unless forced)
      if (dialogLockedRef.current && !forceRefresh) {
        console.log('🚫 Skipping retraining check - dialog is locked');
        return retrainingNeeded;
      }

      console.log('🔍 Enhanced retraining check starting...', { forceRefresh, dialogLocked: dialogLockedRef.current });
      
      const result = await EnhancedRetrainingChecker.checkRetrainingNeeded(agentId);
      setRetrainingNeeded(result);
      
      console.log('📋 Enhanced retraining check completed:', {
        needed: result.needed,
        status: result.status,
        unprocessedCount: result.unprocessedSources
      });
      
      return result;
    } catch (error) {
      console.error('Failed to check enhanced retraining status:', error);
      toast({
        title: "Error",
        description: "Failed to check retraining status",
        variant: "destructive"
      });
    }
  }, [agentId, toast, retrainingNeeded]);

  /**
   * Start retraining with session management
   */
  const startRetraining = useCallback(async () => {
    if (!agentId || isTrainingActiveRef.current) {
      return;
    }

    console.log('🚀 Starting enhanced retraining...');
    isTrainingActiveRef.current = true;

    try {
      // Generate session ID for this training run
      const sessionId = generateSessionId();
      
      await startTraining();
      
      console.log('🔄 Enhanced training started with session:', sessionId);

    } catch (error) {
      console.error('Enhanced retraining failed:', error);
      isTrainingActiveRef.current = false;
      currentSessionRef.current = '';
      
      toast({
        title: "Training Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [agentId, startTraining, generateSessionId, toast]);

  /**
   * Retry failed source
   */
  const retryFailedSource = useCallback(async (sourceId: string, sourceType: string) => {
    try {
      console.log(`🔄 Retrying failed source: ${sourceId}`);
      
      const success = await EnhancedRetrainingChecker.retryFailedSource(sourceId, sourceType);
      
      if (success) {
        toast({
          title: "Retry Initiated",
          description: "The failed source will be reprocessed.",
        });
        
        // Refresh retraining status after a delay
        setTimeout(() => checkRetrainingNeeded(true), 2000);
      } else {
        throw new Error('Retry operation failed');
      }
    } catch (error) {
      console.error('Failed to retry source:', error);
      toast({
        title: "Retry Failed",
        description: "Could not retry the failed source. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast, checkRetrainingNeeded]);

  /**
   * Lock/unlock dialog to prevent polling interference
   */
  const setDialogLocked = useCallback((locked: boolean) => {
    dialogLockedRef.current = locked;
    console.log(`🔒 Dialog lock ${locked ? 'engaged' : 'released'}`);
  }, []);

  /**
   * Handle crawl events with session-based toasts
   */
  const handleCrawlStarted = useCallback((eventData: any) => {
    const sessionId = generateSessionId();
    showSessionToast(sessionId, 'crawl_started', '🕷️ Crawling Started', 'Discovering and fetching pages...');
  }, [generateSessionId, showSessionToast]);

  const handleCrawlCompleted = useCallback((eventData: any) => {
    const sessionId = currentSessionRef.current || generateSessionId();
    showSessionToast(sessionId, 'crawl_completed', '✅ Crawling Completed', 'All pages have been crawled.');
    
    // Wait for database writes to complete before checking retraining status
    setTimeout(() => {
      console.log('🔄 Checking retraining status after crawl completion...');
      checkRetrainingNeeded(true);
    }, 1000);
  }, [showSessionToast, generateSessionId, checkRetrainingNeeded]);

  // Listen for crawl events
  useEffect(() => {
    const handleCrawlEvents = (event: CustomEvent) => {
      if (event.type === 'crawlStarted') {
        handleCrawlStarted(event.detail);
      } else if (event.type === 'crawlCompleted') {
        handleCrawlCompleted(event.detail);
      }
    };

    window.addEventListener('crawlStarted', handleCrawlEvents as EventListener);
    window.addEventListener('crawlCompleted', handleCrawlEvents as EventListener);
    
    return () => {
      window.removeEventListener('crawlStarted', handleCrawlEvents as EventListener);
      window.removeEventListener('crawlCompleted', handleCrawlEvents as EventListener);
    };
  }, [handleCrawlStarted, handleCrawlCompleted]);

  return {
    isRetraining,
    progress,
    retrainingNeeded,
    startRetraining,
    checkRetrainingNeeded,
    retryFailedSource,
    setDialogLocked,
    trainingProgress,
    currentSessionId: currentSessionRef.current
  };
};
