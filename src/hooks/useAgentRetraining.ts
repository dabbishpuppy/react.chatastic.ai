
import { useState, useCallback, useEffect } from 'react';
import { RetrainingService, type RetrainingProgress } from '@/services/rag/retrainingService';
import { useToast } from '@/hooks/use-toast';
import { useTrainingNotifications } from '@/hooks/useTrainingNotifications';

export const useAgentRetraining = (agentId?: string) => {
  // Always call hooks in the same order - move useToast to top
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

  // Sync all state with training notifications system
  const isRetraining = trainingProgress?.status === 'training';

  useEffect(() => {
    if (trainingProgress) {
      console.log('🔄 useAgentRetraining - Syncing with trainingProgress:', trainingProgress);
      
      // Update progress state to match training notifications
      setProgress({
        totalSources: trainingProgress.totalSources,
        processedSources: trainingProgress.processedSources,
        totalChunks: 0, // Not used in new system
        processedChunks: 0, // Not used in new system
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
    if (!agentId || isRetraining) return;

    console.log('🚀 Starting retraining via training notifications system');

    try {
      // Use the training notifications system to start training
      await startTraining();

      toast({
        title: "Training Started",
        description: "Processing your sources and generating embeddings..."
      });

    } catch (error) {
      console.error('Retraining failed:', error);
      toast({
        title: "Training Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [agentId, isRetraining, startTraining, toast]);

  return {
    isRetraining,
    progress,
    retrainingNeeded,
    startRetraining,
    checkRetrainingNeeded,
    // Expose trainingProgress for components that need direct access
    trainingProgress
  };
};
