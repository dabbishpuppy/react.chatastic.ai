
import { useState, useCallback, useEffect, useRef } from 'react';
import { RetrainingService, type RetrainingProgress } from '@/services/rag/retrainingService';
import { useToast } from '@/hooks/use-toast';
import { useTrainingNotifications } from '@/hooks/useTrainingNotifications';

export const useAgentRetraining = (agentId?: string) => {
  const { toast } = useToast();
  const { trainingProgress, startTraining } = useTrainingNotifications();
  
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

  // Add state guards to prevent race conditions
  const isTrainingActiveRef = useRef(false);
  const lastStatusUpdateRef = useRef<string>('');

  // Simplified status determination
  const isRetraining = trainingProgress?.status === 'training';

  // Guard against rapid state changes
  useEffect(() => {
    if (trainingProgress) {
      const statusKey = `${trainingProgress.status}-${trainingProgress.progress}`;
      
      // Prevent duplicate status updates
      if (lastStatusUpdateRef.current === statusKey) {
        return;
      }
      lastStatusUpdateRef.current = statusKey;
      
      console.log('🔄 useAgentRetraining - Status update:', trainingProgress);
      
      // Update progress state with guard
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
      console.log('🔍 Checking retraining status for agent:', agentId);
      const result = await RetrainingService.checkRetrainingNeeded(agentId);
      console.log('📋 Retraining check result:', result);
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
      console.log('⚠️ Cannot start training:', { agentId, isTrainingActive: isTrainingActiveRef.current });
      return;
    }

    console.log('🚀 Starting retraining via training notifications system');
    isTrainingActiveRef.current = true;

    try {
      await startTraining();

      toast({
        title: "Training Started",
        description: "Processing your sources and generating embeddings..."
      });

      // Refresh retraining status after starting
      setTimeout(() => {
        checkRetrainingNeeded();
      }, 1500);

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
