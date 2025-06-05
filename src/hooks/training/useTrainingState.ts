
import { useRef } from 'react';
import { TrainingRefs } from './types';

export const useTrainingState = (): TrainingRefs => {
  const pageLoadTimestampRef = useRef(Date.now());
  const hasEverConnectedRef = useRef(false);
  const crawlInitiationInProgressRef = useRef(false);
  const crawlInitiationStartTimeRef = useRef(0);
  const agentCompletionStateRef = useRef({
    isCompleted: false,
    completedAt: 0,
    lastCompletedSessionId: ''
  });
  const currentTrainingSessionRef = useRef('');
  const trainingStateRef = useRef<'idle' | 'initializing' | 'training' | 'completed' | 'failed'>('idle');
  const completedSessionsRef = useRef(new Set<string>());
  const lastCompletionCheckRef = useRef(0);
  const activeTrainingSessionRef = useRef('');
  const trainingStartTimeRef = useRef(0);
  const minTrainingDurationRef = useRef(30000);
  const shownToastsRef = useRef(new Set<string>());
  const pendingTimersRef = useRef(new Set<NodeJS.Timeout>());
  const sessionCompletionFlagRef = useRef(new Set<string>());
  const globalTrainingActiveRef = useRef(false);
  const lastTrainingActionRef = useRef('none');
  const trainingToastShownRef = useRef(new Set<string>());
  const dialogLockedRef = useRef(false);
  const currentSessionIdRef = useRef('');

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
    lastTrainingActionRef,
    trainingToastShownRef,
    dialogLockedRef,
    currentSessionIdRef
  };
};
