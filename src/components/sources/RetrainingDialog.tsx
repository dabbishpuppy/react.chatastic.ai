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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2, FileText, Globe, HelpCircle, File } from "lucide-react";

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
  // Prioritize sources needing training over stale completion status
  const getTrainingStatus = () => {
    console.log('🔍 RetrainingDialog - Current training status:', {
      retrainingNeeded: retrainingNeeded?.needed,
      trainingProgressStatus: trainingProgress?.status,
      isRetraining,
      trainingProgressData: trainingProgress
    });

    // First priority: Check if there are sources that need training
    if (retrainingNeeded?.needed) {
      console.log('📋 Sources need training, status should be idle for new training');
      return 'idle';
    }

    // Second priority: Check active training status
    if (trainingProgress?.status === 'training' || isRetraining) {
      return 'training';
    }

    // Third priority: Check if training failed
    if (trainingProgress?.status === 'failed') {
      return 'failed';
    }

    // Only show completed if no sources need training AND training was actually completed
    if (trainingProgress?.status === 'completed' && !retrainingNeeded?.needed) {
      return 'completed';
    }

    return 'idle';
  };

  const getProgressPercentage = () => {
    const status = getTrainingStatus();
    
    if (status === 'completed') return 100;
    if (status === 'failed') return 0;
    
    // Use trainingProgress data as primary source
    if (trainingProgress?.progress !== undefined && trainingProgress.progress >= 0) {
      console.log('📊 Using trainingProgress.progress:', trainingProgress.progress);
      return Math.min(100, Math.max(0, trainingProgress.progress));
    }
    
    // Calculate from processed vs total sources
    if (trainingProgress?.processedSources !== undefined && trainingProgress?.totalSources > 0) {
      const calculated = Math.round((trainingProgress.processedSources / trainingProgress.totalSources) * 100);
      console.log('📊 Calculated progress from sources:', {
        processed: trainingProgress.processedSources,
        total: trainingProgress.totalSources,
        percentage: calculated
      });
      return Math.min(100, Math.max(0, calculated));
    }
    
    return 0;
  };

  const getProcessedCount = () => {
    return trainingProgress?.processedSources || 0;
  };

  const getTotalCount = () => {
    // Use the actual sources that need processing from retrainingNeeded first
    if (retrainingNeeded?.sourceDetails?.length > 0) {
      return retrainingNeeded.sourceDetails.length;
    }
    
    // Fallback to training progress data
    return trainingProgress?.totalSources || 0;
  };

  const getStatusMessage = () => {
    const status = getTrainingStatus();
    
    // Prioritize showing sources that need training
    if (retrainingNeeded?.needed && status !== 'training') {
      return retrainingNeeded.message || `${retrainingNeeded.unprocessedSources} sources need to be processed for training.`;
    }
    
    if (status === 'training') {
      const processed = getProcessedCount();
      const total = getTotalCount();
      if (total > 0) {
        return `Training in progress... (${processed}/${total} sources processed)`;
      }
      return "Training in progress...";
    }
    
    if (status === 'failed') {
      return "Training failed. Please try again or check your sources.";
    }
    
    if (status === 'completed') {
      return "Training completed successfully! Your AI agent is trained and ready.";
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

  const status = getTrainingStatus();
  const isTrainingActive = status === 'training';
  const isTrainingCompleted = status === 'completed' && !retrainingNeeded?.needed;
  const isTrainingFailed = status === 'failed';
  const progressPercentage = getProgressPercentage();

  console.log('🔍 RetrainingDialog render state:', {
    status,
    isTrainingActive,
    isTrainingCompleted,
    isTrainingFailed,
    progressPercentage,
    processedCount: getProcessedCount(),
    totalCount: getTotalCount(),
    retrainingNeeded: retrainingNeeded?.needed
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTrainingCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : isTrainingFailed ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : isTrainingActive ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            ) : retrainingNeeded?.needed ? (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            Agent Training Status
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              {getStatusMessage()}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {(isTrainingActive || (isTrainingCompleted && !retrainingNeeded?.needed) || isTrainingFailed) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progressPercentage}%</span>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className={`w-full ${isTrainingFailed ? 'bg-red-100' : ''}`}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                {getProcessedCount()} of {getTotalCount()} sources processed
              </div>
            </div>
          )}

          {/* Source Details - Show when sources need training or when training is not completed */}
          {retrainingNeeded?.sourceDetails && retrainingNeeded.sourceDetails.length > 0 && !isTrainingCompleted && (
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
                          <div className="font-medium text-sm truncate">{source.title}</div>
                          <Badge variant="outline" className="text-xs">{source.type}</Badge>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">{source.reason}</div>
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
          {!retrainingNeeded?.needed && !isTrainingActive && !isTrainingCompleted && !isTrainingFailed && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">Everything is ready!</h3>
              <div className="text-sm text-gray-600">
                All your sources have been processed and your AI agent is fully trained.
              </div>
            </div>
          )}

          {/* Training completed message */}
          {isTrainingCompleted && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">Training Complete!</h3>
              <div className="text-sm text-gray-600">
                Your AI agent has been successfully trained and is ready to use.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {isTrainingCompleted ? (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          ) : isTrainingFailed ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Close
              </Button>
              <Button 
                onClick={onStartRetraining} 
                className="flex-1"
              >
                Retry Training
              </Button>
            </div>
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
                onClick={onStartRetraining} 
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
