
import React, { useEffect, useState } from "react";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import { useAgentSourcesRealtime } from "@/hooks/useAgentSourcesRealtime";
import { useAgentRetraining } from "@/hooks/useAgentRetraining";
import { useParams } from "react-router-dom";
import SourcesLoadingState from "./SourcesLoadingState";
import SourcesErrorState from "./SourcesErrorState";
import SourcesContent from "./SourcesContent";
import { RetrainingDialog } from "./RetrainingDialog";
import { toast } from "@/hooks/use-toast";

interface SourcesWidgetProps {
  currentTab?: string;
}

const SourcesWidget: React.FC<SourcesWidgetProps> = ({ currentTab }) => {
  const { agentId } = useParams();
  const { data: stats, isLoading, error, refetch: refetchStats } = useAgentSourceStats();
  const [showRetrainingDialog, setShowRetrainingDialog] = useState(false);
  const [isTrainingInBackground, setIsTrainingInBackground] = useState(false);
  const [backgroundSessionId, setBackgroundSessionId] = useState<string>('');
  const [userInitiatedTraining, setUserInitiatedTraining] = useState(false);
  const [backgroundModeLocked, setBackgroundModeLocked] = useState(false);
  
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

  // Enhanced training completion listener
  useEffect(() => {
    const handleTrainingCompleted = (event: CustomEvent) => {
      console.log('🎉 Training completed event received in SourcesWidget:', event.detail);
      
      // Reset all training-related flags
      setUserInitiatedTraining(false);
      setBackgroundModeLocked(false);
      
      // If training was in background, show toast and cleanup
      if (isTrainingInBackground) {
        console.log('🎉 Training completed in background - showing toast and cleaning up');
        toast({
          title: "Training Complete",
          description: "Your AI agent has been successfully trained and is ready to use.",
          duration: 5000,
        });
        setIsTrainingInBackground(false);
        setBackgroundSessionId('');
        setShowRetrainingDialog(false); // Ensure dialog stays closed
      }
      
      // Refresh stats and check status
      refetchStats();
      setTimeout(() => checkRetrainingNeeded(), 1000);
    };

    const handleTrainingContinuesInBackground = (event: CustomEvent) => {
      console.log('📱 Training continues in background:', event.detail);
      setIsTrainingInBackground(true);
      setBackgroundModeLocked(true); // Lock background mode
      setBackgroundSessionId(event.detail?.sessionId || '');
      setShowRetrainingDialog(false);
      setUserInitiatedTraining(false); // Reset to prevent conflicts
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    window.addEventListener('trainingContinuesInBackground', handleTrainingContinuesInBackground as EventListener);
    
    return () => {
      window.removeEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
      window.removeEventListener('trainingContinuesInBackground', handleTrainingContinuesInBackground as EventListener);
    };
  }, [refetchStats, checkRetrainingNeeded, isTrainingInBackground]);

  // Check retraining status when stats change (but don't auto-open dialog)
  useEffect(() => {
    if (agentId && stats) {
      const timeoutId = setTimeout(() => {
        checkRetrainingNeeded();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [agentId, checkRetrainingNeeded, stats?.totalSources]);

  // Handle training state transitions - prevent auto-reopening dialog
  useEffect(() => {
    if (trainingProgress?.status === 'completed' && !retrainingNeeded?.needed) {
      console.log('🎯 Training completed - cleaning up state');
      
      // Only reset background state if training was actually completed and not locked
      if (isTrainingInBackground && !backgroundModeLocked) {
        setIsTrainingInBackground(false);
        setBackgroundSessionId('');
      }
      
      // Always reset user initiated flag on completion
      setUserInitiatedTraining(false);
      
      // Refresh stats after completion
      setTimeout(() => {
        refetchStats();
        checkRetrainingNeeded();
      }, 2000);
    }
  }, [trainingProgress?.status, retrainingNeeded?.needed, refetchStats, checkRetrainingNeeded, isTrainingInBackground, backgroundModeLocked]);

  // Listen for source events
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    
    const handleSourceEvent = (event: CustomEvent) => {
      console.log('📝 Source event received:', event.type);
      
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Don't reset background training state on source events during active training or when locked
      if (!isRetraining && !isTrainingInBackground && !backgroundModeLocked) {
        setIsTrainingInBackground(false);
      }
      
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
  }, [refetchStats, checkRetrainingNeeded, isRetraining, isTrainingInBackground, backgroundModeLocked]);

  // Format total size from stats
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const handleRetrainClick = () => {
    console.log('🔄 Retrain button clicked - setting user-initiated flag and opening dialog');
    setUserInitiatedTraining(true);
    setIsTrainingInBackground(false); // Reset background state
    setBackgroundModeLocked(false); // Reset background lock
    setBackgroundSessionId('');
    setShowRetrainingDialog(true);
  };

  const handleDialogClose = (open: boolean) => {
    console.log('🔄 Dialog close requested:', { 
      open, 
      isTraining: isTrainingActive, 
      isBackground: isTrainingInBackground,
      userInitiated: userInitiatedTraining,
      backgroundLocked: backgroundModeLocked
    });
    
    // If closing dialog while training is active and not already in background mode, set background mode
    if (!open && isTrainingActive && trainingProgress?.status === 'training' && !backgroundModeLocked) {
      console.log('📱 Setting background training state - training is active');
      setIsTrainingInBackground(true);
      setBackgroundModeLocked(true); // Lock background mode
      setBackgroundSessionId(trainingProgress?.sessionId || '');
      setUserInitiatedTraining(false); // Reset to prevent reopening
      
      // Dispatch background event
      window.dispatchEvent(new CustomEvent('trainingContinuesInBackground', {
        detail: { 
          agentId: trainingProgress?.agentId,
          sessionId: trainingProgress?.sessionId,
          status: 'background'
        }
      }));
    } else if (!open) {
      // Normal close - reset user-initiated flag but preserve background state if locked
      setUserInitiatedTraining(false);
    }
    
    setShowRetrainingDialog(open);
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
        isTrainingInBackground={isTrainingInBackground && backgroundModeLocked}
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
        isInBackgroundMode={isTrainingInBackground && backgroundModeLocked}
        backgroundSessionId={backgroundSessionId}
      />
    </>
  );
};

export default SourcesWidget;
