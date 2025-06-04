
import { useEffect, useState, useCallback, useMemo } from 'react';
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

  const { calculateTrainingProgress } = useTrainingProgressCalculation();
  const { startTraining: performTraining } = useTrainingOperations();

  const checkTrainingCompletion = useCallback(async (targetAgentId: string) => {
    const progress = await calculateTrainingProgress(targetAgentId);
    if (progress) {
      setTrainingProgress(progress);

      // Show completion notification only for genuine completions
      if (progress.status === 'completed' && trainingProgress?.status !== 'completed' && progress.totalSources > 0) {
        console.log('🎉 Training completed! Showing success notification');
        
        toast({
          title: "Training Complete!",
          description: "Your AI agent is trained and ready",
          duration: 8000,
        });

        window.dispatchEvent(new CustomEvent('trainingCompleted', {
          detail: { agentId: targetAgentId, progress }
        }));
      }
    }
  }, [calculateTrainingProgress, trainingProgress?.status]);

  // Stabilize website sources to prevent subscription issues
  const stableWebsiteSources = useMemo(() => websiteSources, [websiteSources.join(',')]);

  // Initialize website sources
  useEffect(() => {
    if (!agentId) return;

    const initializeWebsiteSources = async () => {
      try {
        const { data: sources, error } = await supabase
          .from('agent_sources')
          .select('id')
          .eq('agent_id', agentId)
          .eq('source_type', 'website')
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching website sources:', error);
          return;
        }

        const sourceIds = sources?.map(s => s.id) || [];
        setWebsiteSources(sourceIds);
        
        // Only log if there are sources to monitor
        if (sourceIds.length > 0) {
          console.log('📄 Monitoring website sources:', sourceIds.length);
        }
      } catch (error) {
        console.error('Error initializing website sources:', error);
      }
    };

    initializeWebsiteSources();
  }, [agentId]);

  const subscriptionState = useTrainingSubscriptions(
    agentId || '',
    stableWebsiteSources,
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
    checkTrainingCompletion: () => agentId && checkTrainingCompletion(agentId),
    isConnected: subscriptionState.isConnected
  };
};
