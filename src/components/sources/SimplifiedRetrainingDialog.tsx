
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Play, Clock } from 'lucide-react';

type TrainingState = 'start' | 'background' | 'done';

interface SimplifiedRetrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTraining: () => Promise<void>;
  trainingProgress?: {
    status: 'idle' | 'training' | 'completed' | 'failed';
    progress: number;
    totalSources?: number;
    processedSources?: number;
  };
}

const SimplifiedRetrainingDialog: React.FC<SimplifiedRetrainingDialogProps> = ({
  open,
  onOpenChange,
  onStartTraining,
  trainingProgress
}) => {
  const [dialogState, setDialogState] = useState<TrainingState>('start');
  const [isStarting, setIsStarting] = useState(false);

  // Reset to start state when dialog opens
  useEffect(() => {
    if (open) {
      setDialogState('start');
      setIsStarting(false);
    }
  }, [open]);

  // Handle training progress updates
  useEffect(() => {
    if (!trainingProgress) return;

    switch (trainingProgress.status) {
      case 'training':
        if (dialogState === 'start' && !isStarting) {
          // Training started, move to background state
          setDialogState('background');
        }
        break;
      case 'completed':
        if (dialogState === 'background') {
          // Training completed, move to done state
          setDialogState('done');
        }
        break;
    }
  }, [trainingProgress?.status, dialogState, isStarting]);

  const handleStartTraining = async () => {
    setIsStarting(true);
    try {
      await onStartTraining();
      // Don't change state here - let the progress updates handle it
    } catch (error) {
      setIsStarting(false);
      console.error('Failed to start training:', error);
    }
  };

  const handleContinueInBackground = () => {
    onOpenChange(false);
  };

  const handleDone = () => {
    onOpenChange(false);
  };

  const renderStartState = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Play className="h-5 w-5 text-blue-600" />
          Start Training
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-gray-600">
          Ready to train your agent with the latest sources? This will process your content and generate embeddings for better responses.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleStartTraining}
            disabled={isStarting}
          >
            {isStarting ? "Starting..." : "Start Training"}
          </Button>
        </div>
      </div>
    </>
  );

  const renderBackgroundState = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          Training in Progress
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-gray-600">
          Your agent is being trained in the background. You can continue using the application while this completes.
        </p>
        
        {trainingProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{trainingProgress.processedSources || 0} / {trainingProgress.totalSources || 0} sources</span>
            </div>
            <Progress value={trainingProgress.progress} className="w-full" />
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleContinueInBackground}>
            Continue in Background
          </Button>
        </div>
      </div>
    </>
  );

  const renderDoneState = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Training Complete
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-gray-600">
          Your agent has been successfully trained! All sources have been processed and embeddings generated.
        </p>
        
        {trainingProgress && (
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-800">
              Processed {trainingProgress.totalSources || 0} sources successfully
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleDone}>
            Done
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {dialogState === 'start' && renderStartState()}
        {dialogState === 'background' && renderBackgroundState()}
        {dialogState === 'done' && renderDoneState()}
      </DialogContent>
    </Dialog>
  );
};

export default SimplifiedRetrainingDialog;
