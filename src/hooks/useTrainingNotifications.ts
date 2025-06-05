
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
  
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Convert chunk progress to training progress format
  useEffect(() => {
    if (chunkProgress && agentId) {
      const sessionId = currentSessionRef.current || `${agentId}-${Date.now()}`;
      
      // Map chunk processing status to training status
      const mapStatus = (chunkStatus: 'idle' | 'processing' | 'completed' | 'failed'): 'idle' | 'training' | 'completed' | 'failed' => {
        switch (chunkStatus) {
          case 'processing':
            return 'training';
          default:
            return chunkStatus;
        }
      };

      const newTrainingProgress: TrainingProgress = {
        agentId,
        status: mapStatus(chunkProgress.status),
        progress: chunkProgress.progress,
        totalSources: chunkProgress.totalPages, // Use total pages as total items to process
        processedSources: chunkProgress.processedPages,
        currentlyProcessing: chunkProgress.currentlyProcessing,
        sessionId
      };

      setTrainingProgress(newTrainingProgress);

      // Handle status changes
      const previousStatus = trainingStateRef.current;
      trainingStateRef.current = mapStatus(chunkProgress.status);

      // Training completed
      if (chunkProgress.status === 'completed' && 
          previousStatus !== 'completed' &&
          !completedSessionsRef.current.has(sessionId)) {
        
        console.log('🎉 Training completed! Session:', sessionId);
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
  }, [chunkProgress, agentId]);

  const startTraining = async () => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting training for agent:', agentId);

      // Set user-initiated flag
      trainingInitiatedByUserRef.current = true;
      
      // Create new session
      const sessionId = `training-${agentId}-${Date.now()}`;
      currentSessionRef.current = sessionId;
      trainingStateRef.current = 'training';

      // Clear previous completion state
      completedSessionsRef.current.clear();

      // Show "Training Started" toast
      const startToastId = `start-${sessionId}`;
      if (!shownToastsRef.current.has(startToastId)) {
        shownToastsRef.current.add(startToastId);
        
        toast({
          title: "Training Started",
          description: "Processing sources and creating chunks for AI training...",
          duration: 3000,
        });
      }

      // Start the actual chunk processing
      await startChunkProcessing();

    } catch (error) {
      console.error('Failed to start training:', error);
      
      trainingStateRef.current = 'failed';
      trainingInitiatedByUserRef.current = false;
      
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
    // This is now handled by the chunk processing hook
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
