
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TrainingProgress, DatabaseSource, TrainingRefs } from './types';

export const useTrainingCompletion = (
  refs: TrainingRefs,
  shouldPreventTrainingAction: (action: 'start' | 'check', sessionId?: string) => boolean,
  markAgentCompletion: (sessionId: string) => void,
  setTrainingProgress: React.Dispatch<React.SetStateAction<TrainingProgress | null>>
) => {
  const markParentSourcesAsTrained = async (agentId: string) => {
    try {
      console.log('🎓 Marking parent sources as trained for agent:', agentId);
      
      const { data: parentSources, error } = await supabase
        .from('agent_sources')
        .select('id, metadata')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .is('parent_source_id', null);

      if (error) {
        console.error('Error fetching parent sources:', error);
        return;
      }

      if (parentSources && parentSources.length > 0) {
        const updatePromises = parentSources.map(source => {
          const existingMetadata = (source.metadata as Record<string, any>) || {};
          const updatedMetadata = {
            ...existingMetadata,
            training_completed: true,
            last_trained_at: new Date().toISOString()
          };

          return supabase
            .from('agent_sources')
            .update({ metadata: updatedMetadata })
            .eq('id', source.id);
        });

        await Promise.all(updatePromises);
        console.log('✅ Marked all parent sources as trained');
      }
    } catch (error) {
      console.error('Error marking parent sources as trained:', error);
    }
  };

  // ENHANCED: Validation with stronger completion detection
  const validateTrainingCompletion = async (agentId: string) => {
    try {
      console.log('🔍 ENHANCED VALIDATION: Checking actual training completion status');
      
      // Check if chunks exist for any sources of this agent
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) {
        console.error('Error checking agent sources:', sourcesError);
        return false;
      }

      if (!agentSources || agentSources.length === 0) {
        console.log('🔍 ENHANCED VALIDATION: No sources found for agent');
        return false;
      }

      const sourceIds = agentSources.map(s => s.id);
      
      // Check if chunks exist for these sources
      const { data: chunks, error: chunksError } = await supabase
        .from('source_chunks')
        .select('id')
        .in('source_id', sourceIds)
        .limit(1);

      if (chunksError) {
        console.error('Error checking chunks:', chunksError);
        return false;
      }

      const hasChunks = chunks && chunks.length > 0;
      console.log('🔍 ENHANCED VALIDATION: Agent has chunks:', hasChunks);

      // Check if all sources are processed
      const { data: allAgentSources, error: allSourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (allSourcesError) {
        console.error('Error checking sources:', allSourcesError);
        return false;
      }

      let allSourcesProcessed = true;
      for (const source of allAgentSources || []) {
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

      console.log('🔍 ENHANCED VALIDATION: All sources processed:', allSourcesProcessed);
      
      const isActuallyComplete = hasChunks && allSourcesProcessed;
      console.log('🔍 ENHANCED VALIDATION: Training actually complete:', isActuallyComplete);
      
      return isActuallyComplete;
    } catch (error) {
      console.error('Error validating training completion:', error);
      return false;
    }
  };

  const checkTrainingCompletion = async (agentId: string) => {
    try {
      const now = Date.now();
      
      if (shouldPreventTrainingAction('check')) {
        console.log('🚫 ENHANCED AGENT-LEVEL: Prevented checkTrainingCompletion');
        return;
      }
      
      if (now - refs.lastCompletionCheckRef.current < 3000) {
        console.log('🚫 Debounced checkTrainingCompletion call');
        return;
      }
      refs.lastCompletionCheckRef.current = now;

      // ENHANCED: Early exit if agent is in completion protection period
      if (refs.agentCompletionStateRef.current.isCompleted) {
        const timeSinceCompletion = now - refs.agentCompletionStateRef.current.completedAt;
        if (timeSinceCompletion < 30000) { // 30 second protection
          console.log('🚫 ENHANCED: Agent in completion protection period, skipping check');
          return;
        }
      }

      // Validate if training is actually complete
      const isActuallyComplete = await validateTrainingCompletion(agentId);
      
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata, title, content, crawl_status')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) {
        console.error('Error fetching agent sources:', sourcesError);
        return;
      }

      if (!agentSources || agentSources.length === 0) {
        return;
      }

      const sourcesNeedingTraining = [];
      let totalPagesNeedingProcessing = 0;
      let totalPagesProcessed = 0;
      let currentlyProcessingPages: string[] = [];
      let hasFailedSources = false;

      console.log('🔍 ENHANCED: Checking training completion for', agentSources.length, 'sources');

      for (const source of agentSources as DatabaseSource[]) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          const { data: pages } = await supabase
            .from('source_pages')
            .select('id, url, processing_status, status')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          if (pages && pages.length > 0) {
            const pendingPages = pages.filter(p => 
              !p.processing_status || 
              p.processing_status === 'pending' || 
              p.processing_status === null
            );
            const processingPages = pages.filter(p => p.processing_status === 'processing');
            const processedPages = pages.filter(p => p.processing_status === 'processed');
            const failedPages = pages.filter(p => p.processing_status === 'failed');

            console.log(`📊 Website source ${source.title}:`, {
              totalPages: pages.length,
              pending: pendingPages.length,
              processing: processingPages.length,
              processed: processedPages.length,
              failed: failedPages.length
            });

            if (failedPages.length > 0) {
              hasFailedSources = true;
            }

            if (pendingPages.length > 0 || processingPages.length > 0) {
              sourcesNeedingTraining.push(source);
              console.log(`✅ NEEDS TRAINING: ${source.title} has ${pendingPages.length + processingPages.length} unprocessed pages`);
            } else {
              console.log(`✅ PROCESSED: ${source.title} all pages processed`);
            }
            
            totalPagesNeedingProcessing += pages.length;
            totalPagesProcessed += processedPages.length;
            
            currentlyProcessingPages.push(...processingPages.map(p => p.url || p.id));
          }
        } else {
          const hasContent = source.source_type === 'qa' ? 
            (metadata?.question && metadata?.answer) :
            source.content && source.content.trim().length > 0;

          if (hasContent) {
            if (metadata.processing_status === 'failed') {
              hasFailedSources = true;
            }
            
            if (metadata.processing_status !== 'completed') {
              sourcesNeedingTraining.push(source);
              totalPagesNeedingProcessing += 1;
              
              if (metadata.processing_status === 'processing') {
                currentlyProcessingPages.push(source.title);
              }
            } else {
              totalPagesNeedingProcessing += 1;
              totalPagesProcessed += 1;
            }
          }
        }
      }

      const calculatedProgress = totalPagesNeedingProcessing > 0 ? 
        Math.round((totalPagesProcessed / totalPagesNeedingProcessing) * 100) : 100;

      let status: 'idle' | 'training' | 'completed' | 'failed' = 'idle';
      
      console.log('🔍 ENHANCED Status determination:', {
        sourcesNeedingTraining: sourcesNeedingTraining.length,
        currentlyProcessingPages: currentlyProcessingPages.length,
        hasFailedSources,
        totalPagesNeedingProcessing,
        totalPagesProcessed,
        activeTrainingSession: refs.activeTrainingSessionRef.current,
        isActuallyComplete,
        calculatedProgress,
        agentCompletionState: refs.agentCompletionStateRef.current
      });

      // ENHANCED: Status determination with completion state protection
      if (isActuallyComplete) {
        status = 'completed';
        console.log('✅ ENHANCED Status: COMPLETED (validated - has chunks and all sources processed)');
        
        // Force cleanup of stuck training state
        if (refs.activeTrainingSessionRef.current) {
          console.log('🧹 ENHANCED CLEANUP: Clearing stuck training session state');
          refs.activeTrainingSessionRef.current = '';
          refs.trainingStartTimeRef.current = 0;
          refs.globalTrainingActiveRef.current = false;
        }
      } else if (hasFailedSources && sourcesNeedingTraining.length === 0) {
        status = 'failed';
        console.log('❌ Status: FAILED (has failed sources, no pending)');
      } else if (currentlyProcessingPages.length > 0 || refs.activeTrainingSessionRef.current) {
        status = 'training';
        console.log('🔄 Status: TRAINING (pages currently processing or active session)');
        
        // Recovery mechanism - if progress is 100% but still showing training, validate
        if (calculatedProgress === 100 && currentlyProcessingPages.length === 0) {
          console.log('🔍 ENHANCED RECOVERY: Progress 100% but status training - validating completion');
          const recoveryValidation = await validateTrainingCompletion(agentId);
          if (recoveryValidation) {
            status = 'completed';
            console.log('✅ ENHANCED RECOVERY: Forced status to completed after validation');
          }
        }
      } else if (sourcesNeedingTraining.length === 0 && totalPagesNeedingProcessing > 0) {
        status = 'completed';
        console.log('✅ Status: COMPLETED (no sources need training, all processed)');
      } else {
        status = 'idle';
        console.log('⏸️ Status: IDLE (default state)');
      }

      let sessionId = refs.currentTrainingSessionRef.current;
      
      if (!sessionId && !refs.agentCompletionStateRef.current.isCompleted) {
        sessionId = `${agentId}-${Date.now()}`;
        refs.currentTrainingSessionRef.current = sessionId;
        console.log('🆔 Created new session:', sessionId);
      } else if (!sessionId && refs.agentCompletionStateRef.current.isCompleted) {
        sessionId = refs.agentCompletionStateRef.current.lastCompletedSessionId || `${agentId}-completed`;
        console.log('🔒 Using last completed session ID to prevent regeneration:', sessionId);
      }

      const newProgress: TrainingProgress = {
        agentId,
        status,
        progress: calculatedProgress,
        totalSources: totalPagesNeedingProcessing,
        processedSources: totalPagesProcessed,
        currentlyProcessing: currentlyProcessingPages,
        sessionId
      };

      console.log('📊 ENHANCED Training status update:', {
        status,
        sessionId,
        progress: calculatedProgress,
        sourcesNeedingTraining: sourcesNeedingTraining.length,
        currentState: refs.trainingStateRef.current,
        agentCompleted: refs.agentCompletionStateRef.current.isCompleted,
        lastAction: refs.lastTrainingActionRef.current,
        activeSession: refs.activeTrainingSessionRef.current,
        validationResult: isActuallyComplete
      });

      setTrainingProgress(newProgress);

      const previousStatus = refs.trainingStateRef.current;
      refs.trainingStateRef.current = status;

      if (status === 'completed' && 
          previousStatus !== 'completed' &&
          totalPagesNeedingProcessing > 0 &&
          totalPagesProcessed === totalPagesNeedingProcessing &&
          !refs.completedSessionsRef.current.has(sessionId) &&
          !refs.agentCompletionStateRef.current.isCompleted) {
        
        console.log('🎉 ENHANCED COMPLETION! Processing completion for session:', sessionId);
        
        markAgentCompletion(sessionId);
        await markParentSourcesAsTrained(agentId);
        
        const completionToastId = `completion-${sessionId}`;
        if (!refs.shownToastsRef.current.has(completionToastId)) {
          refs.shownToastsRef.current.add(completionToastId);
          
          toast({
            title: "Training Complete",
            description: "Your AI agent is trained and ready",
            duration: 5000,
          });

          window.dispatchEvent(new CustomEvent('trainingCompleted', {
            detail: { agentId, progress: newProgress }
          }));
        }
      }

      if (status === 'failed' && previousStatus !== 'failed') {
        console.log('❌ Training failed for session:', sessionId);
        
        refs.activeTrainingSessionRef.current = '';
        refs.trainingStartTimeRef.current = 0;
        refs.globalTrainingActiveRef.current = false;
        
        const failureToastId = `failure-${sessionId}`;
        if (!refs.shownToastsRef.current.has(failureToastId)) {
          refs.shownToastsRef.current.add(failureToastId);
          
          toast({
            title: "Training Failed",
            description: "Training process encountered an error. Please try again.",
            variant: "destructive",
            duration: 5000,
          });
        }
      }

    } catch (error) {
      console.error('Error in ENHANCED checkTrainingCompletion:', error);
      setTrainingProgress(prev => prev ? { ...prev, status: 'failed' } : null);
    }
  };

  return {
    checkTrainingCompletion,
    markParentSourcesAsTrained
  };
};
