
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TrainingProgress, TrainingRefs } from './types';

export const useTrainingCompletion = (
  refs: TrainingRefs,
  shouldPreventTrainingAction: (action: 'start' | 'check', sessionId?: string) => boolean,
  markAgentCompletion: (sessionId: string) => void,
  setTrainingProgress: React.Dispatch<React.SetStateAction<TrainingProgress | null>>
) => {
  const checkTrainingCompletion = async (agentId: string) => {
    if (shouldPreventTrainingAction('check')) {
      console.log('🚫 AGENT-LEVEL: Prevented completion check');
      return;
    }

    try {
      console.log('🔍 IMPROVED: Checking training completion for agent:', agentId);

      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata, crawl_status')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) {
        console.error('Error fetching agent sources:', sourcesError);
        return;
      }

      if (!agentSources || agentSources.length === 0) {
        console.log('✅ No sources found for agent - marking as completed');
        refs.trainingStateRef.current = 'completed';
        markAgentCompletion(refs.currentTrainingSessionRef.current);
        
        setTrainingProgress(prev => prev ? {
          ...prev,
          status: 'completed',
          progress: 100
        } : null);
        return;
      }

      console.log(`🔍 IMPROVED: Checking training completion for ${agentSources.length} sources`);

      let sourcesNeedingTraining = 0;
      let currentlyProcessingPages = 0;
      let hasFailedSources = false;
      let totalPagesNeedingProcessing = 0;
      let totalPagesProcessed = 0;

      for (const source of agentSources) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          const { data: pages, error: pagesError } = await supabase
            .from('source_pages')
            .select('processing_status, status')
            .eq('parent_source_id', source.id);

          if (pagesError) {
            console.error(`Error fetching pages for source ${source.id}:`, pagesError);
            continue;
          }

          const pageStats = {
            totalPages: pages?.length || 0,
            pending: pages?.filter(p => p.processing_status === 'pending' || p.processing_status === null).length || 0,
            processing: pages?.filter(p => p.processing_status === 'processing').length || 0,
            processed: pages?.filter(p => p.processing_status === 'completed').length || 0,
            failed: pages?.filter(p => p.processing_status === 'failed').length || 0
          };

          console.log(`📊 Website source ${source.title}:`, pageStats);

          totalPagesNeedingProcessing += pageStats.totalPages;
          totalPagesProcessed += pageStats.processed;
          currentlyProcessingPages += pageStats.processing;

          if (pageStats.pending > 0 || pageStats.processing > 0) {
            sourcesNeedingTraining++;
          }

          if (pageStats.failed > 0) {
            hasFailedSources = true;
          }

          if (pageStats.processed === pageStats.totalPages && pageStats.totalPages > 0) {
            console.log(`✅ PROCESSED: ${source.title} all pages processed`);
          }
        } else {
          // Handle other source types (text, file, qa)
          totalPagesNeedingProcessing += 1;
          
          const hasContent = source.source_type === 'qa' ? 
            (metadata?.question && metadata?.answer) :
            source.content && source.content.trim().length > 0;

          if (hasContent && metadata.processing_status !== 'completed') {
            sourcesNeedingTraining++;
          } else if (metadata.processing_status === 'completed') {
            totalPagesProcessed += 1;
          }

          if (metadata.processing_status === 'failed') {
            hasFailedSources = true;
          }
        }
      }

      const isTrainingComplete = sourcesNeedingTraining === 0 && 
        currentlyProcessingPages === 0 && 
        totalPagesProcessed === totalPagesNeedingProcessing &&
        totalPagesNeedingProcessing > 0;

      console.log('🔍 IMPROVED Status determination:', {
        sourcesNeedingTraining,
        currentlyProcessingPages,
        hasFailedSources,
        totalPagesNeedingProcessing,
        totalPagesProcessed,
        isTrainingComplete,
        activeTrainingSession: refs.activeTrainingSessionRef.current
      });

      let status: 'training' | 'completed' | 'failed' = 'training';
      
      if (hasFailedSources) {
        status = 'failed';
        console.log('❌ Status: FAILED (sources have failed processing)');
      } else if (isTrainingComplete) {
        status = 'completed';
        console.log('✅ Status: COMPLETED (all sources processed successfully)');
      } else if (currentlyProcessingPages > 0 || refs.activeTrainingSessionRef.current) {
        status = 'training';
        console.log('🔄 Status: TRAINING (pages currently processing or active session)');
      } else {
        status = 'completed';
        console.log('✅ Status: COMPLETED (no active processing)');
      }

      const progress = totalPagesNeedingProcessing > 0 ? 
        Math.round((totalPagesProcessed / totalPagesNeedingProcessing) * 100) : 
        100;

      console.log(`📊 IMPROVED Training status update:`, {
        status,
        sessionId: refs.currentTrainingSessionRef.current,
        progress,
        sourcesNeedingTraining,
        currentState: refs.trainingStateRef.current,
        agentCompleted: refs.agentCompletionStateRef.current.isCompleted,
        lastAction: refs.lastTrainingActionRef.current,
        activeSession: refs.activeTrainingSessionRef.current
      });

      // Update training state
      refs.trainingStateRef.current = status;

      setTrainingProgress(prev => {
        const updated = {
          agentId,
          status,
          progress,
          totalSources: totalPagesNeedingProcessing,
          processedSources: totalPagesProcessed,
          currentlyProcessing: [],
          sessionId: refs.currentTrainingSessionRef.current
        };
        return updated;
      });

      // Handle completion
      if (status === 'completed' && !refs.agentCompletionStateRef.current.isCompleted) {
        const sessionId = refs.currentTrainingSessionRef.current || `completion-${Date.now()}`;
        markAgentCompletion(sessionId);
        
        const completionToastId = `completion-${sessionId}`;
        if (!refs.shownToastsRef.current.has(completionToastId)) {
          refs.shownToastsRef.current.add(completionToastId);
          
          console.log('🎉 Showing completion toast for session:', sessionId);
          toast({
            title: "Training Complete!",
            description: "Your AI agent has been successfully trained and is ready to use.",
            duration: 5000,
          });
        }

        // Dispatch completion event
        window.dispatchEvent(new CustomEvent('trainingCompleted', {
          detail: { 
            agentId,
            sessionId,
            timestamp: Date.now()
          }
        }));
      }

    } catch (error) {
      console.error('Error checking IMPROVED training completion:', error);
      
      setTrainingProgress(prev => prev ? {
        ...prev,
        status: 'failed'
      } : null);
    }
  };

  return { checkTrainingCompletion };
};
