
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
  const [dialogOpenTimestamp, setDialogOpenTimestamp] = useState<number | null>(null);
  
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

  // ENHANCED: Listen for training state reset events
  useEffect(() => {
    const handleTrainingStateReset = (event: CustomEvent) => {
      console.log('🔄 Training state reset event received:', event.detail);
      setIsTrainingInBackground(false);
      // Only refresh if dialog is not open to prevent "up to date" override
      if (!showRetrainingDialog) {
        refetchStats();
        setTimeout(() => checkRetrainingNeeded(), 500);
      }
    };

    const handleTrainingCompleted = (event: CustomEvent) => {
      console.log('🎉 Training completed event received in SourcesWidget:', event.detail);
      setIsTrainingInBackground(false);
      // Always refresh on completion
      refetchStats();
      setTimeout(() => checkRetrainingNeeded(), 1000);
    };

    const handleTrainingContinuesInBackground = (event: CustomEvent) => {
      console.log('📱 Training continues in background - enhanced handler:', event.detail);
      setIsTrainingInBackground(true);
      setShowRetrainingDialog(false);
    };

    // ENHANCED: Listen for crawl completion events
    const handleCrawlCompleted = (event: CustomEvent) => {
      console.log('🕷️ Crawl completed event received:', event.detail);
      
      // ENHANCED: Force refresh and mark that retraining is needed
      refetchStats();
      setTimeout(() => {
        console.log('🔄 Checking retraining status after crawl completion');
        checkRetrainingNeeded();
      }, 1000);
    };

    window.addEventListener('trainingStateReset', handleTrainingStateReset as EventListener);
    window.addEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    window.addEventListener('trainingContinuesInBackground', handleTrainingContinuesInBackground as EventListener);
    window.addEventListener('crawlCompleted', handleCrawlCompleted as EventListener);
    
    return () => {
      window.removeEventListener('trainingStateReset', handleTrainingStateReset as EventListener);
      window.removeEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
      window.removeEventListener('trainingContinuesInBackground', handleTrainingContinuesInBackground as EventListener);
      window.removeEventListener('crawlCompleted', handleCrawlCompleted as EventListener);
    };
  }, [refetchStats, checkRetrainingNeeded, showRetrainingDialog]);

  // ENHANCED: Only check retraining status when dialog is closed to prevent override
  useEffect(() => {
    if (agentId && stats && !showRetrainingDialog) {
      checkRetrainingNeeded();
    }
  }, [agentId, checkRetrainingNeeded, stats?.totalSources, showRetrainingDialog]);

  // Enhanced: Handle training state transitions with immediate state checking
  useEffect(() => {
    if (trainingProgress?.status === 'completed' && !retrainingNeeded?.needed) {
      console.log('🎯 Training completed - resetting background state');
      setIsTrainingInBackground(false);
      
      // Refresh stats after completion, but only if dialog is closed
      if (!showRetrainingDialog) {
        setTimeout(() => {
          refetchStats();
          checkRetrainingNeeded();
        }, 2000);
      }
    }
  }, [trainingProgress?.status, retrainingNeeded?.needed, refetchStats, checkRetrainingNeeded, showRetrainingDialog]);

  // ENHANCED: Source event handlers with immediate state updates (only if dialog closed)
  useEffect(() => {
    const handleSourceEvent = (event: CustomEvent) => {
      console.log('📄 Source event received:', event.type, event.detail);
      
      // Immediately reset background training state for new content
      setIsTrainingInBackground(false);
      
      // Only refresh if dialog is not open
      if (!showRetrainingDialog) {
        // Refresh stats immediately
        refetchStats();
        
        // Check retraining status after a delay to allow processing
        setTimeout(() => checkRetrainingNeeded(), 1500);
      }
    };

    const eventTypes = ['fileUploaded', 'sourceDeleted', 'sourceCreated', 'sourceUpdated', 'crawlCompleted', 'sourceStatusChanged', 'crawlStarted'];
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleSourceEvent as EventListener);
    });
    
    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleSourceEvent as EventListener);
      });
    };
  }, [refetchStats, checkRetrainingNeeded, showRetrainingDialog]);

  // Format total size from stats
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  // ENHANCED: Handle opening the retrain dialog with immediate fresh check
  const handleRetrainClick = () => {
    console.log('🔄 ENHANCED: Retrain button clicked - forcing fresh retraining check');
    setDialogOpenTimestamp(Date.now());
    setShowRetrainingDialog(true);
    
    // ENHANCED: Always force a fresh retraining check when dialog opens
    setTimeout(() => {
      console.log('🔄 ENHANCED: Forcing immediate retraining status check');
      checkRetrainingNeeded();
    }, 100);
  };

  const handleDialogClose = (open: boolean) => {
    console.log('🔄 Dialog close requested:', { open, isTraining: isTrainingActive });
    
    if (!open) {
      setShowRetrainingDialog(false);
      setDialogOpenTimestamp(null);
      
      // FIXED: Only set background training if training is actually active AND not completed
      if (isTrainingActive && trainingProgress?.status !== 'completed') {
        console.log('📱 Setting background training state');
        setIsTrainingInBackground(true);
      }
      
      // After closing dialog, refresh retraining status
      setTimeout(() => {
        refetchStats();
        checkRetrainingNeeded();
      }, 500);
    } else {
      setShowRetrainingDialog(true);
      setDialogOpenTimestamp(Date.now());
    }
  };

  // Check if training is active
  const isTrainingActive = trainingProgress?.status === 'training' || trainingProgress?.status === 'initializing' || isRetraining;
  const isTrainingCompleted = trainingProgress?.status === 'completed' && !retrainingNeeded?.needed;

  // ENHANCED: Always use the actual retraining status, don't override it
  const shouldShowTrainingRequired = () => {
    return retrainingNeeded?.needed || false;
  };

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
        retrainingNeeded={shouldShowTrainingRequired()}
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
