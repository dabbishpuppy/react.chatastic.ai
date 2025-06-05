
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
  const startTraining = async (agentId: string) => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting IMPROVED training for agent:', agentId);

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

      refs.completedSessionsRef.current.clear();
      refs.sessionCompletionFlagRef.current.clear();
      clearAllTimers();

      console.log(`🎯 ACTIVE TRAINING SESSION STARTED: ${sessionId} at ${refs.trainingStartTimeRef.current}`);

      const startToastId = `start-${sessionId}`;
      if (!refs.shownToastsRef.current.has(startToastId)) {
        refs.shownToastsRef.current.add(startToastId);
        
        console.log('📢 Showing training start toast for session:', sessionId);
        toast({
          title: "Training Started",
          description: "Processing sources for AI training...",
          duration: 3000,
        });
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

      if (!refs.agentCompletionStateRef.current.isCompleted) {
        addTrackedTimer(() => checkTrainingCompletion(agentId), 2000);
      }

    } catch (error) {
      console.error('Failed to start IMPROVED training:', error);
      
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
