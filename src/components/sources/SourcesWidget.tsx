
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

  // Auto-open dialog when training starts
  useEffect(() => {
    if (isRetraining && !showRetrainingDialog && !isTrainingInBackground) {
      console.log('🔄 Training started - opening dialog');
      setShowRetrainingDialog(true);
    }
  }, [isRetraining, showRetrainingDialog, isTrainingInBackground]);

  // Enhanced training completion listener
  useEffect(() => {
    const handleTrainingCompleted = (event: CustomEvent) => {
      console.log('🎉 Training completed event received in SourcesWidget:', event.detail);
      
      // Refresh stats and check status
      refetchStats();
      setTimeout(() => checkRetrainingNeeded(), 1000);
      
      // Clear background training state
      setIsTrainingInBackground(false);
    };

    const handleTrainingContinuesInBackground = (event: CustomEvent) => {
      console.log('📱 Training continues in background:', event.detail);
      setIsTrainingInBackground(true);
      setShowRetrainingDialog(false);
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    window.addEventListener('trainingContinuesInBackground', handleTrainingContinuesInBackground as EventListener);
    
    return () => {
      window.removeEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
      window.removeEventListener('trainingContinuesInBackground', handleTrainingContinuesInBackground as EventListener);
    };
  }, [refetchStats, checkRetrainingNeeded]);

  // Check retraining status when stats change
  useEffect(() => {
    if (agentId && stats) {
      const timeoutId = setTimeout(() => {
        checkRetrainingNeeded();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [agentId, checkRetrainingNeeded, stats?.totalSources]);

  // Handle training state transitions
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

  // Listen for source events
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    
    const handleSourceEvent = (event: CustomEvent) => {
      console.log('📝 Source event received:', event.type);
      
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Reset background training state when sources change
      setIsTrainingInBackground(false);
      
      // Debounce the refresh actions
      debounceTimer = setTimeout(() => {
        refetchStats();
        checkRetrainingNeeded();
      }, 1000);
    };

    const eventTypes = ['fileUploaded', 'sourceDeleted', 'sourceCreated', 'sourceUpdated', 'crawlCompleted', 'sourceStatusChanged'];
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleSourceEvent as EventListener);
    });
    
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
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
    console.log('🔄 Retrain button clicked');
    setShowRetrainingDialog(true);
  };

  const handleDialogClose = (open: boolean) => {
    console.log('🔄 Dialog close requested:', { open, isTraining: isTrainingActive });
    setShowRetrainingDialog(open);
    
    // If closing dialog while training is active, set background mode
    if (!open && isTrainingActive && trainingProgress?.status === 'training') {
      console.log('📱 Setting background training state - training is active');
      setIsTrainingInBackground(true);
      
      // Dispatch background event
      window.dispatchEvent(new CustomEvent('trainingContinuesInBackground', {
        detail: { 
          agentId: trainingProgress?.agentId,
          sessionId: trainingProgress?.sessionId,
          status: 'background'
        }
      }));
    }
  };

  // Better training state determination
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
