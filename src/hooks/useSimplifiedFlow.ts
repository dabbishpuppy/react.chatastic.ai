
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
      
      console.log('🚀 Starting training process...');

      // Trigger the enhanced retraining which handles chunking and status updates
      const response = await supabase.functions.invoke('start-enhanced-retraining', {
        body: { agentId }
      });

      if (response.error) {
        throw response.error;
      }

      console.log('✅ Training initiated successfully:', response.data);
      
      // The real-time subscriptions will handle the UI updates
      
    } catch (error) {
      console.error('Failed to start training:', error);
      setIsTraining(false);
      ToastNotificationService.showError('Failed to start training');
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

      // Check if training is in progress
      const hasTrainingInProgress = sources?.some(s => {
        const metadata = s.metadata as Record<string, any> | null;
        return s.crawl_status === 'training' || 
               metadata?.training_status === 'in_progress' ||
               (metadata?.training_started_at && !metadata?.training_completed_at);
      });

      // Check if training just completed
      const hasTrainingCompleted = sources?.some(s => {
        const metadata = s.metadata as Record<string, any> | null;
        return metadata?.training_completed_at && metadata?.training_status === 'completed';
      });

      if (hasTrainingInProgress && !isTraining) {
        console.log('📊 Training detected in progress, updating UI...');
        setIsTraining(true);
      } else if (!hasTrainingInProgress && isTraining) {
        console.log('📊 Training completed, updating UI...');
        setIsTraining(false);
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
            
            // Check for training status changes
            if (updatedSource.crawl_status === 'training' || 
                updatedSource.metadata?.training_started_at) {
              console.log('🔄 Training started detected via real-time');
              setTimeout(updateSourceStatus, 500);
            } else if (updatedSource.crawl_status === 'completed' && 
                       !updatedSource.requires_manual_training) {
              console.log('✅ Training completed detected via real-time');
              setTimeout(updateSourceStatus, 500);
            } else {
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
            
            // Check if processing status changed to training or trained
            if (updatedPage.processing_status === 'training' || 
                updatedPage.processing_status === 'trained') {
              console.log(`📄 Source page ${updatedPage.processing_status} detected`);
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
