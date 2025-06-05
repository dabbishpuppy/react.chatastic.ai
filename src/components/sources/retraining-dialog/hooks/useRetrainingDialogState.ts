
import { DialogStatus } from '../types';

export const useRetrainingDialogState = (
  retrainingNeeded: any,
  trainingProgress: any,
  isRetraining: boolean
) => {
  const getCurrentStatus = (): DialogStatus => {
    console.log('🔍 RetrainingDialog getCurrentStatus:', {
      retrainingNeeded: retrainingNeeded?.needed,
      trainingProgressStatus: trainingProgress?.status,
      isRetraining,
      trainingProgress
    });

    // PRIORITY 1: If currently training, show training state
    if (isRetraining || trainingProgress?.status === 'training') {
      console.log('✅ Status: training (active training)');
      return {
        status: 'training',
        progress: trainingProgress?.progress || 0
      };
    }
    
    // PRIORITY 2: If training failed, show failed state
    if (trainingProgress?.status === 'failed') {
      console.log('✅ Status: failed (training failed)');
      return {
        status: 'failed',
        progress: trainingProgress?.progress || 0
      };
    }
    
    // PRIORITY 3: If training finished AND no retraining needed, show completed
    if (trainingProgress?.status === 'completed' && !retrainingNeeded?.needed) {
      console.log('✅ Status: completed (training done and no retraining needed)');
      return {
        status: 'completed',
        progress: 100
      };
    }
    
    // PRIORITY 4: If retraining is explicitly needed, show that state
    if (retrainingNeeded?.needed) {
      console.log('✅ Status: needs_training (retraining needed)');
      return {
        status: 'needs_training',
        progress: 0
      };
    }
    
    // DEFAULT: Up to date state
    console.log('✅ Status: up_to_date (default)');
    return {
      status: 'up_to_date',
      progress: 0
    };
  };

  const getProcessedCount = () => {
    return trainingProgress?.processedSources || 0;
  };

  const getTotalCount = () => {
    if (trainingProgress?.totalSources > 0) {
      return trainingProgress.totalSources;
    }
    if (retrainingNeeded?.sourceDetails?.length > 0) {
      return retrainingNeeded.sourceDetails.length;
    }
    return 0;
  };

  const getStatusMessage = (currentStatus: string) => {
    if (currentStatus === 'training') {
      const processed = getProcessedCount();
      const total = getTotalCount();
      const currentlyProcessing = trainingProgress?.currentlyProcessing || [];
      
      if (currentlyProcessing.length > 0) {
        return `Training in progress... (${processed}/${total} processed, ${currentlyProcessing.length} currently processing)`;
      }
      
      if (total > 0) {
        return `Training in progress... (${processed}/${total} items processed)`;
      }
      return "Training in progress...";
    }
    
    if (currentStatus === 'failed') {
      return "Training failed. Please try again or check your sources.";
    }
    
    if (currentStatus === 'completed') {
      return "Training completed successfully! Your AI agent is trained and ready.";
    }
    
    // Show sources that need training
    if (retrainingNeeded?.needed) {
      return retrainingNeeded.message || `${retrainingNeeded.unprocessedSources} sources need to be processed for training.`;
    }
    
    return "Your agent is up to date.";
  };

  const getDialogTitle = (currentStatus: string) => {
    if (currentStatus === 'training') return "Agent Training Status";
    if (currentStatus === 'completed') return "Training Complete";
    if (currentStatus === 'failed') return "Training Failed";
    if (currentStatus === 'needs_training') return "Agent Training Status";
    return "Agent Training Status";
  };

  return {
    getCurrentStatus,
    getProcessedCount,
    getTotalCount,
    getStatusMessage,
    getDialogTitle
  };
};
