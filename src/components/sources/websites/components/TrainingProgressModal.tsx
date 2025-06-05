
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle, X } from 'lucide-react';

interface TrainingProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: {
    status: 'idle' | 'training' | 'completed' | 'failed';
    progress: number;
    totalSources: number;
    processedSources: number;
    currentlyProcessing?: string[];
    sessionId?: string;
  } | null;
}

const TrainingProgressModal: React.FC<TrainingProgressModalProps> = ({
  isOpen,
  onClose,
  progress
}) => {
  const getStatusConfig = () => {
    if (!progress) return { icon: <Loader2 className="h-4 w-4 animate-spin" />, text: 'Initializing...', color: 'bg-blue-100 text-blue-800' };
    
    switch (progress.status) {
      case 'training':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: 'Training in Progress',
          color: 'bg-blue-100 text-blue-800'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Training Complete',
          color: 'bg-green-100 text-green-800'
        };
      case 'failed':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: 'Training Failed',
          color: 'bg-red-100 text-red-800'
        };
      default:
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: 'Preparing Training',
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const canClose = progress?.status === 'completed' || progress?.status === 'failed';

  return (
    <Dialog open={isOpen} onOpenChange={canClose ? onClose : undefined}>
      <DialogContent className="sm:max-w-md" hideCloseButton={!canClose}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>AI Training Progress</DialogTitle>
            {canClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge className={`${statusConfig.color} border flex items-center gap-2`}>
              {statusConfig.icon}
              {statusConfig.text}
            </Badge>
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Processing Sources</span>
                <span>{progress.processedSources}/{progress.totalSources}</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
              <div className="text-center text-sm text-gray-500">
                {progress.progress}% Complete
              </div>
            </div>
          )}

          {/* Currently Processing */}
          {progress?.currentlyProcessing && progress.currentlyProcessing.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Currently Processing:</h4>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                {progress.currentlyProcessing.slice(0, 3).map((item, index) => (
                  <div key={index} className="text-xs text-gray-600 truncate">
                    {item}
                  </div>
                ))}
                {progress.currentlyProcessing.length > 3 && (
                  <div className="text-xs text-gray-500 mt-1">
                    +{progress.currentlyProcessing.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Training Phases Info */}
          <div className="text-xs text-gray-500 text-center">
            {progress?.status === 'training' && (
              <p>Processing crawled pages and generating embeddings for AI training...</p>
            )}
            {progress?.status === 'completed' && (
              <p>Your AI agent has been successfully trained with the new content!</p>
            )}
            {progress?.status === 'failed' && (
              <p>Training encountered an error. Please try again or contact support.</p>
            )}
          </div>

          {/* Action Button for Completed/Failed States */}
          {canClose && (
            <div className="flex justify-center">
              <Button onClick={onClose} variant={progress?.status === 'failed' ? 'destructive' : 'default'}>
                {progress?.status === 'failed' ? 'Close' : 'Done'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrainingProgressModal;
