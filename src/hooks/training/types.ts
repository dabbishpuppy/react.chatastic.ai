
export interface TrainingProgress {
  agentId: string;
  status: 'idle' | 'initializing' | 'training' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
  totalChunks: number;
  processedChunks: number;
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
  // Training state management - FIXED: Include 'completed' in the type
  trainingStateRef: React.MutableRefObject<'idle' | 'initializing' | 'training' | 'completed' | 'failed'>;
  activeTrainingSessionRef: React.MutableRefObject<string>;
  currentTrainingSessionRef: React.MutableRefObject<string>;
  currentSessionIdRef: React.MutableRefObject<string>;
  globalTrainingActiveRef: React.MutableRefObject<boolean>;
  
  // Completion tracking
  agentCompletionStateRef: React.MutableRefObject<{
    isCompleted: boolean;
    completedAt: number;
    lastCompletedSessionId: string;
  }>;
  completedSessionsRef: React.MutableRefObject<Set<string>>;
  sessionCompletionFlagRef: React.MutableRefObject<Set<string>>;
  
  // Timing and debouncing
  lastCompletionCheckRef: React.MutableRefObject<number>;
  lastTrainingActionRef: React.MutableRefObject<string>;
  trainingStartTimeRef: React.MutableRefObject<number>;
  minTrainingDurationRef: React.MutableRefObject<number>;
  
  // UI state
  dialogLockedRef: React.MutableRefObject<boolean>;
  shownToastsRef: React.MutableRefObject<Set<string>>;
  trainingToastShownRef: React.MutableRefObject<Set<string>>;
  
  // Timer management
  pendingTimersRef: React.MutableRefObject<Set<NodeJS.Timeout>>;
  
  // Connection and crawl state
  pageLoadTimestampRef: React.MutableRefObject<number>;
  hasEverConnectedRef: React.MutableRefObject<boolean>;
  crawlInitiationInProgressRef: React.MutableRefObject<boolean>;
  crawlInitiationStartTimeRef: React.MutableRefObject<number>;
}
