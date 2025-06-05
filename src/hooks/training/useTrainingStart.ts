
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SourceProcessor } from '@/services/rag/retraining/sourceProcessor';
import { TrainingProgress, DatabaseSource, TrainingRefs } from './types';

export const useTrainingStart = (
  refs: TrainingRefs,
  markAgentCompletion: (sessionId: string) => void,
  setTrainingProgress: React.Dispatch<React.SetStateAction<TrainingProgress | null>>,
  checkTrainingCompletion: (agentId: string) => Promise<void>,
  clearAllTimers: () => void,
  addTrackedTimer: (callback: () => void, delay: number) => NodeJS.Timeout
) => {
  // EMERGENCY: Check if training is actually needed by querying database
  const emergencyCompletionCheck = async (agentId: string): Promise<boolean> => {
    try {
      console.log('🚨 EMERGENCY CHECK: Validating if training is actually needed');
      
      const { data: agentSources, error } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error || !agentSources || agentSources.length === 0) {
        console.log('🚨 EMERGENCY CHECK: No sources found, training not needed');
        return true; // Consider completed if no sources
      }

      let allSourcesProcessed = true;
      for (const source of agentSources) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          const { data: pages } = await supabase
            .from('source_pages')
            .select('processing_status')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          const hasUnprocessedPages = pages?.some(p => 
            !p.processing_status || 
            p.processing_status === 'pending' || 
            p.processing_status === 'processing'
          );

          if (hasUnprocessedPages) {
            allSourcesProcessed = false;
            break;
          }
        } else {
          if (metadata.processing_status !== 'completed') {
            allSourcesProcessed = false;
            break;
          }
        }
      }

      console.log('🚨 EMERGENCY CHECK: All sources processed:', allSourcesProcessed);
      return allSourcesProcessed;
    } catch (error) {
      console.error('🚨 EMERGENCY CHECK failed:', error);
      return false;
    }
  };

  const startTraining = async (agentId: string) => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting STRONGEST PROTECTED training for agent:', agentId);

      // LAYER 1: EMERGENCY DATABASE CHECK - Query actual state
      const isActuallyComplete = await emergencyCompletionCheck(agentId);
      if (isActuallyComplete) {
        console.log('🚫 EMERGENCY PROTECTION: Database shows training is complete, blocking start');
        // Force update completion state
        refs.agentCompletionStateRef.current = {
          isCompleted: true,
          completedAt: Date.now(),
          lastCompletedSessionId: `emergency-${agentId}`
        };
        refs.trainingStateRef.current = 'completed';
        return;
      }

      // LAYER 2: STRONGEST possible completion protection - check ALL completion states
      const timeSinceCompletion = Date.now() - refs.agentCompletionStateRef.current.completedAt;
      
      // CHECK 1: Agent completion state
      if (refs.agentCompletionStateRef.current.isCompleted && timeSinceCompletion < 300000) { // 5 minutes
        console.log('🚫 STRONGEST PROTECTION: Agent completed recently, blocking training start');
        return;
      }

      // CHECK 2: Training state
      if (refs.trainingStateRef.current === 'completed') {
        console.log('🚫 STRONGEST PROTECTION: Training state is completed, blocking training start');
        return;
      }

      // CHECK 3: Completed sessions exist
      if (refs.completedSessionsRef.current.size > 0) {
        console.log('🚫 STRONGEST PROTECTION: Have completed sessions, blocking training start');
        return;
      }

      // CHECK 4: Last action was complete and recent
      if (refs.lastTrainingActionRef.current === 'complete') {
        const timeSinceLastAction = Date.now() - refs.lastCompletionCheckRef.current;
        if (timeSinceLastAction < 300000) { // 5 minutes
          console.log('🚫 STRONGEST PROTECTION: Recent completion action, blocking training start');
          return;
        }
      }

      console.log('🔄 Resetting agent-level completion state for explicit training start');
      refs.agentCompletionStateRef.current = {
        isCompleted: false,
        completedAt: 0,
        lastCompletedSessionId: ''
      };

      const sessionId = `training-${agentId}-${Date.now()}`;
      
      refs.currentTrainingSessionRef.current = sessionId;
      refs.activeTrainingSessionRef.current = sessionId;
      refs.trainingStartTimeRef.current = Date.now();
      refs.trainingStateRef.current = 'training';
      refs.globalTrainingActiveRef.current = true;
      refs.lastTrainingActionRef.current = 'start';

      // ENHANCED: Complete reset of completion tracking
      refs.completedSessionsRef.current.clear();
      refs.sessionCompletionFlagRef.current.clear();
      clearAllTimers();

      console.log(`🎯 ACTIVE TRAINING SESSION STARTED: ${sessionId} at ${refs.trainingStartTimeRef.current}`);

      // LAYER 3: ABSOLUTE FINAL TOAST PROTECTION - Multiple validation layers
      const startToastId = `start-${sessionId}`;
      const recentStartToastId = `recent-start-${agentId}`;
      const timeBasedToastId = `time-start-${Math.floor(Date.now() / 60000)}`; // One per minute max
      
      // ABSOLUTE FINAL CHECK: Triple validation before showing toast
      const absoluteFinalCheck = () => {
        // Re-check completion state right before toast
        const currentTime = Date.now();
        const timeSinceCompletion = currentTime - refs.agentCompletionStateRef.current.completedAt;
        
        return !(
          refs.agentCompletionStateRef.current.isCompleted ||
          refs.trainingStateRef.current === 'completed' ||
          refs.completedSessionsRef.current.size > 0 ||
          (refs.lastTrainingActionRef.current === 'complete' && 
           currentTime - refs.lastCompletionCheckRef.current < 300000)
        );
      };
      
      if (!absoluteFinalCheck()) {
        console.log('🚫 ABSOLUTE FINAL PROTECTION: Blocking training start toast due to completion state');
        return;
      }
      
      // Check multiple conditions for showing toast
      const shouldShowStartToast = !refs.shownToastsRef.current.has(startToastId) && 
                                  !refs.shownToastsRef.current.has(recentStartToastId) &&
                                  !refs.shownToastsRef.current.has(timeBasedToastId);
      
      if (shouldShowStartToast && absoluteFinalCheck()) {
        refs.shownToastsRef.current.add(startToastId);
        refs.shownToastsRef.current.add(recentStartToastId);
        refs.shownToastsRef.current.add(timeBasedToastId);
        
        // Clear the recent start toast flag after 30 seconds
        addTrackedTimer(() => {
          refs.shownToastsRef.current.delete(recentStartToastId);
        }, 30000);
        
        // Clear the time-based toast flag after 2 minutes
        addTrackedTimer(() => {
          refs.shownToastsRef.current.delete(timeBasedToastId);
        }, 120000);
        
        console.log('🧠 Showing training start toast for session:', sessionId);
        toast({
          title: "🧠 Training Started",
          description: "Processing sources for AI training...",
          duration: 3000,
        });
      } else {
        console.log('🚫 ENHANCED: Prevented duplicate training start toast');
      }

      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata, title, content')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) throw sourcesError;
      if (!agentSources || agentSources.length === 0) return;

      const sourcesToProcess = [];
      let totalPages = 0;

      for (const source of agentSources as DatabaseSource[]) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          const { data: unprocessedPages } = await supabase
            .from('source_pages')
            .select('id')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed')
            .in('processing_status', ['pending', null]);

          if (unprocessedPages && unprocessedPages.length > 0) {
            sourcesToProcess.push(source);
            totalPages += unprocessedPages.length;
          }
        } else {
          const hasContent = source.source_type === 'qa' ? 
            (metadata?.question && metadata?.answer) :
            source.content && source.content.trim().length > 0;

          if (hasContent && metadata.processing_status !== 'completed') {
            sourcesToProcess.push(source);
            totalPages += 1;
          }
        }
      }

      if (sourcesToProcess.length === 0) {
        refs.trainingStateRef.current = 'completed';
        refs.globalTrainingActiveRef.current = false;
        markAgentCompletion(sessionId);
        setTrainingProgress({
          agentId,
          status: 'completed',
          progress: 100,
          totalSources: 0,
          processedSources: 0,
          sessionId
        });
        return;
      }

      setTrainingProgress({
        agentId,
        status: 'training',
        progress: 0,
        totalSources: totalPages,
        processedSources: 0,
        currentlyProcessing: [],
        sessionId
      });

      const processingPromises = sourcesToProcess.map(async (source) => {
        return SourceProcessor.processSource(source);
      });

      await Promise.allSettled(processingPromises);

      // ENHANCED: Only check completion if not already completed
      if (!refs.agentCompletionStateRef.current.isCompleted && 
          refs.trainingStateRef.current !== 'completed') {
        addTrackedTimer(() => checkTrainingCompletion(agentId), 2000);
      }

    } catch (error) {
      console.error('Failed to start STRONGEST PROTECTED training:', error);
      
      refs.activeTrainingSessionRef.current = '';
      refs.trainingStartTimeRef.current = 0;
      refs.trainingStateRef.current = 'failed';
      refs.globalTrainingActiveRef.current = false;
      clearAllTimers();
      
      const isConflictError = error?.message?.includes('409') || error?.status === 409;
      
      if (isConflictError) {
        toast({
          title: "Training In Progress",
          description: "Training is already running - no action needed",
        });
        setTrainingProgress(prev => prev ? { ...prev, status: 'training' } : null);
      } else {
        toast({
          title: "Training Failed",
          description: "Failed to start training process",
          variant: "destructive",
        });
        setTrainingProgress(prev => prev ? { ...prev, status: 'failed' } : null);
      }
    }
  };

  return { startTraining };
};
