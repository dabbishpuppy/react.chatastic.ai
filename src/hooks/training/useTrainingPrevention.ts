import { TrainingRefs } from './types';

export const useTrainingPrevention = (refs: TrainingRefs) => {
  const shouldPreventTrainingAction = (action: 'start' | 'check', sessionId?: string): boolean => {
    const now = Date.now();
    const recentActionThreshold = 5000;
    const completionCooldownThreshold = 60000; // Extended from 45s to 60s
    
    if (action === 'start') {
      console.log('✅ Allowing explicit training start action');
      return false;
    }
    
    if (refs.activeTrainingSessionRef.current && 
        now - refs.trainingStartTimeRef.current < refs.minTrainingDurationRef.current) {
      console.log(`🚫 Preventing ${action} - training session ${refs.activeTrainingSessionRef.current} still active (${now - refs.trainingStartTimeRef.current}ms elapsed)`);
      return true;
    }
    
    // ENHANCED: Stronger completion state protection with longer cooldown
    if (refs.agentCompletionStateRef.current.isCompleted) {
      const timeSinceCompletion = now - refs.agentCompletionStateRef.current.completedAt;
      if (timeSinceCompletion < completionCooldownThreshold) {
        console.log(`🚫 ENHANCED AGENT-LEVEL: Preventing ${action} - agent completed ${timeSinceCompletion}ms ago (cooldown: ${completionCooldownThreshold}ms)`);
        return true;
      }
    }
    
    // ENHANCED: Prevent actions immediately after completion marking
    if (refs.lastTrainingActionRef.current === 'complete') {
      const timeSinceLastCompletion = now - refs.lastCompletionCheckRef.current;
      if (timeSinceLastCompletion < completionCooldownThreshold) {
        console.log(`🚫 ENHANCED: Preventing ${action} - recently completed training (${timeSinceLastCompletion}ms ago)`);
        return true;
      }
    }
    
    if (sessionId && refs.sessionCompletionFlagRef.current.has(sessionId)) {
      console.log(`🚫 Preventing ${action} for completed session: ${sessionId}`);
      return true;
    }
    
    return false;
  };

  // ENHANCED: Helper function to detect completion-related database updates
  const isCompletionRelatedUpdate = (oldData: any, newData: any): boolean => {
    if (!oldData || !newData) return false;
    
    const oldMetadata = oldData.metadata || {};
    const newMetadata = newData.metadata || {};
    
    // Check if this is just a completion bookkeeping update
    const isTrainingCompletedUpdate = 
      !oldMetadata.training_completed && newMetadata.training_completed;
    
    const isLastTrainedAtUpdate = 
      oldMetadata.last_trained_at !== newMetadata.last_trained_at && 
      newMetadata.last_trained_at;
    
    const hasNoProcessingStatusChange = 
      oldMetadata.processing_status === newMetadata.processing_status;
    
    // ENHANCED: Also check for chunk processing after completion
    const isPostCompletionChunkUpdate = 
      refs.agentCompletionStateRef.current.isCompleted &&
      (newData.processing_status === 'processed' || newData.processing_status === 'completed');
    
    // If only completion bookkeeping changed, consider it completion-related
    if ((isTrainingCompletedUpdate || isLastTrainedAtUpdate) && hasNoProcessingStatusChange) {
      console.log('🔍 ENHANCED: Detected completion-related database update, ignoring');
      return true;
    }
    
    // If this is chunk processing after agent completion, ignore it
    if (isPostCompletionChunkUpdate) {
      console.log('🔍 ENHANCED: Detected post-completion chunk processing, ignoring');
      return true;
    }
    
    return false;
  };

  const markAgentCompletion = (sessionId: string) => {
    const now = Date.now();
    console.log(`🎯 ENHANCED MARKING AGENT-LEVEL COMPLETION for session: ${sessionId}`);
    
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
    
    // ENHANCED: Set a longer protection period
    setTimeout(() => {
      console.log('🔓 ENHANCED: Completion protection period ended, allowing new training checks');
    }, 60000); // Extended to 60 seconds
  };

  return {
    shouldPreventTrainingAction,
    markAgentCompletion,
    isCompletionRelatedUpdate
  };
};
