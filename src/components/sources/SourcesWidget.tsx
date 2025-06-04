
import React, { useEffect, useState } from "react";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import { useAgentSourcesRealtime } from "@/hooks/useAgentSourcesRealtime";
import { useAgentRetraining } from "@/hooks/useAgentRetraining";
import { useTrainingNotifications } from "@/hooks/useTrainingNotifications";
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
  const [isTrainingCompleted, setIsTrainingCompleted] = useState(false);
  
  const {
    isRetraining,
    progress,
    retrainingNeeded,
    startRetraining,
    checkRetrainingNeeded
  } = useAgentRetraining(agentId);

  // Use the new training notifications system
  const { trainingProgress } = useTrainingNotifications();
  
  // Set up centralized real-time subscription
  useAgentSourcesRealtime();

  // Check retraining status on mount and when stats change
  useEffect(() => {
    if (agentId && stats) {
      checkRetrainingNeeded();
    }
  }, [agentId, checkRetrainingNeeded, stats?.totalSources, stats?.requiresTraining]);

  // Handle training state transitions with improved logic
  useEffect(() => {
    if (trainingProgress?.status === 'completed') {
      console.log('🎉 Training completed, updating states');
      setIsTrainingInBackground(false);
      setIsTrainingCompleted(true);
      
      // After a brief period, refresh stats and recheck training status
      setTimeout(() => {
        refetchStats();
        checkRetrainingNeeded();
      }, 2000);
    } else if (trainingProgress?.status === 'training') {
      setIsTrainingCompleted(false);
    }
  }, [trainingProgress?.status, refetchStats, checkRetrainingNeeded]);

  // Reset completion state when new training is needed
  useEffect(() => {
    if (retrainingNeeded?.needed || stats?.requiresTraining) {
      setIsTrainingCompleted(false);
    }
  }, [retrainingNeeded?.needed, stats?.requiresTraining]);

  // Listen for various source events to trigger retraining status check
  useEffect(() => {
    const handleSourceEvent = (event: CustomEvent) => {
      console.log(`📁 Source event: ${event.type}, checking retraining status`);
      // Reset completion state when sources change
      setIsTrainingCompleted(false);
      // Refetch stats and check retraining status
      refetchStats();
      setTimeout(() => {
        checkRetrainingNeeded();
      }, 1000); // Small delay to ensure database is updated
    };

    // Listen for all source-related events
    window.addEventListener('fileUploaded', handleSourceEvent as EventListener);
    window.addEventListener('sourceDeleted', handleSourceEvent as EventListener);
    window.addEventListener('sourceCreated', handleSourceEvent as EventListener);
    window.addEventListener('sourceUpdated', handleSourceEvent as EventListener);
    
    return () => {
      window.removeEventListener('fileUploaded', handleSourceEvent as EventListener);
      window.removeEventListener('sourceDeleted', handleSourceEvent as EventListener);
      window.removeEventListener('sourceCreated', handleSourceEvent as EventListener);
      window.removeEventListener('sourceUpdated', handleSourceEvent as EventListener);
    };
  }, [refetchStats, checkRetrainingNeeded]);

  console.log(`📊 SourcesWidget render with enhanced state management:`, {
    totalSources: stats?.totalSources || 0,
    requiresTraining: stats?.requiresTraining || false,
    unprocessedCrawledPages: stats?.unprocessedCrawledPages || 0,
    retrainingNeeded: retrainingNeeded?.needed,
    trainingProgressStatus: trainingProgress?.status,
    isTrainingInBackground,
    isTrainingCompleted,
    isRetraining
  });

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
    setShowRetrainingDialog(open);
    
    // If training is active and dialog is closed, set background training state
    if (!open && (trainingProgress?.status === 'training' || isRetraining)) {
      setIsTrainingInBackground(true);
    }
  };

  // Check if training is active (prioritize trainingProgress over isRetraining)
  const isTrainingActive = trainingProgress?.status === 'training' || isRetraining;

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
      />
    </>
  );
};

export default SourcesWidget;
