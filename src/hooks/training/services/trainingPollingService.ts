
import { TrainingRefs } from '../types';

export class TrainingPollingService {
  static createProtectedCheckFunction(
    agentId: string,
    refs: TrainingRefs,
    shouldPreventTrainingAction: (action: 'start' | 'check', sessionId?: string) => boolean,
    checkTrainingCompletion: (agentId: string) => Promise<void>
  ) {
    return (agentId: string) => {
      // ENHANCED: Less aggressive completion protection
      const timeSinceCompletion = Date.now() - refs.agentCompletionStateRef.current.completedAt;
      
      if (refs.agentCompletionStateRef.current.isCompleted && timeSinceCompletion < 30000) {
        console.log('🚫 PROTECTED CHECK: Agent completed recently (within 30s), skipping check');
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
      
      // ENHANCED: Less aggressive polling protection
      const timeSinceCompletion = Date.now() - refs.agentCompletionStateRef.current.completedAt;
      
      if (refs.agentCompletionStateRef.current.isCompleted && timeSinceCompletion < 30000) {
        console.log('🚫 POLLING: Agent completed recently (within 30s), skipping poll');
        return;
      }

      console.log('🔄 POLLING: Running protected completion check');
      protectedCheckTrainingCompletion(agentId);
    }, 15000);

    setPollInterval(newPollInterval);
    return newPollInterval;
  }
}
