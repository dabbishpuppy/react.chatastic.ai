
import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SimplifiedSourceStatusService, SourceStatusSummary } from '@/services/SimplifiedSourceStatusService';
import { ToastNotificationService } from '@/services/ToastNotificationService';
import { supabase } from '@/integrations/supabase/client';
import { AgentSource } from '@/types/rag';

interface SourceMetadata {
  training_status?: string;
  training_completed_at?: string;
  training_started_at?: string;
  training_error?: string;
  last_trained_at?: string;
  [key: string]: any;
}

export const useSimpleFlow = () => {
  const { agentId } = useParams();
  const [statusSummary, setStatusSummary] = useState<SourceStatusSummary>({
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

      // Update sources to training status (not crawling)
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
        .select(`
          id,
          agent_id,
          team_id,
          source_type,
          title,
          url,
          content,
          is_active,
          crawl_status,
          requires_manual_training,
          metadata,
          parent_source_id,
          workflow_status,
          progress,
          total_jobs,
          total_children,
          created_at,
          updated_at
        `)
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching sources:', error);
        return;
      }

      // Convert the Supabase data to AgentSource type with proper metadata casting
      const typedSources: AgentSource[] = sources?.map(source => ({
        ...source,
        metadata: source.metadata as Record<string, any> || {},
        is_excluded: false, // Default value since not selected
        created_at: source.created_at || new Date().toISOString(),
        updated_at: source.updated_at || new Date().toISOString()
      })) || [];

      const summary = SimplifiedSourceStatusService.analyzeSourceStatus(typedSources);
      setStatusSummary(summary);

      // Update training state
      const currentlyTraining = summary.isTraining;
      if (currentlyTraining && !isTraining) {
        setIsTraining(true);
      } else if (!currentlyTraining && isTraining) {
        setIsTraining(false);
        // Check if training completed
        const hasTrainedSources = typedSources?.some(s => {
          const metadata = s.metadata as SourceMetadata || {};
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

  const buttonState = SimplifiedSourceStatusService.determineButtonStateFromSummary(statusSummary);

  return {
    statusSummary,
    buttonState,
    isTraining,
    startTraining,
    updateSourceStatus
  };
};
