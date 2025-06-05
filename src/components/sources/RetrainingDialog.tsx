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
  // FIXED: Improved status determination with strict priority for training state
  const getCurrentStatus = () => {
    console.log('🔍 RetrainingDialog getCurrentStatus:', {
      retrainingNeeded: retrainingNeeded?.needed,
      trainingProgressStatus: trainingProgress?.status,
      trainingProgressValue: trainingProgress?.progress,
      isRetraining,
      trainingProgress
    });

    // PRIORITY 1: If currently training OR retraining flag is true, ALWAYS show training state
    // This prevents jumping back to "needs_training" during active training
    if (isRetraining || trainingProgress?.status === 'training') {
      console.log('✅ Status: training (active training detected - LOCKED IN)');
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

    // PRIORITY 3: If training progress shows completed AND progress is 100%
    if (trainingProgress?.status === 'completed' || trainingProgress?.progress === 100) {
      console.log('✅ Status: completed (training completed with 100% progress)');
      return {
        status: 'completed',
        progress: 100
      };
    }

    // PRIORITY 4: If retraining is explicitly needed (only when not training)
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

  const { status: currentStatus, progress: currentProgress } = getCurrentStatus();
  
  console.log('🔍 RetrainingDialog render state:', {
    currentStatus,
    currentProgress,
    isRetraining,
    trainingProgressStatus: trainingProgress?.status,
    retrainingNeeded: retrainingNeeded?.needed
  });

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

  const getStatusMessage = () => {
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

  const getDialogTitle = () => {
    if (currentStatus === 'training') return "Agent Training Status";
    if (currentStatus === 'completed') return "Training Complete";
    if (currentStatus === 'failed') return "Training Failed";
    if (currentStatus === 'needs_training') return "Agent Training Status";
    return "Agent Training Status";
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

  const handleStartTraining = async () => {
    console.log('🚀 Start Training button clicked');
    
    try {
      await onStartRetraining();
      console.log('✅ Training initiated successfully');
      
      // Keep dialog open to show training progress
      console.log('📊 Keeping dialog open to show training progress');
    } catch (error) {
      console.error('❌ Failed to start training:', error);
    }
  };

  const handleContinueInBackground = () => {
    console.log('📱 Continue in background clicked');
    
    // Close the dialog first
    onOpenChange(false);
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('trainingContinuesInBackground', {
      detail: { 
        agentId: trainingProgress?.agentId,
        sessionId: trainingProgress?.sessionId,
        status: 'background'
      }
    }));
    
    console.log('📱 Background training event dispatched for session:', trainingProgress?.sessionId);
  };

  const isTrainingActive = currentStatus === 'training';
  const isTrainingCompleted = currentStatus === 'completed';
  const isTrainingFailed = currentStatus === 'failed';

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
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {getStatusMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Progress Section */}
          {(isTrainingActive || isTrainingCompleted || isTrainingFailed) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{currentProgress}%</span>
                </div>
                <Progress 
                  value={currentProgress} 
                  className={`w-full ${isTrainingFailed ? 'bg-red-100' : ''}`}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                {getProcessedCount()} of {getTotalCount()} items processed
              </div>

              {/* Show currently processing items */}
              {isTrainingActive && trainingProgress?.currentlyProcessing && trainingProgress.currentlyProcessing.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Currently processing:</div>
                  <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
                    {trainingProgress.currentlyProcessing.map((item: string, index: number) => (
                      <div key={index} className="truncate">• {item}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Source Details */}
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

          {/* Success State */}
          {isTrainingCompleted && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">Training Complete!</h3>
              <div className="text-sm text-gray-600">
                Your AI agent has been successfully trained and is ready to use.
              </div>
            </div>
          )}

          {/* No Training Needed */}
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
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          ) : isTrainingFailed ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Close
              </Button>
              <Button onClick={handleStartTraining} className="flex-1">
                Retry Training
              </Button>
            </div>
          ) : isTrainingActive ? (
            <Button variant="outline" onClick={handleContinueInBackground} className="w-full">
              Continue in Background
            </Button>
          ) : retrainingNeeded?.needed ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleStartTraining} disabled={isTrainingActive} className="flex-1">
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
