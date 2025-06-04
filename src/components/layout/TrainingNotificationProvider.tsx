
import React, { createContext, useContext } from 'react';
import { useTrainingNotifications } from '@/hooks/useTrainingNotifications';

interface TrainingNotificationContextType {
  trainingProgress: any;
  startTraining: () => Promise<void>;
  checkTrainingCompletion: () => void;
}

const TrainingNotificationContext = createContext<TrainingNotificationContextType | null>(null);

export const useTrainingNotificationContext = () => {
  const context = useContext(TrainingNotificationContext);
  if (!context) {
    throw new Error('useTrainingNotificationContext must be used within TrainingNotificationProvider');
  }
  return context;
};

interface TrainingNotificationProviderProps {
  children: React.ReactNode;
}

export const TrainingNotificationProvider: React.FC<TrainingNotificationProviderProps> = ({ children }) => {
  const trainingNotifications = useTrainingNotifications();

  return (
    <TrainingNotificationContext.Provider value={trainingNotifications}>
      {children}
    </TrainingNotificationContext.Provider>
  );
};
