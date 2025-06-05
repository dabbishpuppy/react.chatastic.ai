
export interface TrainingProgress {
  agentId: string;
  status: 'idle' | 'training' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
  currentlyProcessing?: string[];
  sessionId?: string;
}

export interface DatabaseSource {
  id: string;
  source_type: string;
  metadata: any;
  title: string;
  content?: string;
}

export interface AgentCompletionState {
  isCompleted: boolean;
  completedAt: number;
  lastCompletedSessionId: string;
}

export interface TrainingRefs {
  pageLoadTimestampRef: React.MutableRefObject<number>;
  hasEverConnectedRef: React.MutableRefObject<boolean>;
  crawlInitiationInProgressRef: React.MutableRefObject<boolean>;
  crawlInitiationStartTimeRef: React.MutableRefObject<number>;
  agentCompletionStateRef: React.MutableRefObject<AgentCompletionState>;
  currentTrainingSessionRef: React.MutableRefObject<string>;
  trainingStateRef: React.MutableRefObject<'idle' | 'training' | 'completed' | 'failed'>;
  completedSessionsRef: React.MutableRefObject<Set<string>>;
  lastCompletionCheckRef: React.MutableRefObject<number>;
  activeTrainingSessionRef: React.MutableRefObject<string>;
  trainingStartTimeRef: React.MutableRefObject<number>;
  minTrainingDurationRef: React.MutableRefObject<number>;
  shownToastsRef: React.MutableRefObject<Set<string>>;
  pendingTimersRef: React.MutableRefObject<Set<NodeJS.Timeout>>;
  sessionCompletionFlagRef: React.MutableRefObject<Set<string>>;
  globalTrainingActiveRef: React.MutableRefObject<boolean>;
  lastTrainingActionRef: React.MutableRefObject<'start' | 'complete' | 'none'>;
}
