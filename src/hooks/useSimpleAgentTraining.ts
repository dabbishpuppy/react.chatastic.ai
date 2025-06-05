
import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface TrainingProgress {
  status: 'idle' | 'initializing' | 'training' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
}

export const useSimpleAgentTraining = () => {
  const { agentId } = useParams();
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isTraining, setIsTraining] = useState(false);

  const startTraining = useCallback(async () => {
    if (!agentId || isTraining) return;

    try {
      setIsTraining(true);
      setTrainingProgress({
        status: 'initializing',
        progress: 0,
        totalSources: 0,
        processedSources: 0
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const response = await supabase.functions.invoke('start-enhanced-retraining', {
        body: { agentId }
      });

      if (response.error) {
        throw response.error;
      }

      console.log('Training started successfully');
    } catch (error) {
      console.error('Failed to start training:', error);
      setTrainingProgress({
        status: 'failed',
        progress: 0,
        totalSources: 0,
        processedSources: 0
      });
      setIsTraining(false);
    }
  }, [agentId, isTraining]);

  const checkTrainingStatus = useCallback(async () => {
    if (!agentId) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // FIXED: Query only columns that exist in agent_sources table
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('id, requires_manual_training, metadata')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error) {
        console.error('Error checking training status:', error);
        return;
      }

      // FIXED: Check requires_manual_training instead of processing_status
      const unprocessedSources = sources?.filter(source => 
        source.requires_manual_training === true
      ) || [];

      const totalSources = sources?.length || 0;
      const processedSources = totalSources - unprocessedSources.length;

      if (unprocessedSources.length === 0 && totalSources > 0) {
        setTrainingProgress({
          status: 'completed',
          progress: 100,
          totalSources,
          processedSources
        });
        setIsTraining(false);
      } else if (unprocessedSources.length > 0 && isTraining) {
        const progress = totalSources > 0 ? Math.round((processedSources / totalSources) * 100) : 0;
        setTrainingProgress({
          status: processedSources > 0 ? 'training' : 'initializing',
          progress,
          totalSources,
          processedSources
        });
      } else if (unprocessedSources.length > 0 && !isTraining) {
        setTrainingProgress({
          status: 'idle',
          progress: 0,
          totalSources,
          processedSources
        });
      }
    } catch (error) {
      console.error('Error checking training status:', error);
    }
  }, [agentId, isTraining]);

  // Check status periodically when training
  useEffect(() => {
    if (!agentId) return;

    const interval = setInterval(() => {
      checkTrainingStatus();
    }, 2000);

    // Initial check
    checkTrainingStatus();

    return () => clearInterval(interval);
  }, [agentId, checkTrainingStatus]);

  // Listen for source changes
  useEffect(() => {
    const handleSourceEvent = () => {
      setTimeout(() => checkTrainingStatus(), 1000);
    };

    const eventTypes = ['fileUploaded', 'sourceDeleted', 'sourceCreated', 'sourceUpdated', 'crawlCompleted'];
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleSourceEvent);
    });

    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleSourceEvent);
      });
    };
  }, [checkTrainingStatus]);

  return {
    trainingProgress,
    isTraining,
    startTraining
  };
};
