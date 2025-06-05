
import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, RefreshCw, CheckCircle, Loader2 } from "lucide-react";
import { RetrainingProgress, RetrainingStatus } from "@/services/rag/retrainingService";

interface TrainingProgress {
  status: 'idle' | 'training' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
  sessionId?: string;
  agentId?: string;
}

interface RetrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRetraining: boolean;
  progress: RetrainingProgress | null;
  retrainingNeeded: RetrainingStatus | null;
  onStartRetraining: () => Promise<void>;
  trainingProgress?: TrainingProgress | null;
  isInBackgroundMode?: boolean;
  backgroundSessionId?: string;
}

export const RetrainingDialog: React.FC<RetrainingDialogProps> = ({
  open,
  onOpenChange,
  isRetraining,
  progress,
  retrainingNeeded,
  onStartRetraining,
  trainingProgress,
  isInBackgroundMode = false,
  backgroundSessionId = ''
}) => {
  const handleStartTraining = async () => {
    console.log('🚀 Start Training button clicked - calling onStartRetraining');
    try {
      await onStartRetraining();
      console.log('✅ onStartRetraining completed successfully');
    } catch (error) {
      console.error('❌ Error in onStartRetraining:', error);
    }
  };

  const isTrainingActive = trainingProgress?.status === 'training' || isRetraining;
  const progressValue = trainingProgress?.progress || progress?.processedSources || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTrainingActive ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Training in Progress
              </>
            ) : trainingProgress?.status === 'completed' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Training Complete
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Training Required
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isTrainingActive ? (
              `Processing your sources to train the AI agent...`
            ) : trainingProgress?.status === 'completed' ? (
              'Your AI agent has been successfully trained and is ready to use.'
            ) : (
              retrainingNeeded?.message || 'Your sources need to be processed to train the AI agent.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {retrainingNeeded?.sourceDetails && retrainingNeeded.sourceDetails.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Sources requiring processing:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {retrainingNeeded.sourceDetails.map((source, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                    <span className="flex-1">{source.title}</span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                      {source.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isTrainingActive && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progressValue)}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
              {trainingProgress?.processedSources !== undefined && trainingProgress?.totalSources !== undefined && (
                <p className="text-xs text-gray-600">
                  {trainingProgress.processedSources} of {trainingProgress.totalSources} sources processed
                </p>
              )}
              {isInBackgroundMode && (
                <p className="text-xs text-blue-600">
                  Training continues in background (Session: {backgroundSessionId})
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {isTrainingActive ? 'Continue in Background' : 'Cancel'}
            </Button>
            {!isTrainingActive && trainingProgress?.status !== 'completed' && (
              <Button
                onClick={handleStartTraining}
                disabled={false}
                className="bg-black hover:bg-gray-800 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Training
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
