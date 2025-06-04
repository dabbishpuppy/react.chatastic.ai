
import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useTrainingNotifications } from "@/hooks/useTrainingNotifications";

interface RetrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRetraining: boolean;
  progress: any;
  retrainingNeeded: any;
  onStartRetraining: () => void;
}

export const RetrainingDialog: React.FC<RetrainingDialogProps> = ({
  open,
  onOpenChange,
  isRetraining,
  progress,
  retrainingNeeded,
  onStartRetraining
}) => {
  const { trainingProgress, startTraining } = useTrainingNotifications();

  const handleStartTraining = async () => {
    await startTraining();
    onStartRetraining(); // Keep the original logic for backward compatibility
  };

  const getProgressPercentage = () => {
    if (trainingProgress?.status === 'completed') return 100;
    if (trainingProgress?.progress) return trainingProgress.progress;
    if (progress?.processedSources && progress?.totalSources) {
      return Math.round((progress.processedSources / progress.totalSources) * 100);
    }
    return 0;
  };

  const getStatusMessage = () => {
    if (trainingProgress?.status === 'completed') {
      return "Training completed successfully! Your AI agent is trained and ready.";
    }
    if (trainingProgress?.status === 'training' || isRetraining) {
      const processed = trainingProgress?.processedPages || progress?.processedSources || 0;
      const total = trainingProgress?.totalPages || progress?.totalSources || 0;
      return `Training in progress... (${processed}/${total} pages processed)`;
    }
    if (retrainingNeeded?.needed) {
      return `${retrainingNeeded.unprocessedSources} source pages need to be processed for training.`;
    }
    return "Your agent is up to date.";
  };

  const isTrainingActive = trainingProgress?.status === 'training' || isRetraining;
  const isTrainingCompleted = trainingProgress?.status === 'completed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTrainingCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : isTrainingActive ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            ) : retrainingNeeded?.needed ? (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            Agent Training
          </DialogTitle>
          <DialogDescription>
            {getStatusMessage()}
          </DialogDescription>
        </DialogHeader>

        {(isTrainingActive || isTrainingCompleted) && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="w-full" />
            </div>

            {trainingProgress && (
              <div className="text-sm text-muted-foreground">
                {trainingProgress.processedPages} of {trainingProgress.totalPages} pages processed
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {isTrainingCompleted ? (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          ) : isTrainingActive ? (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Continue in Background
            </Button>
          ) : retrainingNeeded?.needed ? (
            <Button 
              onClick={handleStartTraining} 
              disabled={isTrainingActive}
              className="w-full"
            >
              Start Training
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
