
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';
import { useChunkProcessingProgress } from './useChunkProcessingProgress';

interface TrainingProgress {
  agentId: string;
  status: 'idle' | 'training' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
  currentlyProcessing?: string[];
  sessionId?: string;
}

export const useTrainingNotifications = () => {
  const { agentId } = useParams();
  
  // Use the new chunk processing progress hook
  const { progress: chunkProgress, startChunkProcessing } = useChunkProcessingProgress();
  
  // CRITICAL: Enhanced state management with permanent completion tracking
  const trainingStateRef = useRef<{
    status: 'idle' | 'training' | 'completed' | 'failed';
    sessionId: string | null;
    completedSessions: Set<string>;
    permanentlyCompleted: boolean;
    completionLocked: boolean;
  }>({
    status: 'idle',
    sessionId: null,
    completedSessions: new Set(),
    permanentlyCompleted: false,
    completionLocked: false
  });
  
  const shownToastsRef = useRef<Set<string>>(new Set());
  const lastStatusRef = useRef<string>('');
  const isProcessingStatusRef = useRef<boolean>(false);
  
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Convert chunk progress to training progress format with enhanced session management
  useEffect(() => {
    if (chunkProgress && agentId) {
      // CRITICAL: Prevent concurrent status processing
      if (isProcessingStatusRef.current) {
        console.log('🚫 Status processing blocked - already in progress');
        return;
      }

      // CRITICAL: Don't process if permanently completed
      if (trainingStateRef.current.permanentlyCompleted) {
        console.log('🚫 Status processing blocked - permanently completed');
        return;
      }

      isProcessingStatusRef.current = true;

      try {
        // CRITICAL: Create stable session ID only once per training cycle
        if (!trainingStateRef.current.sessionId && 
            (chunkProgress.status === 'processing' || chunkProgress.progress > 0)) {
          trainingStateRef.current.sessionId = `training-${agentId}-${Date.now()}`;
          console.log('🆔 Created stable session ID:', trainingStateRef.current.sessionId);
        }
        
        const sessionId = trainingStateRef.current.sessionId || `default-${agentId}`;

        // CRITICAL: Map chunk processing status to training status correctly
        const mapStatus = (chunkStatus: 'idle' | 'processing' | 'completed' | 'failed'): 'idle' | 'training' | 'completed' | 'failed' => {
          switch (chunkStatus) {
            case 'processing':
              return 'training';
            case 'completed':
              return 'completed';
            case 'failed':
              return 'failed';
            case 'idle':
            default:
              if (chunkProgress.progress > 0 || chunkProgress.currentlyProcessing.length > 0) {
                return 'training';
              }
              return 'idle';
          }
        };

        const mappedStatus = mapStatus(chunkProgress.status);
        const statusKey = `${mappedStatus}-${chunkProgress.progress}-${sessionId}`;

        // Prevent duplicate status processing
        if (lastStatusRef.current === statusKey) {
          isProcessingStatusRef.current = false;
          return;
        }
        lastStatusRef.current = statusKey;

        const newTrainingProgress: TrainingProgress = {
          agentId,
          status: mappedStatus,
          progress: chunkProgress.progress,
          totalSources: chunkProgress.totalPages,
          processedSources: chunkProgress.processedPages,
          currentlyProcessing: chunkProgress.currentlyProcessing,
          sessionId
        };

        setTrainingProgress(newTrainingProgress);

        console.log('🔄 Training progress mapped from chunk progress:', {
          chunkStatus: chunkProgress.status,
          mappedStatus,
          progress: chunkProgress.progress,
          processing: chunkProgress.currentlyProcessing.length,
          sessionId,
          permanentlyCompleted: trainingStateRef.current.permanentlyCompleted,
          previousStatus: trainingStateRef.current.status
        });

        // Handle status changes - with enhanced completion checks
        const hasRealData = chunkProgress.totalPages > 0 || chunkProgress.processedPages > 0 || chunkProgress.currentlyProcessing.length > 0;
        
        if (hasRealData || chunkProgress.status === 'completed' || chunkProgress.status === 'failed') {
          const previousStatus = trainingStateRef.current.status;
          trainingStateRef.current.status = mappedStatus;

          // CRITICAL: Check if session is already completed or locked
          const isSessionCompleted = trainingStateRef.current.completedSessions.has(sessionId);
          const isCompletionLocked = trainingStateRef.current.completionLocked;
          
          // Training started detection - ONLY if not already completed and not locked
          if (mappedStatus === 'training' && 
              previousStatus !== 'training' && 
              !isSessionCompleted && 
              !isCompletionLocked &&
              !trainingStateRef.current.permanentlyCompleted) {
            
            console.log('🚀 Training started detected! Session:', sessionId, 'Previous status:', previousStatus);
            
            // Show "Training Started" toast only if session hasn't completed
            const startToastId = `start-${sessionId}`;
            if (!shownToastsRef.current.has(startToastId)) {
              shownToastsRef.current.add(startToastId);
              
              toast({
                title: "Training Started",
                description: "Processing sources and creating chunks for AI training...",
                duration: 3000,
              });
              
              console.log('✅ "Training Started" toast shown for session:', sessionId);
            }
          }

          // Training completed - PERMANENTLY LOCK everything
          if (chunkProgress.status === 'completed' && 
              previousStatus !== 'completed' &&
              !trainingStateRef.current.completedSessions.has(sessionId)) {
            
            console.log('🎉 Training completed! PERMANENTLY locking all training state for session:', sessionId);
            
            // PERMANENTLY LOCK this session and all future training
            trainingStateRef.current.completedSessions.add(sessionId);
            trainingStateRef.current.permanentlyCompleted = true;
            trainingStateRef.current.completionLocked = true;
            
            const completionToastId = `completion-${sessionId}`;
            if (!shownToastsRef.current.has(completionToastId)) {
              shownToastsRef.current.add(completionToastId);
              
              toast({
                title: "Training Complete",
                description: `Successfully processed ${chunkProgress.chunksCreated} chunks from ${chunkProgress.processedPages} pages`,
                duration: 5000,
              });

              console.log('✅ "Training Complete" toast shown for session:', sessionId);

              window.dispatchEvent(new CustomEvent('trainingCompleted', {
                detail: { agentId, progress: newTrainingProgress }
              }));
            }
          }

          // Training failed - PERMANENTLY LOCK the session
          if (chunkProgress.status === 'failed' && previousStatus !== 'failed') {
            console.log('❌ Training failed for session:', sessionId);
            
            // PERMANENTLY LOCK this session to prevent restart toasts
            trainingStateRef.current.completedSessions.add(sessionId);
            trainingStateRef.current.completionLocked = true;
            
            const failureToastId = `failure-${sessionId}`;
            if (!shownToastsRef.current.has(failureToastId)) {
              shownToastsRef.current.add(failureToastId);
              
              toast({
                title: "Training Failed",
                description: "Some sources failed to process. Please check your sources and try again.",
                variant: "destructive",
                duration: 5000,
              });
            }
          }
        }
      } finally {
        isProcessingStatusRef.current = false;
      }
    }
  }, [chunkProgress, agentId]);

  const startTraining = async () => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting training for agent:', agentId);

      // CRITICAL: Reset all completion state for new training session
      trainingStateRef.current = {
        status: 'training',
        sessionId: null, // Will be created in useEffect when status changes
        completedSessions: new Set(),
        permanentlyCompleted: false,
        completionLocked: false
      };

      console.log('✅ Training state reset for new session');

      // IMMEDIATELY set training progress to show dialog in training state
      const initialTrainingProgress: TrainingProgress = {
        agentId,
        status: 'training',
        progress: 0,
        totalSources: 0,
        processedSources: 0,
        currentlyProcessing: [],
        sessionId: 'initializing'
      };
      
      setTrainingProgress(initialTrainingProgress);
      
      console.log('✅ Initial training state set to TRAINING');

      // Start the actual chunk processing
      await startChunkProcessing();

    } catch (error) {
      console.error('Failed to start training:', error);
      
      trainingStateRef.current.status = 'failed';
      trainingStateRef.current.completionLocked = true;
      
      // Update training progress to failed state
      setTrainingProgress({
        agentId: agentId!,
        status: 'failed',
        progress: 0,
        totalSources: 0,
        processedSources: 0,
        sessionId: trainingStateRef.current.sessionId || 'failed'
      });
      
      const isConflictError = error?.message?.includes('409') || error?.status === 409;
      
      if (isConflictError) {
        toast({
          title: "Training In Progress",
          description: "Training is already running - no action needed",
        });
      } else {
        toast({
          title: "Training Failed",
          description: "Failed to start training process",
          variant: "destructive",
        });
      }
    }
  };

  const checkTrainingCompletion = () => {
    console.log('Training completion check - delegated to chunk processing hook');
  };

  // Set up basic connection monitoring
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel(`training-notifications-${agentId}`)
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  return {
    trainingProgress,
    startTraining,
    checkTrainingCompletion,
    isConnected
  };
};
