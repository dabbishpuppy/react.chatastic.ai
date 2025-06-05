
import { TrainingRefs } from './types';

export const useTrainingPrevention = (refs: TrainingRefs) => {
  const shouldPreventTrainingAction = (action: 'start' | 'check', sessionId?: string): boolean => {
    const now = Date.now();
    const recentActionThreshold = 5000;
    
    if (action === 'start') {
      console.log('✅ Allowing explicit training start action');
      return false;
    }
    
    if (refs.activeTrainingSessionRef.current && 
        now - refs.trainingStartTimeRef.current < refs.minTrainingDurationRef.current) {
      console.log(`🚫 Preventing ${action} - training session ${refs.activeTrainingSessionRef.current} still active (${now - refs.trainingStartTimeRef.current}ms elapsed)`);
      return true;
    }
    
    if (refs.agentCompletionStateRef.current.isCompleted) {
      const timeSinceCompletion = now - refs.agentCompletionStateRef.current.completedAt;
      if (timeSinceCompletion < 30000) {
        console.log(`🚫 AGENT-LEVEL: Preventing ${action} - agent completed ${timeSinceCompletion}ms ago`);
        return true;
      }
    }
    
    if (refs.lastTrainingActionRef.current === 'complete' && 
        now - refs.lastCompletionCheckRef.current < recentActionThreshold) {
      console.log(`🚫 Preventing ${action} - recently completed training`);
      return true;
    }
    
    if (sessionId && refs.sessionCompletionFlagRef.current.has(sessionId)) {
      console.log(`🚫 Preventing ${action} for completed session: ${sessionId}`);
      return true;
    }
    
    return false;
  };

  const markAgentCompletion = (sessionId: string) => {
    const now = Date.now();
    console.log(`🎯 MARKING AGENT-LEVEL COMPLETION for session: ${sessionId}`);
    
    refs.agentCompletionStateRef.current = {
      isCompleted: true,
      completedAt: now,
      lastCompletedSessionId: sessionId
    };
    
    refs.activeTrainingSessionRef.current = '';
    refs.trainingStartTimeRef.current = 0;
    refs.globalTrainingActiveRef.current = false;
    refs.lastTrainingActionRef.current = 'complete';
    refs.lastCompletionCheckRef.current = now;
    
    refs.completedSessionsRef.current.add(sessionId);
    refs.sessionCompletionFlagRef.current.add(sessionId);
  };

  return {
    shouldPreventTrainingAction,
    markAgentCompletion
  };
};
