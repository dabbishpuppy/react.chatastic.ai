
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
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2, FileText, Globe, HelpCircle, File } from "lucide-react";
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
      return `Training in progress... (${processed}/${total} sources processed)`;
    }
    if (retrainingNeeded?.needed) {
      return retrainingNeeded.message || `${retrainingNeeded.unprocessedSources} sources need to be processed for training.`;
    }
    return "Your agent is up to date.";
  };

  const getSourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'website':
        return <Globe className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'file':
        return <File className="h-4 w-4" />;
      case 'q&a':
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Needs Processing':
        return "destructive";
      case 'Needs Reprocessing':
        return "secondary";
      case 'Crawled - Needs Training':
        return "default";
      default:
        return "outline";
    }
  };

  const isTrainingActive = trainingProgress?.status === 'training' || isRetraining;
  const isTrainingCompleted = trainingProgress?.status === 'completed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
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
            Agent Training Status
          </DialogTitle>
          <DialogDescription>
            {getStatusMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
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

          {/* Source Details */}
          {retrainingNeeded?.sourceDetails && retrainingNeeded.sourceDetails.length > 0 && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Sources requiring processing:</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {retrainingNeeded.sourceDetails.map((source: any) => (
                    <div key={source.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-0.5">
                        {getSourceIcon(source.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{source.title}</p>
                          <Badge variant="outline" className="text-xs">{source.type}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{source.reason}</p>
                        <Badge variant={getStatusBadgeVariant(source.status)} className="text-xs">
                          {source.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No sources message */}
          {!retrainingNeeded?.needed && !isTrainingActive && !isTrainingCompleted && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">Everything is ready!</h3>
              <p className="text-sm text-gray-600">
                All your sources have been processed and your AI agent is fully trained.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {isTrainingCompleted ? (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          ) : isTrainingActive ? (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Continue in Background
            </Button>
          ) : retrainingNeeded?.needed ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleStartTraining} 
                disabled={isTrainingActive}
                className="flex-1"
              >
                Start Training
              </Button>
            </div>
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
