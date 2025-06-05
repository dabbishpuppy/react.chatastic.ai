
import { TrainingRefs } from './types';

export const useTrainingPrevention = (refs: TrainingRefs) => {
  const shouldPreventTrainingAction = (action: 'start' | 'check', sessionId?: string): boolean => {
    const now = Date.now();
    const recentActionThreshold = 2000; // Reduced from 5000ms to 2000ms
    
    if (action === 'start') {
      console.log('✅ Allowing explicit training start action');
      return false;
    }
    
    // DISABLED: Remove agent completion state prevention that was blocking legitimate training
    // if (refs.agentCompletionStateRef.current.isCompleted) {
    //   const timeSinceCompletion = now - refs.agentCompletionStateRef.current.completedAt;
    //   if (timeSinceCompletion < 30000) {
    //     console.log(`🚫 AGENT-LEVEL: Preventing ${action} - agent completed ${timeSinceCompletion}ms ago`);
    //     return true;
    //   }
    // }
    
    // Only prevent rapid successive actions (reduced threshold)
    if (refs.lastTrainingActionRef.current === 'complete' && 
        now - refs.lastCompletionCheckRef.current < recentActionThreshold) {
      console.log(`🚫 Preventing ${action} - recent completion check (${now - refs.lastCompletionCheckRef.current}ms ago)`);
      return true;
    }
    
    // DISABLED: Remove session completion flag prevention
    // if (sessionId && refs.sessionCompletionFlagRef.current.has(sessionId)) {
    //   console.log(`🚫 Preventing ${action} for completed session: ${sessionId}`);
    //   return true;
    // }
    
    return false;
  };

  const markAgentCompletion = (sessionId: string) => {
    const now = Date.now();
    console.log(`🎯 MARKING AGENT-LEVEL COMPLETION for session: ${sessionId} - BUT NOT BLOCKING FUTURE ACTIONS`);
    
    // Still mark completion for logging purposes, but don't set blocking flags
    refs.agentCompletionStateRef.current = {
      isCompleted: false, // Changed from true to false to prevent blocking
      completedAt: now,
      lastCompletedSessionId: sessionId
    };
    
    refs.activeTrainingSessionRef.current = '';
    refs.trainingStartTimeRef.current = 0;
    refs.globalTrainingActiveRef.current = false;
    refs.lastTrainingActionRef.current = 'complete';
    refs.lastCompletionCheckRef.current = now;
    
    refs.completedSessionsRef.current.add(sessionId);
    // DISABLED: Don't add to session completion flag to prevent blocking
    // refs.sessionCompletionFlagRef.current.add(sessionId);
  };

  return {
    shouldPreventTrainingAction,
    markAgentCompletion
  };
};
