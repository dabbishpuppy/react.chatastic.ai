
import React, { useEffect, useState } from "react";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import { useAgentSourcesRealtime } from "@/hooks/useAgentSourcesRealtime";
import { useAgentRetraining } from "@/hooks/useAgentRetraining";
import { useParams } from "react-router-dom";
import SourcesLoadingState from "./SourcesLoadingState";
import SourcesErrorState from "./SourcesErrorState";
import SourcesContent from "./SourcesContent";
import { RetrainingDialog } from "./RetrainingDialog";

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

  // ENHANCED: Listen for training completion events with better cleanup
  useEffect(() => {
    const handleTrainingCompleted = (event: CustomEvent) => {
      console.log('🎉 ENHANCED: Training completed event received in SourcesWidget:', event.detail);
      
      // Refresh stats and check status
      refetchStats();
      setTimeout(() => checkRetrainingNeeded(), 1000);
    };

    const handleTrainingContinuesInBackground = (event: CustomEvent) => {
      console.log('📱 ENHANCED: Training continues in background:', event.detail);
      setIsTrainingInBackground(true);
      setShowRetrainingDialog(false);
    };

    // ENHANCED: Listen for new source creation to reset completion state
    const handleSourceCreated = (event: CustomEvent) => {
      console.log('🆕 ENHANCED: Source created event received:', event.detail);
      
      // Reset training background state when new sources are added
      setIsTrainingInBackground(false);
      
      // Refresh stats immediately
      refetchStats();
      
      // Check retraining status after a delay
      setTimeout(() => checkRetrainingNeeded(), 1500);
    };

    // ENHANCED: Add event listener cleanup tracking
    window.addEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    window.addEventListener('trainingContinuesInBackground', handleTrainingContinuesInBackground as EventListener);
    window.addEventListener('sourceCreated', handleSourceCreated as EventListener);
    
    return () => {
      console.log('🧹 ENHANCED: Cleaning up SourcesWidget event listeners');
      window.removeEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
      window.removeEventListener('trainingContinuesInBackground', handleTrainingContinuesInBackground as EventListener);
      window.removeEventListener('sourceCreated', handleSourceCreated as EventListener);
    };
  }, [refetchStats, checkRetrainingNeeded]);

  // Enhanced: Check retraining status on stats changes
  useEffect(() => {
    if (agentId && stats) {
      checkRetrainingNeeded();
    }
  }, [agentId, checkRetrainingNeeded, stats?.totalSources, stats?.requiresTraining, stats?.unprocessedCrawledPages]);

  // Enhanced: Handle training state transitions with better protection
  useEffect(() => {
    if (trainingProgress?.status === 'completed' && !retrainingNeeded?.needed) {
      console.log('🎯 ENHANCED: Training completed - resetting background state');
      setIsTrainingInBackground(false);
      
      // Refresh stats after completion with delay to avoid race conditions
      setTimeout(() => {
        refetchStats();
        checkRetrainingNeeded();
      }, 2000);
    }
  }, [trainingProgress?.status, retrainingNeeded?.needed, refetchStats, checkRetrainingNeeded]);

  // Enhanced: Listen for source events with better debouncing
  useEffect(() => {
    const handleSourceEvent = (event: CustomEvent) => {
      console.log('🔄 ENHANCED: Source event received:', event.type);
      
      // Reset background training state when sources change
      setIsTrainingInBackground(false);
      
      // Refresh stats immediately
      refetchStats();
      
      // Check retraining status after a delay
      setTimeout(() => checkRetrainingNeeded(), 1500);
    };

    const eventTypes = ['fileUploaded', 'sourceDeleted', 'sourceUpdated', 'crawlCompleted', 'sourceStatusChanged'];
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleSourceEvent as EventListener);
    });
    
    return () => {
      console.log('🧹 ENHANCED: Cleaning up source event listeners');
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleSourceEvent as EventListener);
      });
    };
  }, [refetchStats, checkRetrainingNeeded]);

  // Format total size from stats
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const handleRetrainClick = () => {
    setShowRetrainingDialog(true);
  };

  const handleDialogClose = (open: boolean) => {
    console.log('🔄 ENHANCED: Dialog close requested:', { open, isTraining: isTrainingActive });
    setShowRetrainingDialog(open);
    
    // Only set background training if training is actually active
    if (!open && isTrainingActive) {
      console.log('📱 ENHANCED: Setting background training state');
      setIsTrainingInBackground(true);
    }
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
    </>
  );
};

export default SourcesWidget;
