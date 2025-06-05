
import { useRef } from 'react';
import { TrainingRefs } from './types';

export const useTrainingState = (): TrainingRefs => {
  const pageLoadTimestampRef = useRef<number>(Date.now());
  const hasEverConnectedRef = useRef<boolean>(false);
  const crawlInitiationInProgressRef = useRef<boolean>(false);
  const crawlInitiationStartTimeRef = useRef<number>(0);
  
  const agentCompletionStateRef = useRef({
    isCompleted: false,
    completedAt: 0,
    lastCompletedSessionId: ''
  });
  
  const currentTrainingSessionRef = useRef<string>('');
  const trainingStateRef = useRef<'idle' | 'training' | 'completed' | 'failed'>('idle');
  const completedSessionsRef = useRef<Set<string>>(new Set());
  const lastCompletionCheckRef = useRef<number>(0);
  
  const activeTrainingSessionRef = useRef<string>('');
  const trainingStartTimeRef = useRef<number>(0);
  const minTrainingDurationRef = useRef<number>(10000);
  
  const shownToastsRef = useRef<Set<string>>(new Set());
  const pendingTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const sessionCompletionFlagRef = useRef<Set<string>>(new Set());
  const globalTrainingActiveRef = useRef<boolean>(false);
  const lastTrainingActionRef = useRef<'start' | 'complete' | 'none'>('none');

  return {
    pageLoadTimestampRef,
    hasEverConnectedRef,
    crawlInitiationInProgressRef,
    crawlInitiationStartTimeRef,
    agentCompletionStateRef,
    currentTrainingSessionRef,
    trainingStateRef,
    completedSessionsRef,
    lastCompletionCheckRef,
    activeTrainingSessionRef,
    trainingStartTimeRef,
    minTrainingDurationRef,
    shownToastsRef,
    pendingTimersRef,
    sessionCompletionFlagRef,
    globalTrainingActiveRef,
    lastTrainingActionRef
  };
};
