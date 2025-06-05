import React, { useEffect, useState } from "react";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import { useAgentSourcesRealtime } from "@/hooks/useAgentSourcesRealtime";
import { useAgentRetraining } from "@/hooks/useAgentRetraining";
import { useSimplifiedTraining } from "@/hooks/useSimplifiedTraining";
import { useParams } from "react-router-dom";
import SourcesLoadingState from "./SourcesLoadingState";
import SourcesErrorState from "./SourcesErrorState";
import SourcesContent from "./SourcesContent";
import SimplifiedRetrainingDialog from "./SimplifiedRetrainingDialog";

interface SourcesWidgetProps {
  currentTab?: string;
}

const SourcesWidget: React.FC<SourcesWidgetProps> = ({ currentTab }) => {
  const { agentId } = useParams();
  const { data: stats, isLoading, error, refetch: refetchStats } = useAgentSourceStats();
  const [isTrainingInBackground, setIsTrainingInBackground] = useState(false);
  
  // Use simplified training hook
  const {
    isDialogOpen,
    openTrainingDialog,
    closeTrainingDialog,
    handleStartTraining,
    trainingProgress
  } = useSimplifiedTraining(agentId);
  
  // Keep existing retraining logic for compatibility
  const {
    retrainingNeeded,
    checkRetrainingNeeded,
  } = useAgentRetraining(agentId);
  
  // Set up centralized real-time subscription
  useAgentSourcesRealtime();

  // Handle training background state
  React.useEffect(() => {
    if (trainingProgress?.status === 'training' && !isDialogOpen) {
      setIsTrainingInBackground(true);
    } else if (trainingProgress?.status === 'completed') {
      setIsTrainingInBackground(false);
    }
  }, [trainingProgress?.status, isDialogOpen]);

  // Enhanced: Check retraining status on stats changes
  useEffect(() => {
    if (agentId && stats) {
      checkRetrainingNeeded();
    }
  }, [agentId, checkRetrainingNeeded, stats?.totalSources, stats?.requiresTraining, stats?.unprocessedCrawledPages]);

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

  // Format total size from stats
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  // Check if training is active
  const isTrainingActive = trainingProgress?.status === 'training';
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
        onRetrainClick={openTrainingDialog}
        retrainingNeeded={retrainingNeeded?.needed || false}
        isRetraining={isTrainingActive}
        isTrainingInBackground={isTrainingInBackground}
        isTrainingCompleted={isTrainingCompleted}
        requiresTraining={stats.requiresTraining}
        unprocessedCrawledPages={stats.unprocessedCrawledPages}
      />

      <SimplifiedRetrainingDialog
        open={isDialogOpen}
        onOpenChange={closeTrainingDialog}
        onStartTraining={handleStartTraining}
        trainingProgress={trainingProgress}
      />
    </>
  );
};

export default SourcesWidget;
