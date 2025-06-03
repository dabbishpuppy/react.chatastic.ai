
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
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
    if (!progress) return null;
    
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Agent Retraining
          </DialogTitle>
          <DialogDescription>
            Process your sources to make them searchable by the AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Retraining Status */}
          {retrainingNeeded && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-900">Retraining Status</span>
                <Badge variant={retrainingNeeded.needed ? "destructive" : "secondary"}>
                  {retrainingNeeded.needed ? "Required" : "Up to date"}
                </Badge>
              </div>
              
              {retrainingNeeded.needed && (
                <div className="text-sm text-blue-700">
                  <div className="font-medium mb-1">
                    {retrainingNeeded.unprocessedSources} sources need processing
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    {retrainingNeeded.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
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
            
            {retrainingNeeded?.needed && !isRetraining && (
              <Button onClick={onStartRetraining}>
                Start Retraining
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
