
import { useEffect, useRef, useState } from 'react';
import { ToastNotificationService } from '@/services/ToastNotificationService';

export interface TrainingProgress {
  status: 'pending' | 'initializing' | 'training' | 'completed' | 'failed';
  progress: number;
  message?: string;
  totalChunks?: number;
  processedChunks?: number;
  totalSources?: number;
  processedSources?: number;
  sessionId?: string;
}

export const useTrainingNotifications = () => {
  const lastStatusRef = useRef<string | null>(null);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);

  const startTraining = async () => {
    // Implementation for starting training
    console.log('Starting training...');
  };

  const checkTrainingCompletion = () => {
    // Implementation for checking completion
    console.log('Checking training completion...');
  };

  useEffect(() => {
    const handleTrainingStatusChange = (event: CustomEvent) => {
      const { status } = event.detail;
      
      // Prevent duplicate notifications
      if (lastStatusRef.current === status) return;
      lastStatusRef.current = status;

      switch (status) {
        case 'training':
          ToastNotificationService.showTrainingStarted();
          break;
        case 'completed':
          ToastNotificationService.showTrainingCompleted();
          break;
      }
    };

    window.addEventListener('trainingStatusChanged', handleTrainingStatusChange as EventListener);

    return () => {
      window.removeEventListener('trainingStatusChanged', handleTrainingStatusChange as EventListener);
    };
  }, []);

  return {
    trainingProgress,
    startTraining,
    checkTrainingCompletion
  };
};
