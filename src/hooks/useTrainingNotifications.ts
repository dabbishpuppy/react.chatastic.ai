
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

interface DatabaseSource {
  id: string;
  source_type: string;
  metadata: any;
  title: string;
  content?: string;
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
      // Get all active sources for this agent with all required fields
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata, title, content')
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
      for (const source of agentSources as DatabaseSource[]) {
        // Type-safe metadata access
        const metadata = (source.metadata as Record<string, any>) || {};
        
        // Check if source has content based on type
        const hasContent = source.source_type === 'qa' ? 
          (metadata?.question && metadata?.answer) :
          metadata?.content || source.content;

        if (!hasContent) continue; // Skip sources without content

        totalSources++;

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
          const processingStatus = metadata?.processing_status;
          
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

  const processSource = async (source: DatabaseSource) => {
    try {
      console.log(`🔄 Processing source: ${source.title} (${source.source_type})`);

      // Get content for processing
      let contentToProcess = '';
      
      if (source.source_type === 'qa') {
        const metadata = (source.metadata as Record<string, any>) || {};
        if (metadata?.question && metadata?.answer) {
          contentToProcess = `Question: ${metadata.question}\nAnswer: ${metadata.answer}`;
        } else {
          throw new Error('Q&A source missing question or answer');
        }
      } else {
        contentToProcess = source.content || '';
        if (!contentToProcess.trim()) {
          throw new Error('Source has no content to process');
        }
      }

      // First, generate chunks
      console.log(`🔄 Generating chunks for source ${source.id}`);
      const { data: chunkData, error: chunkError } = await supabase.functions.invoke('generate-chunks', {
        body: { 
          sourceId: source.id,
          content: contentToProcess,
          sourceType: source.source_type 
        }
      });

      if (chunkError) {
        throw new Error(`Failed to generate chunks: ${chunkError.message}`);
      }

      console.log(`✅ Generated chunks for source ${source.id}:`, chunkData);

      // Then, generate embeddings
      console.log(`🤖 Generating embeddings for source ${source.id}`);
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embeddings', {
        body: { sourceId: source.id }
      });

      if (embeddingError) {
        throw new Error(`Failed to generate embeddings: ${embeddingError.message}`);
      }

      console.log(`✅ Generated embeddings for source ${source.id}:`, embeddingData);

      // Update source metadata to reflect successful processing
      const currentMetadata = (source.metadata as Record<string, any>) || {};
      await supabase
        .from('agent_sources')
        .update({
          metadata: {
            ...currentMetadata,
            processing_status: 'completed',
            last_processed_at: new Date().toISOString(),
            chunks_generated: chunkData?.chunksCreated || embeddingData?.processedCount || 0,
            embeddings_generated: embeddingData?.processedCount || 0
          }
        })
        .eq('id', source.id);

      console.log(`✅ Successfully processed source ${source.id}`);

    } catch (error) {
      console.error(`❌ Failed to process source ${source.title}:`, error);
      
      // Update source metadata to reflect processing failure
      const currentMetadata = (source.metadata as Record<string, any>) || {};
      await supabase
        .from('agent_sources')
        .update({
          metadata: {
            ...currentMetadata,
            processing_status: 'failed',
            last_processing_attempt: new Date().toISOString(),
            processing_error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        .eq('id', source.id);
      
      throw error;
    }
  };

  const startTraining = async () => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting unified training for agent:', agentId);

      // Get all active sources for this agent with metadata
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata, title, content')
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

      // Separate website sources from others
      const websiteSources = agentSources.filter(s => s.source_type === 'website');
      const otherSources = agentSources.filter(s => s.source_type !== 'website') as DatabaseSource[];

      // Handle website sources (existing crawling process)
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

      // Handle other source types by actually processing them
      const processingPromises = otherSources.map(async (source) => {
        // Mark as processing
        const currentMetadata = (source.metadata as Record<string, any>) || {};
        await supabase
          .from('agent_sources')
          .update({
            metadata: {
              ...currentMetadata,
              processing_status: 'processing',
              training_started_at: new Date().toISOString()
            }
          })
          .eq('id', source.id);

        // Process the source
        return processSource(source);
      });

      // Set initial training state
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

      // Process all non-website sources in parallel
      if (processingPromises.length > 0) {
        await Promise.allSettled(processingPromises);
      }

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
