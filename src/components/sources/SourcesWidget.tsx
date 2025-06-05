
import React, { useEffect, useState } from "react";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import { useAgentSourcesRealtime } from "@/hooks/useAgentSourcesRealtime";
import { useAgentRetraining } from "@/hooks/useAgentRetraining";
import { useParams } from "react-router-dom";
import SourcesLoadingState from "./SourcesLoadingState";
import SourcesErrorState from "./SourcesErrorState";
import SourcesContent from "./SourcesContent";
import { RetrainingDialog } from "./RetrainingDialog";
import { StartTrainingModal } from '@/components/training/StartTrainingModal';
import { RunningInBackgroundModal } from '@/components/training/RunningInBackgroundModal';
import { DoneModal } from '@/components/training/DoneModal';
import { useChunkingStatus } from '@/hooks/useChunkingStatus';
import { CrawlApiService } from '@/services/rag/enhanced/crawlApi';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SourcesWidgetProps {
  currentTab?: string;
}

const SourcesWidget: React.FC<SourcesWidgetProps> = ({ currentTab }) => {
  const { agentId } = useParams();
  const { data: stats, isLoading, error, refetch: refetchStats } = useAgentSourceStats();
  const [showRetrainingDialog, setShowRetrainingDialog] = useState(false);
  const [isTrainingInBackground, setIsTrainingInBackground] = useState(false);
  
  // Use enhanced training hooks
  const {
    isRetraining,
    progress,
    retrainingNeeded,
    startRetraining,
    checkRetrainingNeeded,
    trainingProgress
  } = useAgentRetraining(agentId);
  
  // Set up centralized real-time subscription
  useAgentSourcesRealtime();

  // New state for training modals
  const [showStartModal, setShowStartModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [currentTrainingSource, setCurrentTrainingSource] = useState<{
    parentSourceId: string;
    url: string;
    pageCount: number;
  } | null>(null);

  // Chunking status tracking
  const chunkingStatus = useChunkingStatus(currentTrainingSource?.parentSourceId || null);

  // Enhanced: Listen for training completion events (NO DUPLICATE TOAST)
  useEffect(() => {
    const handleTrainingCompleted = (event: CustomEvent) => {
      console.log('🎉 Training completed event received in SourcesWidget:', event.detail);
      
      // REMOVED: Duplicate toast notification - now handled only in useTrainingNotifications
      
      // Refresh stats and check status
      refetchStats();
      setTimeout(() => checkRetrainingNeeded(), 1000);
    };

    const handleTrainingContinuesInBackground = (event: CustomEvent) => {
      console.log('📱 Training continues in background - enhanced handler:', event.detail);
      setIsTrainingInBackground(true);
      
      // Also close the dialog if it's open
      setShowRetrainingDialog(false);
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    window.addEventListener('trainingContinuesInBackground', handleTrainingContinuesInBackground as EventListener);
    
    return () => {
      window.removeEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
      window.removeEventListener('trainingContinuesInBackground', handleTrainingContinuesInBackground as EventListener);
    };
  }, [refetchStats, checkRetrainingNeeded]);

  // Enhanced: Check retraining status on stats changes
  useEffect(() => {
    if (agentId && stats) {
      checkRetrainingNeeded();
    }
  }, [agentId, checkRetrainingNeeded, stats?.totalSources, stats?.requiresTraining, stats?.unprocessedCrawledPages]);

  // Enhanced: Handle training state transitions
  useEffect(() => {
    if (trainingProgress?.status === 'completed' && !retrainingNeeded?.needed) {
      console.log('🎯 Training completed - resetting background state');
      setIsTrainingInBackground(false);
      
      // Refresh stats after completion
      setTimeout(() => {
        refetchStats();
        checkRetrainingNeeded();
      }, 2000);
    }
  }, [trainingProgress?.status, retrainingNeeded?.needed, refetchStats, checkRetrainingNeeded]);

  // Enhanced: Listen for source events with better debouncing
  useEffect(() => {
    const handleSourceEvent = (event: CustomEvent) => {
      // Reset background training state when sources change
      setIsTrainingInBackground(false);
      
      // Refresh stats immediately
      refetchStats();
      
      // Check retraining status after a delay
      setTimeout(() => checkRetrainingNeeded(), 1500);
    };

    const eventTypes = ['fileUploaded', 'sourceDeleted', 'sourceCreated', 'sourceUpdated', 'crawlCompleted', 'sourceStatusChanged'];
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleSourceEvent as EventListener);
    });
    
    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleSourceEvent as EventListener);
      });
    };
  }, [refetchStats, checkRetrainingNeeded]);

  // Handle training completion
  useEffect(() => {
    if (chunkingStatus.isComplete && currentTrainingSource && showBackgroundModal) {
      toast({
        title: "Training Complete",
        description: "Your AI agent has been successfully trained and is ready to use.",
        duration: 5000,
      });
      
      setShowBackgroundModal(false);
      setShowDoneModal(true);
    }
  }, [chunkingStatus.isComplete, currentTrainingSource, showBackgroundModal]);

  // Format total size from stats
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const handleRetrainClick = async () => {
    if (!agentId) return;

    try {
      // Get the first website source that needs training
      const { data: websiteSources, error } = await supabase
        .from('agent_sources')
        .select('id, url, title')
        .eq('agent_id', agentId)
        .eq('source_type', 'website')
        .eq('is_active', true)
        .limit(1);

      if (error || !websiteSources?.length) {
        console.error('No website sources found for training');
        return;
      }

      const source = websiteSources[0];
      
      // Get page count for this source
      const { data: pages, error: pagesError } = await supabase
        .from('source_pages')
        .select('id', { count: 'exact' })
        .eq('parent_source_id', source.id)
        .eq('status', 'completed');

      if (pagesError) {
        console.error('Error fetching page count:', pagesError);
        return;
      }

      setCurrentTrainingSource({
        parentSourceId: source.id,
        url: source.url || source.title || 'Unknown source',
        pageCount: pages?.length || 0
      });
      
      setShowStartModal(true);
    } catch (error) {
      console.error('Error preparing training:', error);
    }
  };

  const handleStartTraining = async () => {
    if (!currentTrainingSource) return;

    try {
      // Fire "Training Started" toast
      toast({
        title: "Training Started",
        duration: 3000,
      });

      // Start chunking process
      await CrawlApiService.startChunking(currentTrainingSource.parentSourceId);

      // Close start modal and open background modal
      setShowStartModal(false);
      setShowBackgroundModal(true);
    } catch (error) {
      console.error('Error starting training:', error);
      toast({
        title: "Training Failed",
        description: "Failed to start training. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCloseBackgroundModal = () => {
    setShowBackgroundModal(false);
  };

  const handleCloseDoneModal = () => {
    setShowDoneModal(false);
    setCurrentTrainingSource(null);
  };

  const handleDialogClose = (open: boolean) => {
    setShowRetrainingDialog(open);
  };

  // Check if training is active
  const isTrainingActive = trainingProgress?.status === 'training' || isRetraining;
  const isTrainingCompleted = trainingProgress?.status === 'completed' && !retrainingNeeded?.needed;

  if (isLoading) {
    return <SourcesLoadingState />;
  }

  if (error) {
    return <SourcesErrorState error={error.message} />;
  }

  if (!stats) {
    return <SourcesErrorState error="No stats available" />;
  }

  return (
    <>
      <SourcesContent
        totalSources={stats.totalSources}
        totalSize={formatTotalSize(stats.totalBytes)}
        sourcesByType={stats.sourcesByType}
        currentTab={currentTab}
        onRetrainClick={handleRetrainClick}
        retrainingNeeded={retrainingNeeded?.needed || false}
        isRetraining={isTrainingActive}
        isTrainingInBackground={isTrainingInBackground}
        isTrainingCompleted={isTrainingCompleted}
        requiresTraining={stats.requiresTraining}
        unprocessedCrawledPages={stats.unprocessedCrawledPages}
      />

      <RetrainingDialog
        open={showRetrainingDialog}
        onOpenChange={handleDialogClose}
        isRetraining={isTrainingActive}
        progress={progress}
        retrainingNeeded={retrainingNeeded}
        onStartRetraining={startRetraining}
        trainingProgress={trainingProgress}
      />

      {/* New Training Modals */}
      {currentTrainingSource && (
        <>
          <StartTrainingModal
            open={showStartModal}
            onOpenChange={setShowStartModal}
            onStartTraining={handleStartTraining}
            sourceUrl={currentTrainingSource.url}
            pageCount={currentTrainingSource.pageCount}
          />

          <RunningInBackgroundModal
            open={showBackgroundModal}
            onOpenChange={handleCloseBackgroundModal}
            progressPercentage={chunkingStatus.progressPercentage}
            pagesProcessed={chunkingStatus.pagesProcessed}
            totalPages={chunkingStatus.totalPages}
          />

          <DoneModal
            open={showDoneModal}
            onOpenChange={handleCloseDoneModal}
            pagesProcessed={chunkingStatus.pagesProcessed}
            totalPages={chunkingStatus.totalPages}
          />
        </>
      )}
    </>
  );
};

export default SourcesWidget;
