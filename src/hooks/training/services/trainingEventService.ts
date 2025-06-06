
import { TrainingRefs } from '../types';

export class TrainingEventService {
  static setupEventListeners(
    refs: TrainingRefs,
    addTrackedTimer: (callback: () => void, delay: number) => NodeJS.Timeout,
    clearAllTimers: () => void,
    pollInterval: NodeJS.Timeout | null,
    setPollInterval: (interval: NodeJS.Timeout | null) => void
  ) {
    const handleCrawlStarted = () => {
      console.log('🚀 Crawl initiation detected - resetting all training state immediately');
      refs.crawlInitiationInProgressRef.current = true;
      refs.crawlInitiationStartTimeRef.current = Date.now();
      
      // IMMEDIATE: Reset ALL completion state when new crawl starts
      console.log('🔄 CRAWL START: IMMEDIATE reset of all training completion state');
      refs.agentCompletionStateRef.current = {
        isCompleted: false,
        completedAt: 0,
        lastCompletedSessionId: ''
      };
      refs.trainingStateRef.current = 'idle';
      refs.completedSessionsRef.current.clear();
      refs.lastTrainingActionRef.current = 'none';
      refs.activeTrainingSessionRef.current = '';
      refs.globalTrainingActiveRef.current = false;
      refs.currentTrainingSessionRef.current = '';
      
      // Dispatch event to notify UI components
      window.dispatchEvent(new CustomEvent('trainingStateReset', {
        detail: { reason: 'crawl_started', timestamp: Date.now() }
      }));
      
      addTrackedTimer(() => {
        refs.crawlInitiationInProgressRef.current = false;
        console.log('✅ Crawl initiation grace period ended');
      }, 45000);
    };

    const handleCrawlCompleted = () => {
      console.log('✅ Crawl completed - keeping training state ready for user action');
      refs.crawlInitiationInProgressRef.current = false;
      
      // CHANGED: Do NOT reset completion state on crawl completion
      // This allows the "Train Agent" button to remain visible
      console.log('🔄 CRAWL COMPLETE: Keeping training state ready for user-initiated training');
      
      // Only reset if we're in a training state, not if we're idle/ready
      if (refs.trainingStateRef.current === 'training' || refs.trainingStateRef.current === 'initializing') {
        refs.trainingStateRef.current = 'idle';
        refs.activeTrainingSessionRef.current = '';
        refs.globalTrainingActiveRef.current = false;
        refs.currentTrainingSessionRef.current = '';
      }
      
      // Dispatch event to notify UI components that crawl is done and training can start
      window.dispatchEvent(new CustomEvent('crawlCompletedReadyForTraining', {
        detail: { reason: 'crawl_completed', timestamp: Date.now() }
      }));
    };

    const handleTrainingCompleted = () => {
      console.log('🎉 Training completed event - clearing all processes');
      clearAllTimers();
      
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
    };

    // ENHANCED: New source events immediately reset completion state
    const handleSourceCreated = () => {
      console.log('📄 New source created - IMMEDIATE reset of completion state');
      refs.agentCompletionStateRef.current = {
        isCompleted: false,
        completedAt: 0,
        lastCompletedSessionId: ''
      };
      refs.trainingStateRef.current = 'idle';
      refs.completedSessionsRef.current.clear();
      refs.lastTrainingActionRef.current = 'none';
      refs.currentTrainingSessionRef.current = '';
      
      // Dispatch event to notify UI components immediately
      window.dispatchEvent(new CustomEvent('trainingStateReset', {
        detail: { reason: 'source_created', timestamp: Date.now() }
      }));
    };

    window.addEventListener('crawlStarted', handleCrawlStarted);
    window.addEventListener('crawlCompleted', handleCrawlCompleted);
    window.addEventListener('trainingCompleted', handleTrainingCompleted);
    window.addEventListener('sourceCreated', handleSourceCreated);
    window.addEventListener('fileUploaded', handleSourceCreated);
    
    return () => {
      window.removeEventListener('crawlStarted', handleCrawlStarted);
      window.removeEventListener('crawlCompleted', handleCrawlCompleted);
      window.removeEventListener('trainingCompleted', handleTrainingCompleted);
      window.removeEventListener('sourceCreated', handleSourceCreated);
      window.removeEventListener('fileUploaded', handleSourceCreated);
      clearAllTimers();
    };
  }
}
