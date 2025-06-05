
import React from 'react';

export interface TrainingProgress {
  agentId: string;
  status: 'idle' | 'training' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
  currentlyProcessing: string[];
  sessionId: string;
}

export interface DatabaseSource {
  id: string;
  source_type: string;
  metadata: any;
  title: string;
  content?: string;
  crawl_status?: string;
}

export interface TrainingRefs {
  trainingStateRef: React.MutableRefObject<'idle' | 'training' | 'completed' | 'failed'>;
  agentCompletionStateRef: React.MutableRefObject<{
    isCompleted: boolean;
    completedAt: number;
    lastCompletedSessionId: string;
  }>;
  completedSessionsRef: React.MutableRefObject<Set<string>>;
  sessionCompletionFlagRef: React.MutableRefObject<Set<string>>;
  lastCompletionCheckRef: React.MutableRefObject<number>;
  currentTrainingSessionRef: React.MutableRefObject<string>;
  activeTrainingSessionRef: React.MutableRefObject<string>;
  trainingStartTimeRef: React.MutableRefObject<number>;
  minTrainingDurationRef: React.MutableRefObject<number>;
  globalTrainingActiveRef: React.MutableRefObject<boolean>;
  lastTrainingActionRef: React.MutableRefObject<'none' | 'start' | 'check' | 'complete'>;
  shownToastsRef: React.MutableRefObject<Set<string>>;
  pendingTimersRef: React.MutableRefObject<Set<NodeJS.Timeout>>;
  pageLoadTimestampRef: React.MutableRefObject<number>;
  hasEverConnectedRef: React.MutableRefObject<boolean>;
  crawlInitiationInProgressRef: React.MutableRefObject<boolean>;
  crawlInitiationStartTimeRef: React.MutableRefObject<number>;
}
