
import { useState, useCallback, useEffect, useRef } from 'react';
import { RetrainingService, type RetrainingProgress } from '@/services/rag/retrainingService';
import { useToast } from '@/hooks/use-toast';
import { useTrainingNotifications } from '@/hooks/useTrainingNotifications';

export const useAgentRetraining = (agentId?: string) => {
  // ALL useRef calls MUST be at the top to maintain consistent hook order
  const isTrainingActiveRef = useRef(false);
  const lastStatusUpdateRef = useRef<string>('');
  const lastLogTimeRef = useRef<number>(0);
  
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

  const isRetraining = trainingProgress?.status === 'training';

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
          progress: trainingProgress.progress
        });
        lastLogTimeRef.current = now;
      }
      
      if (trainingProgress.status === 'training') {
        isTrainingActiveRef.current = true;
      } else if (trainingProgress.status === 'completed') {
        isTrainingActiveRef.current = false;
      }
      
      setProgress({
        totalSources: trainingProgress.totalSources,
        processedSources: trainingProgress.processedSources,
        totalChunks: 0,
        processedChunks: 0,
        status: trainingProgress.status === 'training' ? 'processing' : 
               trainingProgress.status === 'completed' ? 'completed' : 'pending'
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

      toast({
        title: "Training Started",
        description: "Processing your sources and generating embeddings..."
      });

      setTimeout(() => {
        checkRetrainingNeeded();
      }, 3000);

    } catch (error) {
      console.error('Retraining failed:', error);
      isTrainingActiveRef.current = false;
      
      toast({
        title: "Training Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [agentId, startTraining, toast, checkRetrainingNeeded]);

  return {
    isRetraining,
    progress,
    retrainingNeeded,
    startRetraining,
    checkRetrainingNeeded,
    trainingProgress
  };
};
