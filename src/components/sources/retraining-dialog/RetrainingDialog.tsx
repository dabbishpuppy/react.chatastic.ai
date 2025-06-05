
import React from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { RetrainingDialogProps } from './types';
import { useRetrainingDialogState } from './hooks/useRetrainingDialogState';
import { RetrainingDialogHeader } from './components/DialogHeader';
import { ProgressSection } from './components/ProgressSection';
import { SourceDetailsSection } from './components/SourceDetailsSection';
import { StatusSection } from './components/StatusSection';
import { RetrainingDialogFooter } from './components/DialogFooter';

export const RetrainingDialog: React.FC<RetrainingDialogProps> = ({
  open,
  onOpenChange,
  isRetraining,
  progress,
  retrainingNeeded,
  onStartRetraining,
  trainingProgress
}) => {
  const {
    getCurrentStatus,
    getProcessedCount,
    getTotalCount,
    getStatusMessage,
    getDialogTitle
  } = useRetrainingDialogState(retrainingNeeded, trainingProgress, isRetraining);

  const { status: currentStatus, progress: currentProgress } = getCurrentStatus();
  
  console.log('🔍 RetrainingDialog render state:', {
    currentStatus,
    isRetraining,
    trainingProgressStatus: trainingProgress?.status,
    retrainingNeeded: retrainingNeeded?.needed,
    currentProgress
  });

  const handleStartTraining = async () => {
    console.log('🚀 Start Training button clicked');
    
    try {
      await onStartRetraining();
      console.log('✅ Training initiated successfully');
      
      // Don't close the dialog immediately - let it show training progress
      console.log('📊 Keeping dialog open to show training progress');
    } catch (error) {
      console.error('❌ Failed to start training:', error);
    }
  };

  const handleContinueInBackground = () => {
    console.log('📱 Continue in background clicked - enhanced');
    
    // Close the dialog first
    onOpenChange(false);
    
    // FIXED: Dispatch event with better data
    window.dispatchEvent(new CustomEvent('trainingContinuesInBackground', {
      detail: { 
        agentId: trainingProgress?.agentId,
        sessionId: trainingProgress?.sessionId,
        status: 'background'
      }
    }));
    
    console.log('📱 Background training event dispatched for session:', trainingProgress?.sessionId);
  };

  const title = getDialogTitle(currentStatus);
  const message = getStatusMessage(currentStatus);
  const processedCount = getProcessedCount();
  const totalCount = getTotalCount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <RetrainingDialogHeader
          currentStatus={currentStatus}
          title={title}
          message={message}
          retrainingNeeded={retrainingNeeded}
        />

        <div className="flex-1 overflow-y-auto space-y-4">
          <ProgressSection
            currentStatus={currentStatus}
            currentProgress={currentProgress}
            processedCount={processedCount}
            totalCount={totalCount}
            trainingProgress={trainingProgress}
          />

          <SourceDetailsSection
            retrainingNeeded={retrainingNeeded}
            currentStatus={currentStatus}
          />

          <StatusSection
            currentStatus={currentStatus}
            retrainingNeeded={retrainingNeeded}
          />
        </div>

        <RetrainingDialogFooter
          currentStatus={currentStatus}
          retrainingNeeded={retrainingNeeded}
          onOpenChange={onOpenChange}
          onStartRetraining={handleStartTraining}
          onContinueInBackground={handleContinueInBackground}
        />
      </DialogContent>
    </Dialog>
  );
};
