
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2, Info, FileX } from 'lucide-react';
import { type RetrainingProgress } from '@/services/rag/retrainingService';

interface RetrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRetraining: boolean;
  progress: RetrainingProgress | null;
  retrainingNeeded: {
    needed: boolean;
    unprocessedSources: number;
    reasons: string[];
    status: 'up_to_date' | 'needs_processing' | 'needs_reprocessing' | 'no_sources';
    message: string;
  } | null;
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
  const getProgressPercentage = () => {
    if (!progress || progress.totalSources === 0) return 0;
    return Math.round((progress.processedSources / progress.totalSources) * 100);
  };

  const getStatusIcon = () => {
    if (isRetraining && progress) {
      switch (progress.status) {
        case 'completed':
          return <CheckCircle className="h-5 w-5 text-green-600" />;
        case 'failed':
          return <AlertCircle className="h-5 w-5 text-red-600" />;
        case 'processing':
          return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
        default:
          return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      }
    }

    if (retrainingNeeded) {
      switch (retrainingNeeded.status) {
        case 'up_to_date':
          return <CheckCircle className="h-5 w-5 text-green-600" />;
        case 'no_sources':
          return <FileX className="h-5 w-5 text-gray-600" />;
        case 'needs_processing':
        case 'needs_reprocessing':
          return <AlertCircle className="h-5 w-5 text-orange-600" />;
        default:
          return <Info className="h-5 w-5 text-blue-600" />;
      }
    }

    return <Info className="h-5 w-5 text-blue-600" />;
  };

  const getDialogTitle = () => {
    if (isRetraining) {
      return "Agent Retraining";
    }
    
    if (retrainingNeeded) {
      switch (retrainingNeeded.status) {
        case 'up_to_date':
          return "Processing Status";
        case 'no_sources':
          return "No Sources Found";
        case 'needs_processing':
          return "Sources Need Processing";
        case 'needs_reprocessing':
          return "Sources Need Reprocessing";
        default:
          return "Agent Retraining";
      }
    }
    
    return "Agent Retraining";
  };

  const getStatusBadgeVariant = () => {
    if (retrainingNeeded) {
      switch (retrainingNeeded.status) {
        case 'up_to_date':
          return "secondary";
        case 'no_sources':
          return "outline";
        case 'needs_processing':
        case 'needs_reprocessing':
          return "destructive";
        default:
          return "secondary";
      }
    }
    return "secondary";
  };

  const getStatusBadgeText = () => {
    if (retrainingNeeded) {
      switch (retrainingNeeded.status) {
        case 'up_to_date':
          return "Up to date";
        case 'no_sources':
          return "No sources";
        case 'needs_processing':
          return "Processing required";
        case 'needs_reprocessing':
          return "Reprocessing required";
        default:
          return "Unknown";
      }
    }
    return "Checking...";
  };

  const shouldShowRetrainButton = () => {
    return retrainingNeeded?.needed && !isRetraining;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {isRetraining 
              ? "Processing your sources to make them searchable by the AI"
              : "Check the status of your sources and AI search capabilities"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          {retrainingNeeded && !isRetraining && (
            <div className={`p-4 rounded-lg border ${
              retrainingNeeded.status === 'up_to_date' ? 'bg-green-50 border-green-200' :
              retrainingNeeded.status === 'no_sources' ? 'bg-gray-50 border-gray-200' :
              'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">Status</span>
                <Badge variant={getStatusBadgeVariant()}>
                  {getStatusBadgeText()}
                </Badge>
              </div>
              
              <div className={`text-sm ${
                retrainingNeeded.status === 'up_to_date' ? 'text-green-700' :
                retrainingNeeded.status === 'no_sources' ? 'text-gray-700' :
                'text-orange-700'
              }`}>
                <div className="font-medium mb-1">
                  {retrainingNeeded.message}
                </div>
                
                {retrainingNeeded.needed && retrainingNeeded.reasons.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium mb-1">Details:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {retrainingNeeded.reasons.slice(0, 5).map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                      {retrainingNeeded.reasons.length > 5 && (
                        <li>... and {retrainingNeeded.reasons.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Display */}
          {isRetraining && progress && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Processing Sources</span>
                <span>{progress.processedSources}/{progress.totalSources}</span>
              </div>
              
              <Progress value={getProgressPercentage()} className="w-full" />
              
              {progress.currentSource && (
                <div className="text-sm text-gray-600">
                  Current: {progress.currentSource}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">
                  {progress.status}
                </Badge>
                {progress.status === 'processing' && (
                  <span className="text-gray-600">
                    This may take a few minutes...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {progress?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-800">
                <strong>Error:</strong> {progress.error}
              </div>
            </div>
          )}

          {/* Success Display */}
          {progress?.status === 'completed' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                ✅ Retraining completed successfully! Your agent can now search through all your sources.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isRetraining}
            >
              {isRetraining ? 'Processing...' : 'Close'}
            </Button>
            
            {shouldShowRetrainButton() && (
              <Button onClick={onStartRetraining}>
                {retrainingNeeded?.status === 'needs_reprocessing' ? 'Reprocess Sources' : 'Process Sources'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
