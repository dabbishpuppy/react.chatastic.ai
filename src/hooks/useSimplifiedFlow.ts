
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
      
      const response = await supabase.functions.invoke('start-enhanced-retraining', {
        body: { agentId }
      });

      if (response.error) {
        throw response.error;
      }

      console.log('Training started successfully');
    } catch (error) {
      console.error('Failed to start training:', error);
      setIsTraining(false);
    }
  }, [agentId, isTraining]);

  const updateSourceStatus = useCallback(async () => {
    if (!agentId) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('id, source_type, crawl_status, requires_manual_training')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching sources:', error);
        return;
      }

      const summary = SimplifiedSourceStatusService.analyzeSourceStatus(sources || []);
      setStatusSummary(summary);

      // Handle automatic toast notifications based on status changes
      if (summary.hasTrainingSources && !isTraining) {
        setIsTraining(true);
      } else if (summary.allSourcesCompleted && isTraining) {
        setIsTraining(false);
        ToastNotificationService.showTrainingCompleted();
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
    const handleSourceUpdated = () => setTimeout(updateSourceStatus, 1000);

    window.addEventListener('crawlStarted', handleCrawlStarted);
    window.addEventListener('crawlCompleted', handleCrawlCompleted);
    window.addEventListener('sourceUpdated', handleSourceUpdated);

    return () => {
      window.removeEventListener('crawlStarted', handleCrawlStarted);
      window.removeEventListener('crawlCompleted', handleCrawlCompleted);
      window.removeEventListener('sourceUpdated', handleSourceUpdated);
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
