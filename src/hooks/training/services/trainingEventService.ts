
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
      
      addTrackedTimer(() => {
        refs.crawlInitiationInProgressRef.current = false;
        console.log('✅ Crawl initiation grace period ended');
      }, 45000);
    };

    const handleCrawlCompleted = () => {
      console.log('✅ Crawl completed - clearing initiation flags');
      refs.crawlInitiationInProgressRef.current = false;
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

    window.addEventListener('crawlStarted', handleCrawlStarted);
    window.addEventListener('crawlCompleted', handleCrawlCompleted);
    window.addEventListener('trainingCompleted', handleTrainingCompleted);
    
    return () => {
      window.removeEventListener('crawlStarted', handleCrawlStarted);
      window.removeEventListener('crawlCompleted', handleCrawlCompleted);
      window.removeEventListener('trainingCompleted', handleTrainingCompleted);
      clearAllTimers();
    };
  }
}
