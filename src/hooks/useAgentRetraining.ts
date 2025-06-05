
import { useState, useCallback, useEffect } from 'react';
import { useTrainingNotifications } from './useTrainingNotifications';
import { RetrainingService, RetrainingStatus } from '@/services/rag/retrainingService';
import { supabase } from '@/integrations/supabase/client';

export const useAgentRetraining = (agentId?: string) => {
  const [retrainingNeeded, setRetrainingNeeded] = useState<RetrainingStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  
  const {
    trainingProgress,
    startTraining,
    isConnected
  } = useTrainingNotifications();

  const checkRetrainingNeeded = useCallback(async () => {
    if (!agentId || isCheckingStatus) return;
    
    setIsCheckingStatus(true);
    try {
      console.log('🔍 Checking if retraining is needed for agent:', agentId);
      const status = await RetrainingService.checkRetrainingNeeded(agentId);
      console.log('📊 Retraining status:', status);
      setRetrainingNeeded(status);
    } catch (error) {
      console.error('❌ Error checking retraining status:', error);
      setRetrainingNeeded({
        needed: false,
        unprocessedSources: 0,
        reasons: [],
        status: 'up_to_date',
        message: 'Unable to check training status'
      });
    } finally {
      setIsCheckingStatus(false);
    }
  }, [agentId, isCheckingStatus]);

  const startRetraining = useCallback(async () => {
    if (!agentId) {
      console.error('❌ No agent ID provided for retraining');
      return;
    }

    console.log('🚀 Starting retraining for agent:', agentId);
    
    try {
      // Call the training notifications hook to start the process
      await startTraining();
      console.log('✅ Training started successfully');
      
      // Refresh the status after a delay
      setTimeout(() => {
        checkRetrainingNeeded();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Failed to start retraining:', error);
      throw error;
    }
  }, [agentId, startTraining, checkRetrainingNeeded]);

  // Check status when agent changes
  useEffect(() => {
    if (agentId) {
      checkRetrainingNeeded();
    }
  }, [agentId, checkRetrainingNeeded]);

  // Listen for training completion events
  useEffect(() => {
    const handleTrainingCompleted = () => {
      console.log('🎉 Training completed event received in useAgentRetraining');
      setTimeout(() => {
        checkRetrainingNeeded();
      }, 1000);
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted);
    
    return () => {
      window.removeEventListener('trainingCompleted', handleTrainingCompleted);
    };
  }, [checkRetrainingNeeded]);

  return {
    retrainingNeeded,
    isRetraining: trainingProgress?.status === 'training',
    progress: trainingProgress ? {
      totalSources: trainingProgress.totalSources,
      processedSources: trainingProgress.processedSources,
      totalChunks: 0,
      processedChunks: 0,
      status: trainingProgress.status === 'training' ? 'processing' as const : 
              trainingProgress.status === 'completed' ? 'completed' as const :
              trainingProgress.status === 'failed' ? 'failed' as const : 'pending' as const,
      currentSource: undefined,
      errorMessage: undefined
    } : null,
    startRetraining,
    checkRetrainingNeeded,
    trainingProgress,
    isConnected
  };
};
