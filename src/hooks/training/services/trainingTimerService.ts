
import { TrainingRefs } from '../types';

export class TrainingTimerService {
  static createTimerManagement(
    refs: TrainingRefs,
    setPollInterval: (interval: NodeJS.Timeout | null) => void
  ) {
    const clearAllTimers = () => {
      console.log(`🧹 Clearing ${refs.pendingTimersRef.current.size} pending timers`);
      refs.pendingTimersRef.current.forEach(timer => clearTimeout(timer));
      refs.pendingTimersRef.current.clear();
    };

    const addTrackedTimer = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        refs.pendingTimersRef.current.delete(timer);
        callback();
      }, delay);
      refs.pendingTimersRef.current.add(timer);
      return timer;
    };

    const clearAllTimersIncludingPolling = (pollInterval: NodeJS.Timeout | null) => {
      clearAllTimers();
      
      // ENHANCED: Clear polling interval too
      if (pollInterval) {
        console.log('🧹 Clearing polling interval');
        clearInterval(pollInterval);
        setPollInterval(null);
      }
    };

    return {
      clearAllTimers: (pollInterval?: NodeJS.Timeout | null) => 
        pollInterval !== undefined ? clearAllTimersIncludingPolling(pollInterval) : clearAllTimers(),
      addTrackedTimer
    };
  }
}
