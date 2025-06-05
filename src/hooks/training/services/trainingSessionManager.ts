
import { TrainingRefs } from '../types';
import { toast } from '@/hooks/use-toast';

export class TrainingSessionManager {
  static initializeSession(
    agentId: string, 
    refs: TrainingRefs,
    addTrackedTimer: (callback: () => void, delay: number) => NodeJS.Timeout
  ): string {
    console.log('🔄 Resetting agent-level completion state for explicit training start');
    refs.agentCompletionStateRef.current = {
      isCompleted: false,
      completedAt: 0,
      lastCompletedSessionId: ''
    };

    const sessionId = `training-${agentId}-${Date.now()}`;
    
    refs.currentTrainingSessionRef.current = sessionId;
    refs.activeTrainingSessionRef.current = sessionId;
    refs.trainingStartTimeRef.current = Date.now();
    refs.trainingStateRef.current = 'training';
    refs.globalTrainingActiveRef.current = true;
    refs.lastTrainingActionRef.current = 'start';

    // Complete reset of completion tracking
    refs.completedSessionsRef.current.clear();
    refs.sessionCompletionFlagRef.current.clear();

    console.log(`🎯 ACTIVE TRAINING SESSION STARTED: ${sessionId} at ${refs.trainingStartTimeRef.current}`);

    return sessionId;
  }

  static showTrainingStartToast(
    sessionId: string,
    agentId: string,
    refs: TrainingRefs,
    addTrackedTimer: (callback: () => void, delay: number) => NodeJS.Timeout
  ): void {
    const startToastId = `start-${sessionId}`;
    const recentStartToastId = `recent-start-${agentId}`;
    const timeBasedToastId = `time-start-${Math.floor(Date.now() / 60000)}`; // One per minute max
    
    // Check multiple conditions for showing toast
    const shouldShowStartToast = !refs.shownToastsRef.current.has(startToastId) && 
                                !refs.shownToastsRef.current.has(recentStartToastId) &&
                                !refs.shownToastsRef.current.has(timeBasedToastId);
    
    if (shouldShowStartToast) {
      refs.shownToastsRef.current.add(startToastId);
      refs.shownToastsRef.current.add(recentStartToastId);
      refs.shownToastsRef.current.add(timeBasedToastId);
      
      // Clear the recent start toast flag after 30 seconds
      addTrackedTimer(() => {
        refs.shownToastsRef.current.delete(recentStartToastId);
      }, 30000);
      
      // Clear the time-based toast flag after 2 minutes
      addTrackedTimer(() => {
        refs.shownToastsRef.current.delete(timeBasedToastId);
      }, 120000);
      
      console.log('🧠 Showing training start toast for session:', sessionId);
      toast({
        title: "🧠 Training Started",
        description: "Processing sources for AI training...",
        duration: 3000,
      });
    } else {
      console.log('🚫 ENHANCED: Prevented duplicate training start toast');
    }
  }

  static handleTrainingError(
    error: any,
    refs: TrainingRefs,
    clearAllTimers: () => void,
    setTrainingProgress: React.Dispatch<React.SetStateAction<any>>
  ): void {
    console.error('Failed to start ENHANCED training:', error);
    
    refs.activeTrainingSessionRef.current = '';
    refs.trainingStartTimeRef.current = 0;
    refs.trainingStateRef.current = 'failed';
    refs.globalTrainingActiveRef.current = false;
    clearAllTimers();
    
    const isConflictError = error?.message?.includes('409') || error?.status === 409;
    
    if (isConflictError) {
      toast({
        title: "Training In Progress",
        description: "Training is already running - no action needed",
      });
      setTrainingProgress((prev: any) => prev ? { ...prev, status: 'training' } : null);
    } else {
      toast({
        title: "Training Failed",
        description: "Failed to start training process",
        variant: "destructive",
      });
      setTrainingProgress((prev: any) => prev ? { ...prev, status: 'failed' } : null);
    }
  }
}
