import { useEffect } from 'react';
import { TrainingRefs } from './types';

export const useTrainingCompletion = (refs: TrainingRefs) => {
  useEffect(() => {
    const checkForCompletion = () => {
      // FIXED: Use the properly typed trainingStateRef that includes 'completed'
      if (refs.trainingStateRef.current === 'completed') {
        // Handle completion logic
        console.log('Training completed');
      }
    };

    checkForCompletion();
  }, [refs]);
};
