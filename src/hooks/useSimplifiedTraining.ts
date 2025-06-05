
import React, { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTrainingNotifications } from '@/hooks/useTrainingNotifications';

export const useSimplifiedTraining = (agentId?: string) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { trainingProgress, startTraining } = useTrainingNotifications();
  const toastShownRef = useRef<Set<string>>(new Set());

  const openTrainingDialog = useCallback(() => {
    setIsDialogOpen(true);
    // Reset toast tracking when opening dialog
    toastShownRef.current.clear();
  }, []);

  const closeTrainingDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const handleStartTraining = useCallback(async () => {
    if (!agentId) return;

    try {
      await startTraining();
      
      // Show "Start Training" toast only once
      if (!toastShownRef.current.has('start')) {
        toast({
          title: "Training Started",
          description: "Processing your sources and generating embeddings..."
        });
        toastShownRef.current.add('start');
      }
    } catch (error) {
      toast({
        title: "Training Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    }
  }, [agentId, startTraining, toast]);

  // Show completion toast when training completes
  React.useEffect(() => {
    if (trainingProgress?.status === 'completed' && !toastShownRef.current.has('completed')) {
      toast({
        title: "Training Completed",
        description: "Your agent has been successfully trained with the latest sources."
      });
      toastShownRef.current.add('completed');
    }
  }, [trainingProgress?.status, toast]);

  return {
    isDialogOpen,
    openTrainingDialog,
    closeTrainingDialog,
    handleStartTraining,
    trainingProgress
  };
};
