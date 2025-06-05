
import { TrainingProgress, TrainingRefs } from './types';
import { TrainingStartValidation } from './services/trainingStartValidation';
import { TrainingSessionManager } from './services/trainingSessionManager';
import { SourceProcessingService } from './services/sourceProcessingService';

export const useTrainingStart = (
  refs: TrainingRefs,
  markAgentCompletion: (sessionId: string) => void,
  setTrainingProgress: React.Dispatch<React.SetStateAction<TrainingProgress | null>>,
  checkTrainingCompletion: (agentId: string) => Promise<void>,
  clearAllTimers: () => void,
  addTrackedTimer: (callback: () => void, delay: number) => NodeJS.Timeout
) => {
  const startTraining = async (agentId: string) => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting ENHANCED training for agent:', agentId);

      // Validate if training can start
      if (!TrainingStartValidation.validateCanStartTraining(refs)) {
        return;
      }

      // Initialize training session
      const sessionId = TrainingSessionManager.initializeSession(agentId, refs, addTrackedTimer);
      
      // Clear all timers
      clearAllTimers();

      // Check if we should block toast due to completion state
      if (TrainingStartValidation.shouldBlockToastDueToCompletion(refs)) {
        console.log('🚫 STRONGEST PROTECTION: Blocking training start toast due to completion state');
        return;
      }
      
      // Show training start toast
      TrainingSessionManager.showTrainingStartToast(sessionId, agentId, refs, addTrackedTimer);

      // Fetch and process sources
      const shouldContinue = await SourceProcessingService.fetchAndProcessSources(
        agentId,
        setTrainingProgress,
        markAgentCompletion,
        sessionId,
        refs
      );

      // Only check completion if not already completed and processing continued
      if (shouldContinue && 
          !refs.agentCompletionStateRef.current.isCompleted && 
          refs.trainingStateRef.current !== 'completed') {
        addTrackedTimer(() => checkTrainingCompletion(agentId), 2000);
      }

    } catch (error) {
      TrainingSessionManager.handleTrainingError(error, refs, clearAllTimers, setTrainingProgress);
    }
  };

  return { startTraining };
};
