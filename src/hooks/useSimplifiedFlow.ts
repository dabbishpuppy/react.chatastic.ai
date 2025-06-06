
import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SimplifiedSourceStatusService, SourceStatusSummary } from '@/services/SimplifiedSourceStatusService';
import { ToastNotificationService } from '@/services/ToastNotificationService';

interface SourceMetadata {
  training_status?: string;
  training_completed_at?: string;
  training_started_at?: string;
  training_error?: string;
  last_trained_at?: string;
  [key: string]: any;
}

export const useSimplifiedFlow = () => {
  const { agentId } = useParams();
  const [statusSummary, setStatusSummary] = useState<SourceStatusSummary>({
    totalSources: 0,
    hasCrawledSources: false,
    hasTrainingSources: false,
    allSourcesCompleted: false,
    isEmpty: true
  });
  const [isTraining, setIsTraining] = useState(false);

  const startTraining = useCallback(async () => {
    if (!agentId || isTraining) return;

    try {
      setIsTraining(true);
      ToastNotificationService.showTrainingStarted();

      const { supabase } = await import('@/integrations/supabase/client');
      
      // First, mark all sources that require manual training as training
      const { error: updateError } = await supabase
        .from('agent_sources')
        .update({ 
          requires_manual_training: false,
          metadata: {
            training_started_at: new Date().toISOString(),
            training_status: 'in_progress'
          }
        })
        .eq('agent_id', agentId)
        .eq('requires_manual_training', true);

      if (updateError) {
        console.error('Error updating sources for training:', updateError);
        throw updateError;
      }

      // Trigger the enhanced retraining which handles chunking
      const response = await supabase.functions.invoke('start-enhanced-retraining', {
        body: { agentId }
      });

      if (response.error) {
        throw response.error;
      }

      console.log('✅ Training started successfully - chunking process initiated');
    } catch (error) {
      console.error('Failed to start training:', error);
      setIsTraining(false);
      
      // Revert the training status on error
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase
        .from('agent_sources')
        .update({ 
          requires_manual_training: true,
          metadata: {
            training_failed_at: new Date().toISOString(),
            training_error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        .eq('agent_id', agentId)
        .eq('requires_manual_training', false);
    }
  }, [agentId, isTraining]);

  const updateSourceStatus = useCallback(async () => {
    if (!agentId) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('id, source_type, crawl_status, requires_manual_training, metadata, parent_source_id')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching sources:', error);
        return;
      }

      const summary = SimplifiedSourceStatusService.analyzeSourceStatus(sources || []);
      setStatusSummary(summary);

      // Check if training is in progress - properly type the metadata
      const hasTrainingInProgress = sources?.some(s => {
        const metadata = s.metadata as SourceMetadata || {};
        return metadata.training_status === 'in_progress';
      });

      if (hasTrainingInProgress && !isTraining) {
        setIsTraining(true);
      } else if (!hasTrainingInProgress && isTraining) {
        setIsTraining(false);
        // Check if training completed successfully
        const hasTrainingCompleted = sources?.some(s => {
          const metadata = s.metadata as SourceMetadata || {};
          return metadata.training_completed_at || metadata.last_trained_at;
        });
        if (hasTrainingCompleted) {
          ToastNotificationService.showTrainingCompleted();
        }
      }
    } catch (error) {
      console.error('Error updating source status:', error);
    }
  }, [agentId, isTraining]);

  // Listen for source changes and update status
  useEffect(() => {
    if (!agentId) return;

    updateSourceStatus();

    const interval = setInterval(updateSourceStatus, 2000);
    return () => clearInterval(interval);
  }, [agentId, updateSourceStatus]);

  // Listen for custom events
  useEffect(() => {
    const handleCrawlStarted = () => ToastNotificationService.showCrawlingStarted();
    const handleCrawlCompleted = () => {
      ToastNotificationService.showCrawlingCompleted();
      setTimeout(updateSourceStatus, 1000);
    };
    const handleCrawlCompletedReadyForTraining = () => {
      console.log('🎯 Crawl completed - sources ready for training');
      setTimeout(updateSourceStatus, 1000);
    };
    const handleSourceUpdated = () => setTimeout(updateSourceStatus, 1000);
    const handleTrainingCompleted = () => {
      setIsTraining(false);
      ToastNotificationService.showTrainingCompleted();
      setTimeout(updateSourceStatus, 1000);
    };

    window.addEventListener('crawlStarted', handleCrawlStarted);
    window.addEventListener('crawlCompleted', handleCrawlCompleted);
    window.addEventListener('crawlCompletedReadyForTraining', handleCrawlCompletedReadyForTraining);
    window.addEventListener('sourceUpdated', handleSourceUpdated);
    window.addEventListener('trainingCompleted', handleTrainingCompleted as EventListener);

    return () => {
      window.removeEventListener('crawlStarted', handleCrawlStarted);
      window.removeEventListener('crawlCompleted', handleCrawlCompleted);
      window.removeEventListener('crawlCompletedReadyForTraining', handleCrawlCompletedReadyForTraining);
      window.removeEventListener('sourceUpdated', handleSourceUpdated);
      window.removeEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    };
  }, [updateSourceStatus]);

  const buttonState = SimplifiedSourceStatusService.determineButtonState(statusSummary);

  return {
    statusSummary,
    buttonState,
    isTraining,
    startTraining,
    updateSourceStatus
  };
};
