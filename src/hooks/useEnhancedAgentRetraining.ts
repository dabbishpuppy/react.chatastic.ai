
import { useState, useCallback, useEffect, useRef } from 'react';
import { EnhancedRetrainingChecker, type EnhancedRetrainingStatus } from '@/services/rag/retraining/enhancedRetrainingChecker';
import { useToast } from '@/hooks/use-toast';
import { useTrainingNotifications } from '@/hooks/useTrainingNotifications';
import { ToastNotificationService } from '@/services/ToastNotificationService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Phase 5: Session-based toast management interface
 */
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
  const hasStartToastFiredRef = useRef(false); // Phase 5: Debounce "Starting Training" toast
  
  // ALL useState calls MUST come after useRef calls
  const [progress, setProgress] = useState<any>(null);
  const [retrainingNeeded, setRetrainingNeeded] = useState<EnhancedRetrainingStatus | null>(null);
  
  // ALL custom hooks MUST come after useState calls
  const { toast } = useToast();
  const { trainingProgress, startTraining } = useTrainingNotifications();

  const isRetraining = trainingProgress?.status === 'training' || trainingProgress?.status === 'initializing';

  /**
   * Phase 5: Generate unique session ID for toast deduplication
   */
  const generateSessionId = useCallback(() => {
    const sessionId = `${agentId}-${Date.now()}`;
    currentSessionRef.current = sessionId;
    sessionToastsRef.current.set(sessionId, []);
    console.log('🆔 Generated new session ID:', sessionId);
    return sessionId;
  }, [agentId]);

  /**
   * Trigger status aggregation for website parent sources after training completion
   */
  const triggerStatusAggregationForWebsiteSources = useCallback(async () => {
    if (!agentId) return;

    try {
      console.log('🔄 Triggering status aggregation for website sources after training completion');
      
      // Get all website parent sources for this agent
      const { data: websiteParentSources, error } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('agent_id', agentId)
        .eq('source_type', 'website')
        .is('parent_source_id', null)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching website parent sources:', error);
        return;
      }

      if (websiteParentSources && websiteParentSources.length > 0) {
        console.log(`📊 Found ${websiteParentSources.length} website parent sources to update`);
        
        // Trigger status aggregation for each parent source
        for (const parentSource of websiteParentSources) {
          try {
            const { data, error: aggregationError } = await supabase.functions.invoke('status-aggregator', {
              body: { 
                parentSourceId: parentSource.id,
                eventType: 'training_completion_metadata_update'
              }
            });

            if (aggregationError) {
              console.error(`❌ Failed to aggregate status for parent ${parentSource.id}:`, aggregationError);
            } else {
              console.log(`✅ Status aggregated for parent: ${parentSource.id}`);
            }
          } catch (error) {
            console.error(`❌ Error aggregating status for parent ${parentSource.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error triggering status aggregation:', error);
    }
  }, [agentId]);

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
      
      // Phase 5: Handle training state transitions with enhanced toasts
      if (trainingProgress.status === 'training' || trainingProgress.status === 'initializing') {
        isTrainingActiveRef.current = true;
        
        // Show "Starting Training" toast only once per session using debouncing
        if (trainingProgress.sessionId && !hasStartToastFiredRef.current) {
          ToastNotificationService.showTrainingStarted();
          hasStartToastFiredRef.current = true;
        }
      } else if (trainingProgress.status === 'completed') {
        isTrainingActiveRef.current = false;
        hasStartToastFiredRef.current = false; // Reset for next session
        
        // Show enhanced "Training Completed" toast
        ToastNotificationService.showTrainingCompleted();
        
        // Phase 4: Dispatch training completed event for cross-tab sync
        window.dispatchEvent(new CustomEvent('trainingCompleted', {
          detail: { 
            agentId,
            sessionId: trainingProgress.sessionId,
            status: 'completed'
          }
        }));

        // Trigger status aggregation for website sources to update metadata
        setTimeout(() => {
          triggerStatusAggregationForWebsiteSources();
        }, 2000); // Wait 2 seconds for all training operations to complete
        
        currentSessionRef.current = '';
      }
      
      // Phase 7: Enhanced progress tracking with chunks prioritized
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
  }, [trainingProgress, agentId, triggerStatusAggregationForWebsiteSources]);

  /**
   * Phase 6: Enhanced retraining check with race condition prevention
   */
  const checkRetrainingNeeded = useCallback(async (forceRefresh = false) => {
    if (!agentId) return;

    try {
      // Phase 4: Prevent checks while dialog is locked (unless forced)
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
   * Phase 5: Start retraining with session management
   */
  const startRetraining = useCallback(async () => {
    if (!agentId || isTrainingActiveRef.current) {
      return;
    }

    console.log('🚀 Starting enhanced retraining...');
    isTrainingActiveRef.current = true;
    hasStartToastFiredRef.current = false; // Reset toast flag

    try {
      // Phase 5: Generate session ID for this training run
      const sessionId = generateSessionId();
      
      await startTraining();
      
      console.log('🔄 Enhanced training started with session:', sessionId);

    } catch (error) {
      console.error('Enhanced retraining failed:', error);
      isTrainingActiveRef.current = false;
      hasStartToastFiredRef.current = false;
      currentSessionRef.current = '';
      
      toast({
        title: "Training Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [agentId, startTraining, generateSessionId, toast]);

  /**
   * Phase 2: Retry failed source
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
        
        // Phase 3: Refresh retraining status after a delay to avoid race conditions
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
   * Phase 4: Lock/unlock dialog to prevent polling interference
   */
  const setDialogLocked = useCallback((locked: boolean) => {
    dialogLockedRef.current = locked;
    console.log(`🔒 Dialog lock ${locked ? 'engaged' : 'released'}`);
  }, []);

  /**
   * Phase 5: Handle crawl events with enhanced toasts
   */
  const handleCrawlStarted = useCallback((eventData: any) => {
    const sessionId = generateSessionId();
    ToastNotificationService.showCrawlingStarted();
  }, [generateSessionId]);

  const handleCrawlCompleted = useCallback((eventData: any) => {
    ToastNotificationService.showCrawlingCompleted();
    
    // Phase 3: Wait for database writes to complete before checking retraining status
    setTimeout(() => {
      console.log('🔄 Checking retraining status after crawl completion...');
      checkRetrainingNeeded(true);
    }, 1000);
  }, [checkRetrainingNeeded]);

  // Phase 4: Listen for crawl events
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
