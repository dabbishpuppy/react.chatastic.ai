
import { TrainingRefs } from '../types';

export class TrainingPollingService {
  static createProtectedCheckFunction(
    agentId: string,
    refs: TrainingRefs,
    shouldPreventTrainingAction: (action: 'start' | 'check', sessionId?: string) => boolean,
    checkTrainingCompletion: (agentId: string) => Promise<void>
  ) {
    return (agentId: string) => {
      // ENHANCED: Multiple layers of protection
      if (refs.agentCompletionStateRef.current.isCompleted) {
        console.log('🚫 PROTECTED CHECK: Agent already completed, skipping check');
        return;
      }

      if (refs.trainingStateRef.current === 'completed') {
        console.log('🚫 PROTECTED CHECK: Training state is completed, skipping check');
        return;
      }

      if (shouldPreventTrainingAction('check')) {
        console.log('🚫 PROTECTED CHECK: Prevention logic blocked check');
        return;
      }

      console.log('✅ PROTECTED CHECK: Proceeding with training completion check');
      checkTrainingCompletion(agentId);
    };
  }

  static setupProtectedPolling(
    agentId: string,
    refs: TrainingRefs,
    protectedCheckTrainingCompletion: (agentId: string) => void,
    setPollInterval: (interval: NodeJS.Timeout | null) => void,
    pollInterval: NodeJS.Timeout | null
  ): NodeJS.Timeout {
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    const newPollInterval = setInterval(() => {
      if (!agentId) return;
      
      // ENHANCED: Check completion state before polling
      if (refs.agentCompletionStateRef.current.isCompleted) {
        console.log('🚫 POLLING: Agent completed, stopping polls');
        clearInterval(newPollInterval);
        setPollInterval(null);
        return;
      }

      if (refs.trainingStateRef.current === 'completed') {
        console.log('🚫 POLLING: Training completed, stopping polls');
        clearInterval(newPollInterval);
        setPollInterval(null);
        return;
      }

      console.log('🔄 POLLING: Running protected completion check');
      protectedCheckTrainingCompletion(agentId);
    }, 15000);

    setPollInterval(newPollInterval);
    return newPollInterval;
  }
}
