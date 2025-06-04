
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

  // Refs to track previous values and prevent infinite loops
  const prevStatsRef = useRef(stats);
  const prevTrainingStatusRef = useRef(trainingProgress?.status);

  // Memoize stable values to prevent infinite loops
  const isTrainingActive = useMemo(() => 
    trainingProgress?.status === 'training' || isRetraining, 
    [trainingProgress?.status, isRetraining]
  );
  
  const isTrainingCompleted = useMemo(() => 
    trainingProgress?.status === 'completed' && !retrainingNeeded?.needed, 
    [trainingProgress?.status, retrainingNeeded?.needed]
  );

  // Stable event handlers
  const handleTrainingCompleted = useCallback((event: CustomEvent) => {
    toast({
      title: "Training Complete!",
      description: "Your AI agent is fully trained and ready to use.",
      duration: 5000,
    });
    
    refetchStats();
    setTimeout(() => checkRetrainingNeeded(), 2000);
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
    setTimeout(() => checkRetrainingNeeded(), 2000);
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

  // Check retraining status only when stats actually change
  useEffect(() => {
    if (!agentId || !stats) return;
    
    const statsChanged = prevStatsRef.current?.totalSources !== stats.totalSources ||
                        prevStatsRef.current?.requiresTraining !== stats.requiresTraining ||
                        prevStatsRef.current?.unprocessedCrawledPages !== stats.unprocessedCrawledPages;
    
    if (statsChanged) {
      prevStatsRef.current = stats;
      const timeoutId = setTimeout(() => checkRetrainingNeeded(), 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [agentId, stats?.totalSources, stats?.requiresTraining, stats?.unprocessedCrawledPages, checkRetrainingNeeded]);

  // Handle training state transitions with stable dependencies
  useEffect(() => {
    const currentStatus = trainingProgress?.status;
    const statusChanged = prevTrainingStatusRef.current !== currentStatus;
    
    if (statusChanged && currentStatus === 'completed') {
      prevTrainingStatusRef.current = currentStatus;
      setIsTrainingInBackground(false);
      
      const timeoutId = setTimeout(() => {
        refetchStats();
        checkRetrainingNeeded();
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    } else if (statusChanged) {
      prevTrainingStatusRef.current = currentStatus;
    }
  }, [trainingProgress?.status, refetchStats, checkRetrainingNeeded]);

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
