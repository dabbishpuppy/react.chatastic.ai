
import React, { useEffect, useState } from "react";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import { useAgentSourcesRealtime } from "@/hooks/useAgentSourcesRealtime";
import { useEnhancedAgentRetraining } from "@/hooks/useEnhancedAgentRetraining";
import { useParams } from "react-router-dom";
import SourcesLoadingState from "./SourcesLoadingState";
import SourcesErrorState from "./SourcesErrorState";
import SourcesContent from "./SourcesContent";
import { EnhancedRetrainingDialog } from "./EnhancedRetrainingDialog";

interface EnhancedSourcesWidgetProps {
  currentTab?: string;
}

/**
 * Phase 4: Enhanced Sources Widget with Dialog Polling Protection & Cross-Tab Synchronization
 * Phase 3: Race Condition Prevention through delayed status checks
 */
const EnhancedSourcesWidget: React.FC<EnhancedSourcesWidgetProps> = ({ currentTab }) => {
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
    retryFailedSource,
    setDialogLocked,
    trainingProgress,
    currentSessionId
  } = useEnhancedAgentRetraining(agentId);
  
  // Set up centralized real-time subscription
  useAgentSourcesRealtime();

  // Phase 4: Enhanced event listeners for cross-tab synchronization and polling protection
  useEffect(() => {
    const handleTrainingStateReset = (event: CustomEvent) => {
      console.log('🔄 Training state reset event received:', event.detail);
      setIsTrainingInBackground(false);
      // Only refresh if dialog is not open to prevent "up to date" override
      if (!showRetrainingDialog) {
        refetchStats();
        setTimeout(() => checkRetrainingNeeded(true), 500);
      }
    };

    const handleTrainingCompleted = (event: CustomEvent) => {
      console.log('🎉 Training completed event received in EnhancedSourcesWidget:', event.detail);
      setIsTrainingInBackground(false);
      
      // Phase 4: If dialog is open and this is from another tab, auto-switch to completion view
      if (showRetrainingDialog && event.detail?.sessionId !== currentSessionId) {
        console.log('📱 Cross-tab training completion detected - updating dialog');
        // The dialog will detect this status change and switch to completion view
      }
      
      // Always refresh on completion
      refetchStats();
      setTimeout(() => checkRetrainingNeeded(true), 1000);
    };

    const handleTrainingContinuesInBackground = (event: CustomEvent) => {
      console.log('📱 Training continues in background - enhanced handler:', event.detail);
      setIsTrainingInBackground(true);
      setShowRetrainingDialog(false);
      setDialogLocked(false); // Release dialog lock when going to background
    };

    // Phase 3: Listen for crawl completion events with race condition prevention
    const handleCrawlCompleted = (event: CustomEvent) => {
      console.log('🕷️ Crawl completed event received:', event.detail);
      
      // Phase 3: Force refresh and wait for database consistency
      refetchStats();
      setTimeout(() => {
        console.log('🔄 Checking retraining status after crawl completion with delay');
        checkRetrainingNeeded(true);
      }, 1500); // Increased delay for database consistency
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
  }, [refetchStats, checkRetrainingNeeded, showRetrainingDialog, currentSessionId, setDialogLocked]);

  // Phase 4: Only check retraining status when dialog is closed to prevent override
  useEffect(() => {
    if (agentId && stats && !showRetrainingDialog) {
      // Add small delay to ensure stats are fully loaded
      setTimeout(() => checkRetrainingNeeded(false), 100);
    }
  }, [agentId, checkRetrainingNeeded, stats?.totalSources, showRetrainingDialog]);

  // Phase 4: Handle training state transitions with cross-tab detection
  useEffect(() => {
    if (trainingProgress?.status === 'completed' && !retrainingNeeded?.needed) {
      console.log('🎯 Training completed - resetting background state');
      setIsTrainingInBackground(false);
      
      // Refresh stats after completion, but only if dialog is closed
      if (!showRetrainingDialog) {
        setTimeout(() => {
          refetchStats();
          checkRetrainingNeeded(true);
        }, 2000);
      }
    }
  }, [trainingProgress?.status, retrainingNeeded?.needed, refetchStats, checkRetrainingNeeded, showRetrainingDialog]);

  // Phase 3: Source event handlers with immediate state updates and dialog protection
  useEffect(() => {
    const handleSourceEvent = (event: CustomEvent) => {
      console.log('📄 Enhanced source event received:', event.type, event.detail);
      
      // Immediately reset background training state for new content
      setIsTrainingInBackground(false);
      
      // Only refresh if dialog is not open to prevent status override
      if (!showRetrainingDialog) {
        // Refresh stats immediately
        refetchStats();
        
        // Phase 3: Check retraining status after a delay to allow processing
        setTimeout(() => checkRetrainingNeeded(true), 1500);
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

  // Phase 4: Handle opening the retrain dialog with fresh check and dialog lock
  const handleRetrainClick = () => {
    console.log('🔄 ENHANCED: Retrain button clicked - locking dialog and forcing fresh check');
    
    // Phase 4: Lock dialog to prevent polling interference
    setDialogLocked(true);
    setShowRetrainingDialog(true);
    
    // Always force a fresh retraining check when dialog opens
    setTimeout(() => {
      console.log('🔄 ENHANCED: Forcing immediate fresh retraining status check');
      checkRetrainingNeeded(true);
    }, 100);
  };

  const handleDialogClose = (open: boolean) => {
    console.log('🔄 Enhanced dialog close requested:', { open, isTraining: isTrainingActive });
    
    if (!open) {
      setShowRetrainingDialog(false);
      setDialogLocked(false); // Release dialog lock
      
      // FIXED: Only set background training if training is actually active AND not completed
      if (isTrainingActive && trainingProgress?.status !== 'completed') {
        console.log('📱 Setting background training state');
        setIsTrainingInBackground(true);
      }
      
      // After closing dialog, refresh retraining status
      setTimeout(() => {
        refetchStats();
        checkRetrainingNeeded(true);
      }, 500);
    } else {
      setShowRetrainingDialog(true);
      setDialogLocked(true); // Lock dialog when opening
    }
  };

  // Check if training is active
  const isTrainingActive = trainingProgress?.status === 'training' || trainingProgress?.status === 'initializing' || isRetraining;
  const isTrainingCompleted = trainingProgress?.status === 'completed' && !retrainingNeeded?.needed;

  // Phase 6: Always use the actual retraining status, don't override it
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

      <EnhancedRetrainingDialog
        open={showRetrainingDialog}
        onOpenChange={handleDialogClose}
        isRetraining={isTrainingActive}
        progress={progress}
        retrainingNeeded={retrainingNeeded}
        onStartRetraining={startRetraining}
        onRetryFailedSource={retryFailedSource}
        trainingProgress={trainingProgress}
      />
    </>
  );
};

export default EnhancedSourcesWidget;
