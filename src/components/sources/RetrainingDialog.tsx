
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { RetrainingStatusBadge } from "./retraining/RetrainingStatusBadge";
import { RetrainingProgressSection } from "./retraining/RetrainingProgressSection";
import { RetrainingSourcesList } from "./retraining/RetrainingSourcesList";

interface RetrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRetraining: boolean;
  progress: any;
  retrainingNeeded: any;
  onStartRetraining: () => void;
  trainingProgress?: any;
}

export const RetrainingDialog: React.FC<RetrainingDialogProps> = ({
  open,
  onOpenChange,
  isRetraining,
  progress,
  retrainingNeeded,
  onStartRetraining,
  trainingProgress
}) => {
  const getTrainingStatus = () => {
    if (trainingProgress?.status === 'training') return 'training';
    if (trainingProgress?.status === 'completed') return !retrainingNeeded?.needed ? 'completed' : 'idle';
    if (trainingProgress?.status === 'failed') return 'failed';
    if (retrainingNeeded?.needed) return 'idle';
    return 'idle';
  };

  const getProgressPercentage = () => {
    const status = getTrainingStatus();
    if (status === 'completed') return 100;
    if (status === 'failed') return 0;
    if (trainingProgress?.progress !== undefined) {
      return Math.min(100, Math.max(0, trainingProgress.progress));
    }
    return 0;
  };

  const getProcessedCount = () => trainingProgress?.processedSources || 0;
  const getTotalCount = () => {
    if (trainingProgress?.totalSources > 0) return trainingProgress.totalSources;
    if (retrainingNeeded?.sourceDetails?.length > 0) return retrainingNeeded.sourceDetails.length;
    return 0;
  };

  const getStatusMessage = () => {
    const status = getTrainingStatus();
    
    if (status === 'training') {
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
    
    if (status === 'failed') return "Training failed. Please try again or check your sources.";
    if (status === 'completed') return "Training completed successfully! Your AI agent is trained and ready.";
    if (retrainingNeeded?.needed) return retrainingNeeded.message || `${retrainingNeeded.unprocessedSources} sources need to be processed for training.`;
    
    return "Your agent is up to date.";
  };

  const handleStartTraining = async () => {
    try {
      await onStartRetraining();
    } catch (error) {
      console.error('❌ Failed to start training:', error);
    }
  };

  const handleContinueInBackground = () => {
    onOpenChange(false);
    window.dispatchEvent(new CustomEvent('trainingContinuesInBackground', {
      detail: { agentId: trainingProgress?.agentId }
    }));
  };

  const status = getTrainingStatus();
  const isTrainingActive = status === 'training';
  const isTrainingCompleted = status === 'completed';
  const isTrainingFailed = status === 'failed';
  const progressPercentage = getProgressPercentage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RetrainingStatusBadge 
              status={status}
              isRetrainingNeeded={retrainingNeeded?.needed || false}
            />
            Agent Training Status
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              {getStatusMessage()}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <RetrainingProgressSection
            status={status}
            progressPercentage={progressPercentage}
            processedCount={getProcessedCount()}
            totalCount={getTotalCount()}
            currentlyProcessing={trainingProgress?.currentlyProcessing}
          />

          <RetrainingSourcesList
            sourceDetails={retrainingNeeded?.sourceDetails || []}
            isTrainingCompleted={isTrainingCompleted}
          />

          {isTrainingCompleted && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">Training Complete!</h3>
              <div className="text-sm text-gray-600">
                Your AI agent has been successfully trained and is ready to use.
              </div>
            </div>
          )}

          {!retrainingNeeded?.needed && !isTrainingActive && !isTrainingCompleted && !isTrainingFailed && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">Everything is ready!</h3>
              <div className="text-sm text-gray-600">
                All your sources have been processed and your AI agent is fully trained.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {isTrainingCompleted ? (
            <Button onClick={() => onOpenChange(false)} className="w-full">Done</Button>
          ) : isTrainingFailed ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Close</Button>
              <Button onClick={handleStartTraining} className="flex-1">Retry Training</Button>
            </div>
          ) : isTrainingActive ? (
            <Button variant="outline" onClick={handleContinueInBackground} className="w-full">
              Continue in Background
            </Button>
          ) : retrainingNeeded?.needed ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleStartTraining} disabled={isTrainingActive} className="flex-1">
                Start Training
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
