
import { useState, useCallback, useEffect, useRef } from 'react';
import { RetrainingService, type RetrainingProgress } from '@/services/rag/retrainingService';
import { useToast } from '@/hooks/use-toast';
import { useTrainingNotifications } from '@/hooks/useTrainingNotifications';

export const useAgentRetraining = (agentId?: string) => {
  // ALL useRef calls MUST be at the top to maintain consistent hook order
  const isTrainingActiveRef = useRef(false);
  const lastStatusUpdateRef = useRef<string>('');
  const lastLogTimeRef = useRef<number>(0);
  const hasShownStartToastRef = useRef(false);
  const currentSessionRef = useRef<string>('');
  
  // ALL useState calls MUST come after useRef calls
  const [progress, setProgress] = useState<RetrainingProgress | null>(null);
  const [retrainingNeeded, setRetrainingNeeded] = useState<{
    needed: boolean;
    unprocessedSources: number;
    reasons: string[];
    status: 'up_to_date' | 'needs_processing' | 'needs_reprocessing' | 'no_sources';
    message: string;
    sourceDetails?: Array<{
      id: string;
      title: string;
      type: string;
      reason: string;
      status: string;
    }>;
  } | null>(null);
  
  // ALL custom hooks MUST come after useState calls
  const { toast } = useToast();
  const { trainingProgress, startTraining } = useTrainingNotifications();

  const isRetraining = trainingProgress?.status === 'training' || trainingProgress?.status === 'initializing';

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
        console.log('🔄 Training status update:', {
          status: trainingProgress.status,
          progress: trainingProgress.progress,
          totalChunks: trainingProgress.totalChunks,
          processedChunks: trainingProgress.processedChunks,
          sessionId: trainingProgress.sessionId
        });
        lastLogTimeRef.current = now;
      }
      
      if (trainingProgress.status === 'training' || trainingProgress.status === 'initializing') {
        isTrainingActiveRef.current = true;
      } else if (trainingProgress.status === 'completed') {
        isTrainingActiveRef.current = false;
        // Reset toast flag when training completes
        hasShownStartToastRef.current = false;
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
  }, [trainingProgress]);

  const checkRetrainingNeeded = useCallback(async () => {
    if (!agentId) return;

    try {
      const result = await RetrainingService.checkRetrainingNeeded(agentId);
      setRetrainingNeeded(result);
      return result;
    } catch (error) {
      console.error('Failed to check retraining status:', error);
      toast({
        title: "Error",
        description: "Failed to check retraining status",
        variant: "destructive"
      });
    }
  }, [agentId, toast]);

  const startRetraining = useCallback(async () => {
    if (!agentId || isTrainingActiveRef.current) {
      return;
    }

    console.log('🚀 Starting retraining...');
    isTrainingActiveRef.current = true;

    try {
      await startTraining();
      
      // Show "Training Started" toast only once per session
      const sessionId = trainingProgress?.sessionId || `${agentId}-${Date.now()}`;
      if (!hasShownStartToastRef.current || currentSessionRef.current !== sessionId) {
        console.log('🧠 Showing training start toast for session:', sessionId);
        toast({
          title: "🧠 Training Started",
          description: "Initializing training process...",
          duration: 3000,
        });
        hasShownStartToastRef.current = true;
        currentSessionRef.current = sessionId;
      }

      // Do not immediately check retraining status to prevent "up to date" override
      console.log('🔄 Training started - not checking retraining status to prevent premature "up to date"');

    } catch (error) {
      console.error('Retraining failed:', error);
      isTrainingActiveRef.current = false;
      hasShownStartToastRef.current = false;
      currentSessionRef.current = '';
      
      toast({
        title: "Training Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [agentId, startTraining, toast, trainingProgress?.sessionId]);

  return {
    isRetraining,
    progress,
    retrainingNeeded,
    startRetraining,
    checkRetrainingNeeded,
    trainingProgress
  };
};
