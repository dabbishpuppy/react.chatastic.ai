
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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

  // Use ref to track previous values to prevent infinite updates
  const prevTrainingProgressRef = useRef(trainingProgress);

  // Stabilize the check function to prevent infinite loops
  const checkRetrainingNeeded = useCallback(async () => {
    if (!agentId) return;

    try {
      // Only check if training progress actually changed
      const currentProgress = trainingProgress;
      const prevProgress = prevTrainingProgressRef.current;
      
      if (currentProgress === prevProgress) return;
      
      prevTrainingProgressRef.current = currentProgress;
      
      const needed = currentProgress?.status !== 'completed' && (currentProgress?.totalSources || 0) > 0;
      
      setRetrainingNeeded({
        needed,
        reasons: needed ? ['Sources have been updated'] : [],
        sourceDetails: []
      });
    } catch (error) {
      console.error('Error checking retraining status:', error);
    }
  }, [agentId, trainingProgress]);

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

  // Update progress based on training progress - only when it actually changes
  useEffect(() => {
    if (!trainingProgress) return;
    
    const newProgress = {
      totalSources: trainingProgress.totalSources,
      processedSources: trainingProgress.processedSources,
      totalChunks: 0,
      processedChunks: 0,
      status: trainingProgress.status === 'training' ? 'processing' as const : 
              trainingProgress.status === 'completed' ? 'completed' as const : 'pending' as const
    };

    setProgress(newProgress);

    if (trainingProgress.status === 'completed' || trainingProgress.status === 'failed') {
      setIsRetraining(false);
    }
  }, [trainingProgress?.status, trainingProgress?.totalSources, trainingProgress?.processedSources]);

  return {
    isRetraining,
    progress,
    retrainingNeeded,
    startRetraining,
    checkRetrainingNeeded,
    trainingProgress
  };
};
