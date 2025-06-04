
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import { useAgentSourcesRealtime } from "@/hooks/useAgentSourcesRealtime";
import { useAgentRetraining } from "@/hooks/useAgentRetraining";
import { useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
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
  
  const {
    isRetraining,
    progress,
    retrainingNeeded,
    startRetraining,
    checkRetrainingNeeded,
    trainingProgress
  } = useAgentRetraining(agentId);
  
  useAgentSourcesRealtime();

  // Memoize stable values to prevent infinite loops
  const isTrainingActive = useMemo(() => 
    trainingProgress?.status === 'training' || isRetraining, 
    [trainingProgress?.status, isRetraining]
  );
  
  const isTrainingCompleted = useMemo(() => 
    trainingProgress?.status === 'completed' && !retrainingNeeded?.needed, 
    [trainingProgress?.status, retrainingNeeded?.needed]
  );

  // Memoize event handlers to prevent re-creation on every render
  const handleTrainingCompleted = useCallback((event: CustomEvent) => {
    toast({
      title: "Training Complete!",
      description: "Your AI agent is fully trained and ready to use.",
      duration: 5000,
    });
    
    refetchStats();
    setTimeout(() => checkRetrainingNeeded(), 1000);
  }, [refetchStats, checkRetrainingNeeded]);

  const handleTrainingContinuesInBackground = useCallback(() => {
    setIsTrainingInBackground(true);
    toast({
      title: "Training Continues",
      description: "Training is running in the background. You'll be notified when complete.",
      duration: 4000,
    });
  }, []);

  const handleSourceEvent = useCallback(() => {
    setIsTrainingInBackground(false);
    refetchStats();
    setTimeout(() => checkRetrainingNeeded(), 1500);
  }, [refetchStats, checkRetrainingNeeded]);

  // Listen for training events with stable handlers
  useEffect(() => {
    window.addEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    window.addEventListener('trainingContinuesInBackground', handleTrainingContinuesInBackground as EventListener);
    
    return () => {
      window.removeEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
      window.removeEventListener('trainingContinuesInBackground', handleTrainingContinuesInBackground as EventListener);
    };
  }, [handleTrainingCompleted, handleTrainingContinuesInBackground]);

  // Check retraining status only when necessary values change
  useEffect(() => {
    if (agentId && stats?.totalSources !== undefined) {
      checkRetrainingNeeded();
    }
  }, [agentId, stats?.totalSources, stats?.requiresTraining, stats?.unprocessedCrawledPages]);

  // Handle training state transitions with stable dependencies
  useEffect(() => {
    if (isTrainingCompleted) {
      setIsTrainingInBackground(false);
      const timeoutId = setTimeout(() => {
        refetchStats();
        checkRetrainingNeeded();
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isTrainingCompleted, refetchStats, checkRetrainingNeeded]);

  // Listen for source events with stable handler
  useEffect(() => {
    const eventTypes = ['fileUploaded', 'sourceDeleted', 'sourceCreated', 'sourceUpdated', 'crawlCompleted', 'sourceStatusChanged'];
    
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleSourceEvent);
    });
    
    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleSourceEvent);
      });
    };
  }, [handleSourceEvent]);

  const formatTotalSize = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  }, []);

  const handleRetrainClick = useCallback(() => {
    setShowRetrainingDialog(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setShowRetrainingDialog(open);
    
    if (!open && isTrainingActive) {
      setIsTrainingInBackground(true);
    }
  }, [isTrainingActive]);

  if (isLoading) return <SourcesLoadingState />;
  if (error) return <SourcesErrorState error={error.message} />;
  if (!stats) return <SourcesErrorState error="No stats available" />;

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
