
import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SimpleStatusService, SimpleStatusSummary } from '@/services/SimpleStatusService';
import { ToastNotificationService } from '@/services/ToastNotificationService';
import { supabase } from '@/integrations/supabase/client';

export const useSimpleFlow = () => {
  const { agentId } = useParams();
  const [statusSummary, setStatusSummary] = useState<SimpleStatusSummary>({
    totalSources: 0,
    canTrain: false,
    isTraining: false,
    isEmpty: true
  });
  const [isTraining, setIsTraining] = useState(false);

  const startTraining = useCallback(async () => {
    if (!agentId || isTraining) return;

    try {
      setIsTraining(true);
      ToastNotificationService.showTrainingStarted();

      // Update sources to training status
      const { error: updateError } = await supabase
        .from('agent_sources')
        .update({ 
          crawl_status: 'training',
          metadata: {
            training_started_at: new Date().toISOString(),
            training_status: 'in_progress'
          }
        })
        .eq('agent_id', agentId)
        .in('crawl_status', ['completed', 'ready_for_training']);

      if (updateError) {
        console.error('Error updating sources for training:', updateError);
        throw updateError;
      }

      // Delete sources marked as removed
      const { error: deleteError } = await supabase
        .from('agent_sources')
        .delete()
        .eq('agent_id', agentId)
        .eq('is_excluded', true);

      if (deleteError) {
        console.error('Error deleting removed sources:', deleteError);
      }

      // Start training process
      const response = await supabase.functions.invoke('start-enhanced-retraining', {
        body: { agentId }
      });

      if (response.error) {
        throw response.error;
      }

      console.log('✅ Training started successfully');
    } catch (error) {
      console.error('Failed to start training:', error);
      setIsTraining(false);
      
      // Revert status on error
      await supabase
        .from('agent_sources')
        .update({ 
          crawl_status: 'completed',
          metadata: {
            training_failed_at: new Date().toISOString(),
            training_error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        .eq('agent_id', agentId)
        .eq('crawl_status', 'training');
    }
  }, [agentId, isTraining]);

  const updateSourceStatus = useCallback(async () => {
    if (!agentId) return;

    try {
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('id, source_type, crawl_status, metadata, is_excluded')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching sources:', error);
        return;
      }

      const summary = SimpleStatusService.analyzeSourceStatus(sources || []);
      setStatusSummary(summary);

      // Update training state
      const currentlyTraining = summary.isTraining;
      if (currentlyTraining && !isTraining) {
        setIsTraining(true);
      } else if (!currentlyTraining && isTraining) {
        setIsTraining(false);
        // Check if training completed
        const hasTrainedSources = sources?.some(s => {
          const metadata = s.metadata || {};
          return metadata.training_completed_at || metadata.last_trained_at;
        });
        if (hasTrainedSources) {
          ToastNotificationService.showTrainingCompleted();
        }
      }
    } catch (error) {
      console.error('Error updating source status:', error);
    }
  }, [agentId, isTraining]);

  useEffect(() => {
    if (!agentId) return;

    updateSourceStatus();
    const interval = setInterval(updateSourceStatus, 3000);
    return () => clearInterval(interval);
  }, [agentId, updateSourceStatus]);

  const buttonState = SimpleStatusService.getButtonState(statusSummary);

  return {
    statusSummary,
    buttonState,
    isTraining,
    startTraining,
    updateSourceStatus
  };
};
