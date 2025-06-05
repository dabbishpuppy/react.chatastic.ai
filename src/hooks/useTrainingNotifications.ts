
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
  const trainingStateRef = useRef<'idle' | 'training' | 'completed' | 'failed'>('idle');
  const trainingInitiatedByUserRef = useRef<boolean>(false);
  const completedSessionsRef = useRef<Set<string>>(new Set());
  const initialTrainingSetRef = useRef<boolean>(false);
  
  // NEW: Enhanced completion tracking
  const completionLockRef = useRef<Set<string>>(new Set());
  const sessionCompletedRef = useRef<boolean>(false);
  const stableSessionIdRef = useRef<string>('');
  const lastStatusRef = useRef<string>('');
  
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Convert chunk progress to training progress format with enhanced session management
  useEffect(() => {
    if (chunkProgress && agentId) {
      // CRITICAL: Ensure stable session ID throughout the training cycle
      if (!stableSessionIdRef.current || chunkProgress.status === 'processing') {
        if (!stableSessionIdRef.current) {
          stableSessionIdRef.current = `training-${agentId}-${Date.now()}`;
          console.log('🆔 Created stable session ID:', stableSessionIdRef.current);
        }
      }
      
      const sessionId = stableSessionIdRef.current;

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
      const statusKey = `${mappedStatus}-${chunkProgress.progress}-${sessionId}`;

      // Prevent duplicate status processing
      if (lastStatusRef.current === statusKey) {
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
        isSessionCompleted: completionLockRef.current.has(sessionId),
        previousStatus: trainingStateRef.current
      });

      // Handle status changes - with enhanced completion checks
      const hasRealData = chunkProgress.totalPages > 0 || chunkProgress.processedPages > 0 || chunkProgress.currentlyProcessing.length > 0;
      
      if (hasRealData || chunkProgress.status === 'completed' || chunkProgress.status === 'failed') {
        const previousStatus = trainingStateRef.current;
        trainingStateRef.current = mappedStatus;

        // CRITICAL: Check if session is already completed
        const isSessionCompleted = completionLockRef.current.has(sessionId);
        
        // Training started detection - ONLY if not already completed and session not locked
        if (mappedStatus === 'training' && 
            previousStatus !== 'training' && 
            !isSessionCompleted && 
            !sessionCompletedRef.current) {
          
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

        // Training completed - PERMANENTLY LOCK the session
        if (chunkProgress.status === 'completed' && 
            previousStatus !== 'completed' &&
            !completedSessionsRef.current.has(sessionId)) {
          
          console.log('🎉 Training completed! PERMANENTLY locking session:', sessionId);
          
          // PERMANENTLY LOCK this session from showing any more toasts
          completionLockRef.current.add(sessionId);
          sessionCompletedRef.current = true;
          completedSessionsRef.current.add(sessionId);
          trainingInitiatedByUserRef.current = false;
          
          // Clear the stable session ID to prevent reuse
          stableSessionIdRef.current = '';
          
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
          completionLockRef.current.add(sessionId);
          trainingInitiatedByUserRef.current = false;
          
          // Clear the stable session ID
          stableSessionIdRef.current = '';
          
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
      
      // Reset completion state for new training session
      sessionCompletedRef.current = false;
      
      // Create new stable session ID for this training session
      stableSessionIdRef.current = `training-${agentId}-${Date.now()}`;
      trainingStateRef.current = 'training';

      console.log('✅ New training session started with ID:', stableSessionIdRef.current);

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
        sessionId: stableSessionIdRef.current
      };
      
      setTrainingProgress(initialTrainingProgress);
      
      console.log('✅ Initial training state set to TRAINING for session:', stableSessionIdRef.current);

      // Start the actual chunk processing
      await startChunkProcessing();

    } catch (error) {
      console.error('Failed to start training:', error);
      
      trainingStateRef.current = 'failed';
      trainingInitiatedByUserRef.current = false;
      
      // Update training progress to failed state
      if (stableSessionIdRef.current) {
        setTrainingProgress({
          agentId: agentId!,
          status: 'failed',
          progress: 0,
          totalSources: 0,
          processedSources: 0,
          sessionId: stableSessionIdRef.current
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
