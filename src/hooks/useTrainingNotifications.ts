
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
  
  // State management refs
  const pageLoadTimestampRef = useRef<number>(Date.now());
  const hasEverConnectedRef = useRef<boolean>(false);
  const lastCompletionCheckRef = useRef<number>(0);
  const shownToastsRef = useRef<Set<string>>(new Set());
  const currentSessionRef = useRef<string>('');
  const trainingStateRef = useRef<'idle' | 'training' | 'completed' | 'failed'>('idle');
  const trainingInitiatedByUserRef = useRef<boolean>(false);
  const completedSessionsRef = useRef<Set<string>>(new Set());
  const initialTrainingSetRef = useRef<boolean>(false);
  
  // NEW: Add completion lock to prevent any toasts after completion
  const completionLockRef = useRef<Set<string>>(new Set());
  const sessionCompletedRef = useRef<boolean>(false);
  
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Convert chunk progress to training progress format with PROPER status mapping
  useEffect(() => {
    if (chunkProgress && agentId) {
      const sessionId = currentSessionRef.current || `${agentId}-${Date.now()}`;
      
      // CRITICAL FIX: Map chunk processing status to training status correctly
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
        isCompleted: completionLockRef.current.has(sessionId)
      });

      // Handle status changes - only process if we have real data or definitive status
      const hasRealData = chunkProgress.totalPages > 0 || chunkProgress.processedPages > 0 || chunkProgress.currentlyProcessing.length > 0;
      
      if (hasRealData || chunkProgress.status === 'completed' || chunkProgress.status === 'failed') {
        const previousStatus = trainingStateRef.current;
        trainingStateRef.current = mappedStatus;

        // CRITICAL FIX: Check completion lock before showing any "Training Started" toast
        const isSessionCompleted = completionLockRef.current.has(sessionId);
        
        // Training started detection - ONLY if not already completed
        if (mappedStatus === 'training' && 
            previousStatus !== 'training' && 
            !isSessionCompleted && 
            !sessionCompletedRef.current) {
          
          console.log('🚀 Training started detected! Session:', sessionId);
          
          // Show "Training Started" toast only if session hasn't completed
          const startToastId = `start-${sessionId}`;
          if (!shownToastsRef.current.has(startToastId)) {
            shownToastsRef.current.add(startToastId);
            
            toast({
              title: "Training Started",
              description: "Processing sources and creating chunks for AI training...",
              duration: 3000,
            });
          }
        }

        // Training completed - LOCK the session to prevent further "Training Started" toasts
        if (chunkProgress.status === 'completed' && 
            previousStatus !== 'completed' &&
            !completedSessionsRef.current.has(sessionId)) {
          
          console.log('🎉 Training completed! Locking session:', sessionId);
          
          // LOCK this session from showing any more "Training Started" toasts
          completionLockRef.current.add(sessionId);
          sessionCompletedRef.current = true;
          completedSessionsRef.current.add(sessionId);
          trainingInitiatedByUserRef.current = false;
          
          const completionToastId = `completion-${sessionId}`;
          if (!shownToastsRef.current.has(completionToastId)) {
            shownToastsRef.current.add(completionToastId);
            
            toast({
              title: "Training Complete",
              description: `Successfully processed ${chunkProgress.chunksCreated} chunks from ${chunkProgress.processedPages} pages`,
              duration: 5000,
            });

            window.dispatchEvent(new CustomEvent('trainingCompleted', {
              detail: { agentId, progress: newTrainingProgress }
            }));
          }
        }

        // Training failed
        if (chunkProgress.status === 'failed' && previousStatus !== 'failed') {
          console.log('❌ Training failed for session:', sessionId);
          
          // LOCK this session to prevent restart toasts
          completionLockRef.current.add(sessionId);
          trainingInitiatedByUserRef.current = false;
          
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
    }
  }, [chunkProgress, agentId]);

  const startTraining = async () => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting training for agent:', agentId);

      // Set user-initiated flag
      trainingInitiatedByUserRef.current = true;
      
      // Create new session and reset completion state
      const sessionId = `training-${agentId}-${Date.now()}`;
      currentSessionRef.current = sessionId;
      trainingStateRef.current = 'training';
      sessionCompletedRef.current = false; // Reset completion flag for new session

      // Clear previous completion state for new training
      completedSessionsRef.current.clear();
      initialTrainingSetRef.current = true;

      // IMMEDIATELY set training progress to show dialog in training state
      const initialTrainingProgress: TrainingProgress = {
        agentId,
        status: 'training',
        progress: 0,
        totalSources: 0,
        processedSources: 0,
        currentlyProcessing: [],
        sessionId
      };
      
      setTrainingProgress(initialTrainingProgress);
      
      console.log('✅ Initial training state set to TRAINING for session:', sessionId);

      // Start the actual chunk processing
      await startChunkProcessing();

    } catch (error) {
      console.error('Failed to start training:', error);
      
      trainingStateRef.current = 'failed';
      trainingInitiatedByUserRef.current = false;
      
      // Update training progress to failed state
      if (currentSessionRef.current) {
        setTrainingProgress({
          agentId: agentId!,
          status: 'failed',
          progress: 0,
          totalSources: 0,
          processedSources: 0,
          sessionId: currentSessionRef.current
        });
      }
      
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
        if (status === 'SUBSCRIBED') {
          hasEverConnectedRef.current = true;
        }
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
