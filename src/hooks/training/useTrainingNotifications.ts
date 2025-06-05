
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrainingProgress } from './types';
import { useTrainingState } from './useTrainingState';
import { useTrainingPrevention } from './useTrainingPrevention';
import { useTrainingCompletion } from './useTrainingCompletion';
import { useTrainingStart } from './useTrainingStart';
import { TrainingRealtimeService } from './services/trainingRealtimeService';
import { TrainingPollingService } from './services/trainingPollingService';
import { TrainingEventService } from './services/trainingEventService';
import { TrainingTimerService } from './services/trainingTimerService';

export const useTrainingNotifications = () => {
  const { agentId } = useParams();
  const refs = useTrainingState();
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // ENHANCED: Track polling interval for proper cleanup
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Initialize timer management
  const { clearAllTimers, addTrackedTimer } = TrainingTimerService.createTimerManagement(refs, setPollInterval);

  // Initialize prevention logic
  const { shouldPreventTrainingAction, markAgentCompletion } = useTrainingPrevention(refs);

  // Initialize completion logic
  const { checkTrainingCompletion } = useTrainingCompletion(
    refs,
    shouldPreventTrainingAction,
    markAgentCompletion,
    setTrainingProgress
  );

  // Initialize start logic
  const { startTraining } = useTrainingStart(
    refs,
    markAgentCompletion,
    setTrainingProgress,
    checkTrainingCompletion,
    () => clearAllTimers(pollInterval),
    addTrackedTimer
  );

  // ENHANCED: Protected check function that respects completion state
  const protectedCheckTrainingCompletion = TrainingPollingService.createProtectedCheckFunction(
    agentId || '',
    refs,
    shouldPreventTrainingAction,
    checkTrainingCompletion
  );

  // ENHANCED: Protected polling with completion awareness
  const setupProtectedPolling = () => {
    if (!agentId) return setInterval(() => {}, 0); // Dummy interval if no agentId
    
    return TrainingPollingService.setupProtectedPolling(
      agentId,
      refs,
      protectedCheckTrainingCompletion,
      setPollInterval,
      pollInterval
    );
  };

  // Listen for crawl initiation events
  useEffect(() => {
    return TrainingEventService.setupEventListeners(
      refs,
      addTrackedTimer,
      () => clearAllTimers(pollInterval),
      pollInterval,
      setPollInterval
    );
  }, [pollInterval]);

  // Main effect for setting up subscriptions
  useEffect(() => {
    if (!agentId) return;

    console.log('🔔 Setting up ENHANCED training notifications for agent:', agentId);

    let websiteSources: string[] = [];
    let cleanup: (() => void) | undefined;

    const initializeSubscriptions = async () => {
      try {
        websiteSources = await TrainingRealtimeService.initializeSubscriptions(agentId);
        setupRealtimeChannels();
      } catch (error) {
        console.error('Error initializing subscriptions:', error);
      }
    };

    const setupRealtimeChannels = () => {
      cleanup = TrainingRealtimeService.setupRealtimeChannels(
        agentId,
        websiteSources,
        refs,
        protectedCheckTrainingCompletion,
        addTrackedTimer,
        setIsConnected,
        setupProtectedPolling,
        pollInterval
      );
    };

    initializeSubscriptions();

    return () => {
      if (cleanup) cleanup();
      clearAllTimers(pollInterval);
    };
  }, [agentId]);

  return {
    trainingProgress,
    startTraining: async () => {
      if (!agentId) return;
      
      // ENHANCED: STRONGEST possible check before starting
      const timeSinceCompletion = Date.now() - refs.agentCompletionStateRef.current.completedAt;
      
      if (refs.agentCompletionStateRef.current.isCompleted && timeSinceCompletion < 300000) { // 5 minutes
        console.log('🚫 ULTIMATE PROTECTION: Agent completed recently, completely blocking start');
        return;
      }
      
      if (refs.trainingStateRef.current === 'completed') {
        console.log('🚫 ULTIMATE PROTECTION: Training state completed, completely blocking start');
        return;
      }
      
      if (refs.completedSessionsRef.current.size > 0) {
        console.log('🚫 ULTIMATE PROTECTION: Have completed sessions, completely blocking start');
        return;
      }
      
      await startTraining(agentId);
    },
    checkTrainingCompletion: () => agentId && protectedCheckTrainingCompletion(agentId),
    isConnected
  };
};
