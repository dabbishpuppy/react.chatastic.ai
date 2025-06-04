
import React, { useEffect, useState } from "react";
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

  // Enhanced: Listen for training completion events
  useEffect(() => {
    const handleTrainingCompleted = (event: CustomEvent) => {
      console.log('🎉 Training completed event received:', event.detail);
      
      toast({
        title: "Training Complete!",
        description: "Your AI agent is fully trained and ready to use.",
        duration: 5000,
      });
      
      // Refresh stats and check status
      refetchStats();
      setTimeout(() => checkRetrainingNeeded(), 1000);
    };

    const handleTrainingContinuesInBackground = () => {
      console.log('📱 Training continues in background');
      setIsTrainingInBackground(true);
      
      toast({
        title: "Training Continues",
        description: "Training is running in the background. You'll be notified when complete.",
        duration: 4000,
      });
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
      console.log('🔍 Enhanced retraining check due to stats change:', {
        totalSources: stats.totalSources,
        requiresTraining: stats.requiresTraining,
        unprocessedCrawledPages: stats.unprocessedCrawledPages
      });
      checkRetrainingNeeded();
    }
  }, [agentId, checkRetrainingNeeded, stats?.totalSources, stats?.requiresTraining, stats?.unprocessedCrawledPages]);

  // Enhanced: Handle training state transitions
  useEffect(() => {
    if (trainingProgress?.status === 'completed' && !retrainingNeeded?.needed) {
      console.log('🎉 Enhanced training completed, updating states');
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
      console.log(`📁 Enhanced source event: ${event.type}`);
      
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

  console.log(`📊 Enhanced SourcesWidget render state:`, {
    totalSources: stats?.totalSources || 0,
    requiresTraining: stats?.requiresTraining || false,
    retrainingNeeded: retrainingNeeded?.needed,
    trainingProgressStatus: trainingProgress?.status,
    trainingProgress: trainingProgress?.progress,
    isTrainingInBackground,
    isRetraining
  });

  // Format total size from stats
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const handleRetrainClick = () => {
    console.log('🔄 Enhanced retrain button clicked');
    setShowRetrainingDialog(true);
  };

  const handleDialogClose = (open: boolean) => {
    setShowRetrainingDialog(open);
    
    // If training is active and dialog is closed, set background training state
    if (!open && (trainingProgress?.status === 'training' || isRetraining)) {
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
