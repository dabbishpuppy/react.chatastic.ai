
import { useEffect, useRef } from 'react';
import { ToastNotificationService } from '@/services/ToastNotificationService';

export interface TrainingProgress {
  status: 'pending' | 'training' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

export const useTrainingNotifications = () => {
  const lastStatusRef = useRef<string | null>(null);

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
};
