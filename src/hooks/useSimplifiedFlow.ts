
import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SimplifiedSourceStatusService, SourceStatusSummary } from '@/services/SimplifiedSourceStatusService';
import { ToastNotificationService } from '@/services/ToastNotificationService';

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
          crawl_status: 'training',
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

      // Trigger the enhanced retraining which handles chunking and child page status updates
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
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('id, source_type, crawl_status, requires_manual_training, metadata')
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
        const metadata = s.metadata as Record<string, any> | null;
        return s.crawl_status === 'training' || metadata?.training_status === 'in_progress';
      });

      if (hasTrainingInProgress && !isTraining) {
        setIsTraining(true);
      } else if (!hasTrainingInProgress && isTraining) {
        setIsTraining(false);
        // Check if training completed successfully
        const hasTrainingCompleted = sources?.some(s => {
          const metadata = s.metadata as Record<string, any> | null;
          return metadata?.training_completed_at;
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

  // Real-time subscription for agent_sources changes
  useEffect(() => {
    if (!agentId) return;

    const setupRealtimeSubscription = async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      console.log(`📡 Setting up real-time subscription for agent sources: ${agentId}`);

      const channel = supabase
        .channel(`agent-sources-${agentId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'agent_sources',
            filter: `agent_id=eq.${agentId}`
          },
          (payload) => {
            console.log('📡 Agent source updated:', payload);
            
            const updatedSource = payload.new as any;
            
            // Check if this is a parent source status change from crawling to completed
            if (updatedSource.crawl_status === 'completed' && 
                updatedSource.requires_manual_training === true &&
                updatedSource.parent_source_id === null) {
              console.log('🎉 Parent source completed - updating status');
              // Delay slightly to ensure all real-time updates are processed
              setTimeout(updateSourceStatus, 500);
            } else {
              // For other updates, update immediately
              updateSourceStatus();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'source_pages'
          },
          (payload) => {
            console.log('📡 Source page updated:', payload);
            const updatedPage = payload.new as any;
            
            // Check if processing status changed
            if (updatedPage.processing_status) {
              console.log(`📄 Source page processing status changed to: ${updatedPage.processing_status}`);
              setTimeout(updateSourceStatus, 500);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Agent sources subscription status:', status);
        });

      return () => {
        console.log(`🔌 Cleaning up agent sources subscription for: ${agentId}`);
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeSubscription();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [agentId, updateSourceStatus]);

  // Listen for custom events
  useEffect(() => {
    const handleCrawlStarted = () => ToastNotificationService.showCrawlingStarted();
    const handleCrawlCompleted = () => {
      ToastNotificationService.showCrawlingCompleted();
      // When crawling is completed, check status after a short delay to allow aggregation
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
    window.addEventListener('sourceUpdated', handleSourceUpdated);
    window.addEventListener('trainingCompleted', handleTrainingCompleted as EventListener);

    return () => {
      window.removeEventListener('crawlStarted', handleCrawlStarted);
      window.removeEventListener('crawlCompleted', handleCrawlCompleted);
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
