
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTrainingNotifications } from './useTrainingNotifications';

interface RetrainingNeeded {
  needed: boolean;
  reasons: string[];
  sourceDetails: Array<{
    id: string;
    title: string;
    type: string;
    reason: string;
    status: string;
  }>;
}

interface RetrainingProgress {
  totalSources: number;
  processedSources: number;
  totalChunks: number;
  processedChunks: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

export const useAgentRetraining = (agentId?: string) => {
  const [isRetraining, setIsRetraining] = useState(false);
  const [progress, setProgress] = useState<RetrainingProgress | null>(null);
  const [retrainingNeeded, setRetrainingNeeded] = useState<RetrainingNeeded | null>(null);
  
  const { trainingProgress, startTraining } = useTrainingNotifications();

  // Memoize the check function to prevent infinite loops
  const checkRetrainingNeeded = useCallback(async () => {
    if (!agentId) return;

    try {
      // This would normally call an API to check if retraining is needed
      // For now, we'll use a simple check based on training progress
      const needed = trainingProgress?.status !== 'completed' && trainingProgress?.totalSources > 0;
      
      setRetrainingNeeded({
        needed,
        reasons: needed ? ['Sources have been updated'] : [],
        sourceDetails: []
      });
    } catch (error) {
      console.error('Error checking retraining status:', error);
    }
  }, [agentId, trainingProgress?.status, trainingProgress?.totalSources]);

  const startRetraining = useCallback(async () => {
    if (!agentId) return;
    
    setIsRetraining(true);
    setProgress({
      totalSources: 0,
      processedSources: 0,
      totalChunks: 0,
      processedChunks: 0,
      status: 'pending'
    });

    try {
      await startTraining();
    } catch (error) {
      console.error('Failed to start retraining:', error);
      setIsRetraining(false);
    }
  }, [agentId, startTraining]);

  // Update progress based on training progress
  useEffect(() => {
    if (trainingProgress) {
      setProgress({
        totalSources: trainingProgress.totalSources,
        processedSources: trainingProgress.processedSources,
        totalChunks: 0,
        processedChunks: 0,
        status: trainingProgress.status === 'training' ? 'processing' : 
                trainingProgress.status === 'completed' ? 'completed' : 'pending'
      });

      if (trainingProgress.status === 'completed' || trainingProgress.status === 'failed') {
        setIsRetraining(false);
      }
    }
  }, [trainingProgress]);

  return {
    isRetraining,
    progress,
    retrainingNeeded,
    startRetraining,
    checkRetrainingNeeded,
    trainingProgress
  };
};
