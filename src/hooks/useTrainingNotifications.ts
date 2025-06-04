
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';

interface TrainingProgress {
  agentId: string;
  status: 'idle' | 'training' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
}

export const useTrainingNotifications = () => {
  const { agentId } = useParams();
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);

  useEffect(() => {
    if (!agentId) return;

    console.log('🔔 Setting up unified training notifications for agent:', agentId);

    // Subscribe to both source pages and source chunks/embeddings for comprehensive tracking
    const channel = supabase
      .channel(`training-notifications-${agentId}`)
      // Track website source page processing
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
          
          console.log('📡 Website page training update:', {
            pageId: updatedPage.id,
            processingStatus: updatedPage.processing_status,
            url: updatedPage.url
          });

          checkTrainingCompletion(agentId);
        }
      )
      // Track source metadata updates for other source types
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          const updatedSource = payload.new as any;
          const metadata = updatedSource.metadata || {};
          
          console.log('📡 Source metadata training update:', {
            sourceId: updatedSource.id,
            sourceType: updatedSource.source_type,
            processingStatus: metadata.processing_status,
            title: updatedSource.title
          });

          // Check if this is a processing status update
          if (metadata.processing_status) {
            checkTrainingCompletion(agentId);
          }
        }
      )
      // Track chunk creation for all source types
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'source_chunks',
          filter: `source_id.in.(select id from agent_sources where agent_id=eq.${agentId})`
        },
        (payload) => {
          console.log('📡 Chunk created for agent source:', payload.new);
          checkTrainingCompletion(agentId);
        }
      )
      // Track embedding creation for all source types
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'source_embeddings'
        },
        (payload) => {
          console.log('📡 Embedding created:', payload.new);
          checkTrainingCompletion(agentId);
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up unified training notifications');
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const checkTrainingCompletion = async (agentId: string) => {
    try {
      // Get all active sources for this agent
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata, title')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) {
        console.error('Error fetching agent sources:', sourcesError);
        return;
      }

      if (!agentSources || agentSources.length === 0) {
        return;
      }

      let totalSources = 0;
      let processedSources = 0;
      let trainingSources = 0;

      // Check each source type for processing status
      for (const source of agentSources) {
        const hasContent = source.source_type === 'qa' ? 
          (source.metadata?.question && source.metadata?.answer) :
          source.metadata?.content || source.content;

        if (!hasContent) continue; // Skip sources without content

        totalSources++;
        const metadata = source.metadata || {};

        if (source.source_type === 'website') {
          // For website sources, check crawled pages
          const { data: sourcePages } = await supabase
            .from('source_pages')
            .select('processing_status')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          if (sourcePages && sourcePages.length > 0) {
            const processingPages = sourcePages.filter(p => p.processing_status === 'processing').length;
            const processedPages = sourcePages.filter(p => p.processing_status === 'processed').length;

            if (processingPages > 0) {
              trainingSources++;
            } else if (processedPages === sourcePages.length) {
              processedSources++;
            }
          }
        } else {
          // For other sources, check metadata processing status
          const processingStatus = metadata.processing_status;
          
          if (processingStatus === 'completed') {
            processedSources++;
          } else if (processingStatus === 'processing') {
            trainingSources++;
          }
        }
      }

      const progress = totalSources > 0 ? Math.round((processedSources / totalSources) * 100) : 0;

      console.log('📊 Unified training progress check:', {
        totalSources,
        processedSources,
        trainingSources,
        progress,
        allCompleted: trainingSources === 0 && processedSources === totalSources
      });

      // Determine training status
      let status: 'idle' | 'training' | 'completed' | 'failed' = 'idle';

      if (trainingSources > 0) {
        status = 'training';
      } else if (totalSources > 0 && processedSources === totalSources) {
        status = 'completed';
        
        // Show success notification
        toast({
          title: "Training Complete!",
          description: "Your AI agent is trained and ready",
          duration: 8000,
        });
      }

      setTrainingProgress({
        agentId,
        status,
        progress,
        totalSources,
        processedSources
      });

    } catch (error) {
      console.error('Error in unified checkTrainingCompletion:', error);
    }
  };

  const startTraining = async () => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting unified training for agent:', agentId);

      // Get all active sources for this agent
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) {
        console.error('Error fetching agent sources:', sourcesError);
        throw sourcesError;
      }

      if (!agentSources || agentSources.length === 0) {
        console.log('No sources found for agent');
        return;
      }

      // Handle website sources
      const websiteSources = agentSources.filter(s => s.source_type === 'website');
      if (websiteSources.length > 0) {
        const websiteSourceIds = websiteSources.map(s => s.id);
        
        // Update all pending pages to processing status
        const { error: pagesError } = await supabase
          .from('source_pages')
          .update({ processing_status: 'processing' })
          .eq('status', 'completed')
          .eq('processing_status', 'pending')
          .in('parent_source_id', websiteSourceIds);

        if (pagesError) {
          console.error('Error starting website training:', pagesError);
        }
      }

      // Handle other source types by updating their metadata
      const otherSources = agentSources.filter(s => s.source_type !== 'website');
      for (const source of otherSources) {
        await supabase
          .from('agent_sources')
          .update({
            metadata: {
              ...(source.metadata || {}),
              processing_status: 'processing',
              training_started_at: new Date().toISOString()
            }
          })
          .eq('id', source.id);
      }

      setTrainingProgress({
        agentId,
        status: 'training',
        progress: 0,
        totalSources: agentSources.length,
        processedSources: 0
      });

      toast({
        title: "Training Started",
        description: "Processing your content for AI training...",
        duration: 3000,
      });

    } catch (error) {
      console.error('Failed to start unified training:', error);
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
