
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
  const [isTrainingCompleted, setIsTrainingCompleted] = useState(false);
  
  // Use single source of truth for training state
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

  // Check retraining status on mount and when stats change
  useEffect(() => {
    if (agentId && stats) {
      checkRetrainingNeeded();
    }
  }, [agentId, checkRetrainingNeeded, stats?.totalSources, stats?.requiresTraining]);

  // Handle training state transitions with simplified logic
  useEffect(() => {
    if (trainingProgress?.status === 'completed' && !retrainingNeeded?.needed) {
      console.log('🎉 Training completed, updating states');
      setIsTrainingInBackground(false);
      setIsTrainingCompleted(true);
      
      // After a brief period, refresh stats and recheck training status
      const timeoutId = setTimeout(() => {
        refetchStats();
        checkRetrainingNeeded();
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    } else if (trainingProgress?.status === 'training') {
      setIsTrainingCompleted(false);
    }
  }, [trainingProgress?.status, retrainingNeeded?.needed, refetchStats, checkRetrainingNeeded]);

  // Reset completion state when new training is needed
  useEffect(() => {
    if (retrainingNeeded?.needed || stats?.requiresTraining) {
      console.log('🔄 Resetting completion state - new sources need training');
      setIsTrainingCompleted(false);
    }
  }, [retrainingNeeded?.needed, stats?.requiresTraining]);

  // Listen for source events with debounced refresh
  useEffect(() => {
    const handleSourceEvent = (event: CustomEvent) => {
      console.log(`📁 Source event: ${event.type}, refreshing state`);
      // Reset completion state when sources change
      setIsTrainingCompleted(false);
      // Refetch stats and check retraining status
      refetchStats();
      
      // Debounced check to ensure database is updated
      const timeoutId = setTimeout(() => {
        checkRetrainingNeeded();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    };

    // Listen for all source-related events
    const eventTypes = ['fileUploaded', 'sourceDeleted', 'sourceCreated', 'sourceUpdated'];
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleSourceEvent as EventListener);
    });
    
    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleSourceEvent as EventListener);
      });
    };
  }, [refetchStats, checkRetrainingNeeded]);

  console.log(`📊 SourcesWidget render state:`, {
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

  // Check if training is active (use trainingProgress as primary source)
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
        isTrainingCompleted={isTrainingCompleted && !retrainingNeeded?.needed}
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
