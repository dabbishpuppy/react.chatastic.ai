
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
  // ENHANCED: Clear state machine with proper status determination
  const getCurrentStatus = () => {
    console.log('🔍 RetrainingDialog getCurrentStatus:', {
      retrainingNeeded: retrainingNeeded?.needed,
      trainingProgressStatus: trainingProgress?.status,
      trainingProgressValue: trainingProgress?.progress,
      isRetraining,
      totalChunks: trainingProgress?.totalChunks,
      processedChunks: trainingProgress?.processedChunks
    });

    // Use training progress status directly if available
    if (trainingProgress?.status) {
      const status = trainingProgress.status;
      let calculatedProgress = 0;
      
      // Calculate progress based on chunks first, then sources
      if (trainingProgress.totalChunks > 0 && trainingProgress.processedChunks >= 0) {
        calculatedProgress = Math.round((trainingProgress.processedChunks / trainingProgress.totalChunks) * 100);
      } else if (trainingProgress.totalSources > 0) {
        calculatedProgress = Math.round((trainingProgress.processedSources / trainingProgress.totalSources) * 100);
      }
      
      return {
        status,
        progress: Math.min(calculatedProgress, 100)
      };
    }
    
    // Fallback logic
    if (retrainingNeeded?.needed) {
      return { status: 'pending', progress: 0 };
    }
    
    return { status: 'up_to_date', progress: 0 };
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
    // Prioritize chunk count over source count
    if (trainingProgress?.totalChunks > 0) {
      return trainingProgress.processedChunks || 0;
    }
    return trainingProgress?.processedSources || 0;
  };

  const getTotalCount = () => {
    // Prioritize chunk count over source count
    if (trainingProgress?.totalChunks > 0) {
      return trainingProgress.totalChunks;
    }
    if (trainingProgress?.totalSources > 0) {
      return trainingProgress.totalSources;
    }
    if (retrainingNeeded?.sourceDetails?.length > 0) {
      return retrainingNeeded.sourceDetails.length;
    }
    return 0;
  };

  const getProgressUnit = () => {
    return trainingProgress?.totalChunks > 0 ? 'chunks' : 'items';
  };

  const getStatusMessage = () => {
    switch (currentStatus) {
      case 'initializing':
        return "Initializing training... Please wait while we prepare your sources.";
      
      case 'training':
        const processed = getProcessedCount();
        const total = getTotalCount();
        const unit = getProgressUnit();
        const currentlyProcessing = trainingProgress?.currentlyProcessing || [];
        
        if (currentlyProcessing.length > 0) {
          return `Training in progress... (${processed}/${total} ${unit} processed, ${currentlyProcessing.length} currently processing)`;
        }
        
        if (total > 0) {
          return `Training in progress... (${processed}/${total} ${unit} processed)`;
        }
        return "Training in progress...";
      
      case 'failed':
        return trainingProgress?.errorMessage || "Training failed. Please try again or check your sources.";
      
      case 'completed':
        return "Training completed successfully! Your AI agent is trained and ready.";
      
      case 'pending':
        return retrainingNeeded?.message || `${retrainingNeeded?.unprocessedSources || 0} sources need to be processed for training.`;
      
      default:
        return "Your agent is up to date.";
    }
  };

  const getDialogTitle = () => {
    switch (currentStatus) {
      case 'initializing':
        return "Initializing Training";
      case 'training':
        return "Agent Training in Progress";
      case 'completed':
        return "Training Complete";
      case 'failed':
        return "Training Failed";
      case 'pending':
        return "Agent Training Required";
      default:
        return "Agent Training Status";
    }
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
      
      // Don't close the dialog immediately - let it show training progress
      console.log('📊 Keeping dialog open to show training progress');
    } catch (error) {
      console.error('❌ Failed to start training:', error);
    }
  };

  const handleContinueInBackground = () => {
    console.log('📱 Continue in background clicked');
    
    // Close the dialog first
    onOpenChange(false);
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('trainingContinuesInBackground', {
      detail: { 
        agentId: trainingProgress?.agentId,
        sessionId: trainingProgress?.sessionId,
        status: 'background'
      }
    }));
    
    console.log('📱 Background training event dispatched for session:', trainingProgress?.sessionId);
  };

  // Render footer based on current status - one button per status
  const renderFooter = () => {
    switch (currentStatus) {
      case 'pending':
        return (
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleStartTraining} className="flex-1">
              Start Training
            </Button>
          </div>
        );
      
      case 'initializing':
        return (
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full" disabled>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Initializing...
          </Button>
        );
      
      case 'training':
        // Only show "Continue in Background" if we have actual progress
        const hasProgress = getProcessedCount() > 0 || getTotalCount() > 0;
        if (hasProgress) {
          return (
            <Button variant="outline" onClick={handleContinueInBackground} className="w-full">
              Continue in Background
            </Button>
          );
        } else {
          return (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Starting...
            </Button>
          );
        }
      
      case 'completed':
        return (
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Done
          </Button>
        );
      
      case 'failed':
        return (
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Close
            </Button>
            <Button onClick={handleStartTraining} className="flex-1">
              Retry Training
            </Button>
          </div>
        );
      
      default:
        return (
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStatus === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : currentStatus === 'failed' ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (currentStatus === 'training' || currentStatus === 'initializing') ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            ) : currentStatus === 'pending' ? (
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
          {(currentStatus === 'training' || currentStatus === 'completed' || currentStatus === 'failed') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{currentProgress}%</span>
                </div>
                <Progress 
                  value={currentProgress} 
                  className={`w-full ${currentStatus === 'failed' ? 'bg-red-100' : ''}`}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                {getProcessedCount()} of {getTotalCount()} {getProgressUnit()} processed
              </div>

              {/* Show currently processing items */}
              {currentStatus === 'training' && trainingProgress?.currentlyProcessing && trainingProgress.currentlyProcessing.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Currently processing:</div>
                  <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
                    {trainingProgress.currentlyProcessing.slice(0, 5).map((item: string, index: number) => (
                      <div key={index} className="truncate">• {item}</div>
                    ))}
                    {trainingProgress.currentlyProcessing.length > 5 && (
                      <div className="text-xs text-gray-500">... and {trainingProgress.currentlyProcessing.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Initializing State */}
          {currentStatus === 'initializing' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <h3 className="font-medium text-lg mb-2">Preparing Training</h3>
              <div className="text-sm text-gray-600">
                Setting up sources and initializing training process...
              </div>
            </div>
          )}

          {/* Source Details */}
          {retrainingNeeded?.sourceDetails && retrainingNeeded.sourceDetails.length > 0 && currentStatus === 'pending' && (
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
          {currentStatus === 'completed' && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">Training Complete!</h3>
              <div className="text-sm text-gray-600">
                Your AI agent has been successfully trained and is ready to use.
              </div>
            </div>
          )}

          {/* No Training Needed */}
          {currentStatus === 'up_to_date' && (
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
          {renderFooter()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
