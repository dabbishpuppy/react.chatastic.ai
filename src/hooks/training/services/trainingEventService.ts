
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
      console.log('🚀 Crawl initiation detected - extending connection grace period');
      refs.crawlInitiationInProgressRef.current = true;
      refs.crawlInitiationStartTimeRef.current = Date.now();
      
      // ENHANCED: Reset completion state when new crawl starts
      console.log('🔄 CRAWL START: Resetting training completion state');
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
      
      addTrackedTimer(() => {
        refs.crawlInitiationInProgressRef.current = false;
        console.log('✅ Crawl initiation grace period ended');
      }, 45000);
    };

    const handleCrawlCompleted = () => {
      console.log('✅ Crawl completed - clearing initiation flags');
      refs.crawlInitiationInProgressRef.current = false;
      
      // ENHANCED: Also reset completion state on crawl completion to ensure fresh training state
      console.log('🔄 CRAWL COMPLETE: Ensuring fresh training state');
      refs.agentCompletionStateRef.current = {
        isCompleted: false,
        completedAt: 0,
        lastCompletedSessionId: ''
      };
      refs.trainingStateRef.current = 'idle';
      refs.completedSessionsRef.current.clear();
      refs.lastTrainingActionRef.current = 'none';
    };

    // ENHANCED: Listen for training completion to clear all active processes
    const handleTrainingCompleted = () => {
      console.log('🎉 ENHANCED: Training completed event - clearing all processes');
      clearAllTimers();
      
      // Force clear any remaining polling
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
    };

    // ENHANCED: Listen for new source events to reset completion state
    const handleSourceCreated = () => {
      console.log('📄 New source created - resetting completion state');
      refs.agentCompletionStateRef.current = {
        isCompleted: false,
        completedAt: 0,
        lastCompletedSessionId: ''
      };
      refs.trainingStateRef.current = 'idle';
      refs.completedSessionsRef.current.clear();
      refs.lastTrainingActionRef.current = 'none';
    };

    window.addEventListener('crawlStarted', handleCrawlStarted);
    window.addEventListener('crawlCompleted', handleCrawlCompleted);
    window.addEventListener('trainingCompleted', handleTrainingCompleted);
    window.addEventListener('sourceCreated', handleSourceCreated);
    window.addEventListener('fileUploaded', handleSourceCreated); // Treat file uploads same as source creation
    
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
