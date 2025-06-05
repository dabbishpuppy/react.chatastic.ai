
import { toast } from '@/hooks/use-toast';
import { TrainingProgress, TrainingRefs } from '../types';

export class TrainingCompletionHandlerService {
  static async markParentSourcesAsTrained(agentId: string) {
    try {
      console.log('🎓 Marking parent sources as trained for agent:', agentId);
      
      const { supabase } = await import('@/integrations/supabase/client');
      
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
  }

  static handleTrainingCompletion(
    sessionId: string,
    agentId: string,
    refs: TrainingRefs,
    markAgentCompletion: (sessionId: string) => void,
    newProgress: TrainingProgress
  ) {
    console.log('🎉 ENHANCED COMPLETION! Processing completion for session:', sessionId);
    
    markAgentCompletion(sessionId);
    this.markParentSourcesAsTrained(agentId);
    
    // ENHANCED: Stronger completion toast deduplication
    const completionToastId = `completion-${sessionId}`;
    const timeBasedCompletionToastId = `time-completion-${Math.floor(Date.now() / 300000)}`; // One per 5 minutes max
    
    if (!refs.shownToastsRef.current.has(completionToastId) && 
        !refs.shownToastsRef.current.has(timeBasedCompletionToastId)) {
      refs.shownToastsRef.current.add(completionToastId);
      refs.shownToastsRef.current.add(timeBasedCompletionToastId);
      
      console.log('🧠 Showing training completion toast for session:', sessionId);
      toast({
        title: "🧠 Training Complete",
        description: "Your AI agent is trained and ready",
        duration: 5000,
      });

      window.dispatchEvent(new CustomEvent('trainingCompleted', {
        detail: { agentId, progress: newProgress }
      }));
    } else {
      console.log('🚫 ENHANCED: Prevented duplicate completion toast');
    }
  }

  static handleTrainingFailure(sessionId: string, refs: TrainingRefs) {
    console.log('❌ Training failed for session:', sessionId);
    
    refs.activeTrainingSessionRef.current = '';
    refs.trainingStartTimeRef.current = 0;
    refs.trainingStateRef.current = 'failed';
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
}
