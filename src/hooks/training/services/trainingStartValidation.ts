
import { TrainingRefs } from '../types';

export class TrainingStartValidation {
  static validateCanStartTraining(refs: TrainingRefs): boolean {
    const now = Date.now();
    const timeSinceCompletion = now - refs.agentCompletionStateRef.current.completedAt;
    
    // CHECK 1: Agent completion state
    if (refs.agentCompletionStateRef.current.isCompleted && timeSinceCompletion < 300000) { // 5 minutes
      console.log('🚫 STRONGEST PROTECTION: Agent completed recently, blocking training start');
      return false;
    }

    // CHECK 2: Training state
    if (refs.trainingStateRef.current === 'completed') {
      console.log('🚫 STRONGEST PROTECTION: Training state is completed, blocking training start');
      return false;
    }

    // CHECK 3: Completed sessions exist
    if (refs.completedSessionsRef.current.size > 0) {
      console.log('🚫 STRONGEST PROTECTION: Have completed sessions, blocking training start');
      return false;
    }

    // CHECK 4: Last action was complete and recent
    if (refs.lastTrainingActionRef.current === 'complete') {
      const timeSinceLastAction = now - refs.lastCompletionCheckRef.current;
      if (timeSinceLastAction < 300000) { // 5 minutes
        console.log('🚫 STRONGEST PROTECTION: Recent completion action, blocking training start');
        return false;
      }
    }

    return true;
  }

  static shouldBlockToastDueToCompletion(refs: TrainingRefs): boolean {
    return refs.agentCompletionStateRef.current.isCompleted || 
           refs.trainingStateRef.current === 'completed' ||
           refs.completedSessionsRef.current.size > 0;
  }
}
