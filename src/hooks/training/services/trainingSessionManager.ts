
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
    refs.trainingStateRef.current = 'initializing'; // Set to initializing first
    refs.globalTrainingActiveRef.current = true;
    refs.lastTrainingActionRef.current = 'start';

    // Complete reset of completion tracking
    refs.completedSessionsRef.current.clear();
    refs.sessionCompletionFlagRef.current.clear();

    console.log(`🎯 TRAINING SESSION INITIALIZED: ${sessionId} at ${refs.trainingStartTimeRef.current}`);

    return sessionId;
  }

  static showTrainingStartToast(
    sessionId: string,
    agentId: string,
    refs: TrainingRefs,
    addTrackedTimer: (callback: () => void, delay: number) => NodeJS.Timeout
  ): void {
    // Create unique toast ID for this specific training session
    const toastId = `training-start-${sessionId}`;
    
    // Only show toast if we haven't shown it for this specific session
    if (!refs.trainingToastShownRef.current.has(toastId)) {
      refs.trainingToastShownRef.current.add(toastId);
      
      console.log('🧠 Showing training start toast for session:', sessionId);
      toast({
        title: "🧠 Training Started",
        description: "Initializing training process...",
        duration: 3000,
      });
      
      // Clean up the toast flag after 2 minutes to allow future sessions
      addTrackedTimer(() => {
        refs.trainingToastShownRef.current.delete(toastId);
      }, 120000);
    } else {
      console.log('🚫 Training start toast already shown for session:', sessionId);
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
