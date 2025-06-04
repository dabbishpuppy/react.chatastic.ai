
import { useState, useEffect, useRef } from 'react';

interface DebouncedTrainingStatus {
  status: 'idle' | 'training' | 'completed' | 'failed';
  progress: number;
  isStable: boolean;
}

export const useTrainingStatusDebounced = (
  trainingProgress: any,
  retrainingNeeded: any,
  debounceMs: number = 2000 // Increased from 1000ms to 2000ms
) => {
  const [debouncedStatus, setDebouncedStatus] = useState<DebouncedTrainingStatus>({
    status: 'idle',
    progress: 0,
    isStable: false
  });
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastStatusRef = useRef<string>('idle');
  const stabilityCountRef = useRef<number>(0);
  const lastLogRef = useRef<number>(0);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Determine current status with single source of truth
    let currentStatus: 'idle' | 'training' | 'completed' | 'failed' = 'idle';
    let currentProgress = 0;

    // Primary: Check trainingProgress (most reliable)
    if (trainingProgress?.status === 'training') {
      currentStatus = 'training';
      currentProgress = trainingProgress.progress || 0;
    } else if (trainingProgress?.status === 'completed') {
      currentStatus = 'completed';
      currentProgress = 100;
    } else if (trainingProgress?.status === 'failed') {
      currentStatus = 'failed';
      currentProgress = 0;
    } else if (retrainingNeeded?.needed) {
      currentStatus = 'idle';
      currentProgress = 0;
    }

    // Check for status stability (prevent rapid switching)
    const statusChanged = lastStatusRef.current !== currentStatus;
    
    if (statusChanged) {
      stabilityCountRef.current = 0; // Reset stability counter
      lastStatusRef.current = currentStatus;
    } else {
      stabilityCountRef.current += 1;
    }

    // Reduce logging frequency - only log every 10 seconds
    const now = Date.now();
    const shouldLog = now - lastLogRef.current > 10000;
    
    if (shouldLog && (statusChanged || currentStatus === 'training')) {
      console.log('🔍 Training status update:', {
        status: currentStatus,
        progress: currentProgress,
        isStable: stabilityCountRef.current >= 2
      });
      lastLogRef.current = now;
    }

    // Only update if status is stable or immediate (training/completed)
    const isImmediateStatus = currentStatus === 'training' || currentStatus === 'completed';
    const isStable = stabilityCountRef.current >= 3; // Increased stability threshold

    if (isImmediateStatus || isStable) {
      setDebouncedStatus({
        status: currentStatus,
        progress: currentProgress,
        isStable: true
      });
    } else {
      // Debounce status changes for stability
      timeoutRef.current = setTimeout(() => {
        setDebouncedStatus({
          status: currentStatus,
          progress: currentProgress,
          isStable: true
        });
      }, debounceMs);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [trainingProgress?.status, trainingProgress?.progress, retrainingNeeded?.needed, debounceMs]);

  return debouncedStatus;
};
