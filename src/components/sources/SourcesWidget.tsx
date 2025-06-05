
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

  // ENHANCED: Source event handlers with completion protection
  useEffect(() => {
    const handleSourceEvent = (event: CustomEvent) => {
      // ENHANCED: Only reset background training if not in completed state
      if (trainingProgress?.status !== 'completed') {
        setIsTrainingInBackground(false);
      }
      
      // Refresh stats immediately
      refetchStats();
      
      // ENHANCED: Only check retraining if not completed
      if (trainingProgress?.status !== 'completed') {
        setTimeout(() => checkRetrainingNeeded(), 1500);
      }
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
  }, [refetchStats, checkRetrainingNeeded, trainingProgress?.status]);

  // Format total size from stats
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  // ENHANCED: Protected retrain click handler
  const handleRetrainClick = () => {
    // ENHANCED: Check if training is already completed
    if (trainingProgress?.status === 'completed') {
      console.log('🚫 PROTECTED: Training already completed, not showing dialog');
      return;
    }
    
    setShowRetrainingDialog(true);
  };

  const handleDialogClose = (open: boolean) => {
    console.log('🔄 Dialog close requested:', { open, isTraining: isTrainingActive });
    setShowRetrainingDialog(open);
    
    // FIXED: Only set background training if training is actually active AND not completed
    if (!open && isTrainingActive && trainingProgress?.status !== 'completed') {
      console.log('📱 Setting background training state');
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
