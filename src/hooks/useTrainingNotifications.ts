
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';

interface TrainingProgress {
  agentId: string;
  status: 'idle' | 'training' | 'completed' | 'failed';
  progress: number;
  totalPages: number;
  processedPages: number;
}

export const useTrainingNotifications = () => {
  const { agentId } = useParams();
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);

  useEffect(() => {
    if (!agentId) return;

    console.log('🔔 Setting up training notifications for agent:', agentId);

    // Subscribe to source page processing status changes
    const channel = supabase
      .channel(`training-notifications-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id.in.(select id from agent_sources where agent_id=eq.${agentId})`
        },
        (payload) => {
          const updatedPage = payload.new as any;
          
          console.log('📡 Training status update:', {
            pageId: updatedPage.id,
            processingStatus: updatedPage.processing_status,
            url: updatedPage.url
          });

          // Check if training just completed
          if (updatedPage.processing_status === 'processed') {
            checkTrainingCompletion(agentId);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up training notifications');
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const checkTrainingCompletion = async (agentId: string) => {
    try {
      // First get agent sources for this agent
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('agent_id', agentId)
        .eq('source_type', 'website')
        .eq('is_active', true);

      if (sourcesError) {
        console.error('Error fetching agent sources:', sourcesError);
        return;
      }

      if (!agentSources || agentSources.length === 0) {
        return;
      }

      const sourceIds = agentSources.map(s => s.id);

      // Get all source pages for this agent's sources
      const { data: sourcePages, error } = await supabase
        .from('source_pages')
        .select('processing_status, parent_source_id')
        .in('parent_source_id', sourceIds);

      if (error) {
        console.error('Error checking training completion:', error);
        return;
      }

      const totalPages = sourcePages?.length || 0;
      const processedPages = sourcePages?.filter(p => p.processing_status === 'processed').length || 0;
      const processingPages = sourcePages?.filter(p => p.processing_status === 'processing').length || 0;

      console.log('📊 Training progress check:', {
        totalPages,
        processedPages,
        processingPages,
        allCompleted: processingPages === 0 && processedPages === totalPages
      });

      // If all pages are processed and none are processing, training is complete
      if (totalPages > 0 && processingPages === 0 && processedPages === totalPages) {
        console.log('🎉 Training completed for agent:', agentId);
        
        // Show success notification
        toast({
          title: "Training Complete!",
          description: "Your AI agent is trained and ready",
          duration: 8000,
        });

        setTrainingProgress({
          agentId,
          status: 'completed',
          progress: 100,
          totalPages,
          processedPages
        });
      } else if (processingPages > 0) {
        // Training is in progress
        const progress = totalPages > 0 ? Math.round((processedPages / totalPages) * 100) : 0;
        
        setTrainingProgress({
          agentId,
          status: 'training',
          progress,
          totalPages,
          processedPages
        });
      }
    } catch (error) {
      console.error('Error in checkTrainingCompletion:', error);
    }
  };

  const startTraining = async () => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting training for agent:', agentId);

      // First get agent sources for this agent
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('agent_id', agentId)
        .eq('source_type', 'website')
        .eq('is_active', true);

      if (sourcesError) {
        console.error('Error fetching agent sources:', sourcesError);
        throw sourcesError;
      }

      if (!agentSources || agentSources.length === 0) {
        console.log('No website sources found for agent');
        return;
      }

      const sourceIds = agentSources.map(s => s.id);

      // Update all pending pages to processing status
      const { error } = await supabase
        .from('source_pages')
        .update({ processing_status: 'processing' })
        .eq('status', 'completed')
        .eq('processing_status', 'pending')
        .in('parent_source_id', sourceIds);

      if (error) {
        console.error('Error starting training:', error);
        throw error;
      }

      setTrainingProgress({
        agentId,
        status: 'training',
        progress: 0,
        totalPages: 0,
        processedPages: 0
      });

      toast({
        title: "Training Started",
        description: "Processing your content for AI training...",
        duration: 3000,
      });

    } catch (error) {
      console.error('Failed to start training:', error);
      toast({
        title: "Training Failed",
        description: "Failed to start training process",
        variant: "destructive",
      });
    }
  };

  return {
    trainingProgress,
    startTraining,
    checkTrainingCompletion: () => agentId && checkTrainingCompletion(agentId)
  };
};
