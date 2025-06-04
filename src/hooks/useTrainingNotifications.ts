
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';
import { useTrainingSubscriptions } from './training/useTrainingSubscriptions';
import { useTrainingProgressCalculation } from './training/useTrainingProgressCalculation';
import { useTrainingOperations } from './training/useTrainingOperations';

interface TrainingProgress {
  agentId: string;
  status: 'idle' | 'training' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
  currentlyProcessing?: string[];
}

export const useTrainingNotifications = () => {
  const { agentId } = useParams();
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [websiteSources, setWebsiteSources] = useState<string[]>([]);
  const lastCompletionStatusRef = useRef<string | null>(null);

  const { calculateTrainingProgress } = useTrainingProgressCalculation();
  const { startTraining: performTraining } = useTrainingOperations();

  const checkTrainingCompletion = useCallback(async (targetAgentId: string) => {
    const progress = await calculateTrainingProgress(targetAgentId);
    if (progress) {
      setTrainingProgress(progress);

      // Only show completion notification for genuine completions
      const wasCompleted = lastCompletionStatusRef.current === 'completed';
      const isNowCompleted = progress.status === 'completed';
      
      if (isNowCompleted && !wasCompleted && progress.totalSources > 0) {
        toast({
          title: "Training Complete!",
          description: "Your AI agent is trained and ready",
          duration: 8000,
        });

        window.dispatchEvent(new CustomEvent('trainingCompleted', {
          detail: { agentId: targetAgentId, progress }
        }));
      }
      
      lastCompletionStatusRef.current = progress.status;
    }
  }, [calculateTrainingProgress]);

  // Stabilize website sources to prevent subscription issues
  const stableWebsiteSources = useMemo(() => {
    return websiteSources.sort().join(',');
  }, [websiteSources]);

  // Initialize website sources once
  useEffect(() => {
    if (!agentId) return;

    let mounted = true;

    const initializeWebsiteSources = async () => {
      try {
        const { data: sources, error } = await supabase
          .from('agent_sources')
          .select('id')
          .eq('agent_id', agentId)
          .eq('source_type', 'website')
          .eq('is_active', true);

        if (error || !mounted) return;

        const sourceIds = sources?.map(s => s.id) || [];
        setWebsiteSources(sourceIds);
      } catch (error) {
        console.error('Error initializing website sources:', error);
      }
    };

    initializeWebsiteSources();

    return () => {
      mounted = false;
    };
  }, [agentId]);

  const subscriptionState = useTrainingSubscriptions(
    agentId || '',
    websiteSources,
    checkTrainingCompletion
  );

  const startTraining = useCallback(async () => {
    if (!agentId) return;
    
    setTrainingProgress(prev => prev ? { ...prev, status: 'idle' } : null);
    await performTraining(agentId, checkTrainingCompletion);
  }, [agentId, performTraining, checkTrainingCompletion]);

  return {
    trainingProgress,
    startTraining,
    checkTrainingCompletion: useCallback(() => {
      if (agentId) {
        checkTrainingCompletion(agentId);
      }
    }, [agentId, checkTrainingCompletion]),
    isConnected: subscriptionState.isConnected
  };
};
