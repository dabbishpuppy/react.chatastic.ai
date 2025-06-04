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

    console.log('🔔 Setting up training notifications for agent:', agentId);

    const channel = supabase
      .channel(`training-notifications-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=in.(select id from agent_sources where agent_id = '${agentId}')`
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

          if (metadata.processing_status) {
            checkTrainingCompletion(agentId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('📡 New source added, resetting training state');
          // Reset training state when new sources are added
          setTrainingProgress(prev => prev ? {
            ...prev,
            status: 'idle'
          } : null);
          
          // Check training requirements after brief delay to allow DB consistency
          setTimeout(() => {
            checkTrainingCompletion(agentId);
          }, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'source_chunks'
        },
        (payload) => {
          console.log('📡 Chunk created:', payload.new);
          checkTrainingCompletion(agentId);
        }
      )
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
      console.log('🔌 Cleaning up training notifications');
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const checkTrainingCompletion = async (agentId: string) => {
    try {
      console.log('🔍 Checking training completion for agent:', agentId);
      
      // Get sources that belong to this agent and need training
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
        console.log('No sources found for agent');
        setTrainingProgress({
          agentId,
          status: 'completed',
          progress: 100,
          totalSources: 0,
          processedSources: 0
        });
        return;
      }

      // Filter sources that actually need training (have content)
      const sourcesNeedingTraining = [];
      for (const source of agentSources as DatabaseSource[]) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        // Check if source has content that needs training
        const hasContent = source.source_type === 'qa' ? 
          (metadata?.question && metadata?.answer) :
          source.content && source.content.trim().length > 0;

        if (hasContent) {
          sourcesNeedingTraining.push(source);
        }
      }

      if (sourcesNeedingTraining.length === 0) {
        console.log('No sources with content need training');
        setTrainingProgress({
          agentId,
          status: 'completed',
          progress: 100,
          totalSources: 0,
          processedSources: 0
        });
        return;
      }

      let totalSources = sourcesNeedingTraining.length;
      let processedSources = 0;
      let trainingSources = 0;
      let pendingSources = 0;

      console.log(`📊 Checking training status for ${totalSources} sources with content`);

      // Check each source for processing status
      for (const source of sourcesNeedingTraining) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          // For website sources, get all pages for this source
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
              console.log(`📄 Website source ${source.title}: ${processingPages} pages processing`);
            } else if (processedPages === sourcePages.length) {
              processedSources++;
              console.log(`✅ Website source ${source.title}: all ${processedPages} pages processed`);
            } else {
              pendingSources++;
              console.log(`⏳ Website source ${source.title}: pending training`);
            }
          } else {
            pendingSources++;
            console.log(`⏳ Website source ${source.title}: no pages found, pending training`);
          }
        } else {
          // For other sources, check metadata processing status
          const processingStatus = metadata?.processing_status;
          
          if (processingStatus === 'completed') {
            processedSources++;
            console.log(`✅ Source ${source.title}: processing completed`);
          } else if (processingStatus === 'processing') {
            trainingSources++;
            console.log(`🔄 Source ${source.title}: processing in progress`);
          } else {
            pendingSources++;
            console.log(`⏳ Source ${source.title}: pending training (status: ${processingStatus || 'none'})`);
          }
        }
      }

      const progress = totalSources > 0 ? Math.round((processedSources / totalSources) * 100) : 0;

      console.log('📊 Training progress calculation:', {
        totalSources,
        processedSources,
        trainingSources,
        pendingSources,
        progress,
        isTraining: trainingSources > 0,
        hasPendingWork: pendingSources > 0,
        isCompleted: trainingSources === 0 && pendingSources === 0 && processedSources === totalSources
      });

      // Determine training status with improved logic
      let status: 'idle' | 'training' | 'completed' | 'failed' = 'idle';

      if (trainingSources > 0) {
        status = 'training';
        console.log('🔄 Training in progress');
      } else if (pendingSources > 0) {
        // Sources need training - reset from completed state if necessary
        status = 'idle';
        console.log('⏳ Sources pending training');
      } else if (totalSources > 0 && processedSources === totalSources) {
        status = 'completed';
        console.log('🎉 Training completed!');
        
        // Show success notification only once when transitioning to completed
        if (!trainingProgress || trainingProgress.status !== 'completed') {
          toast({
            title: "Training Complete!",
            description: "Your AI agent is trained and ready",
            duration: 8000,
          });
        }
      }

      setTrainingProgress({
        agentId,
        status,
        progress,
        totalSources,
        processedSources
      });

    } catch (error) {
      console.error('Error in checkTrainingCompletion:', error);
      setTrainingProgress(prev => prev ? {
        ...prev,
        status: 'failed'
      } : null);
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

      // Mark as processing first
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

      // Generate chunks
      console.log(`🔧 Generating chunks for source ${source.id}`);
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

      // Generate embeddings
      console.log(`🤖 Generating embeddings for source ${source.id}`);
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embeddings', {
        body: { sourceId: source.id }
      });

      if (embeddingError) {
        throw new Error(`Failed to generate embeddings: ${embeddingError.message}`);
      }

      console.log(`✅ Generated embeddings for source ${source.id}:`, embeddingData);

      // Update source metadata to reflect successful processing
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
      console.log('🚀 Starting training for agent:', agentId);

      // Reset training state when starting new training
      setTrainingProgress(prev => prev ? {
        ...prev,
        status: 'idle'
      } : null);

      // Get all active sources for this agent
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

      // Filter sources that need training
      const sourcesNeedingTraining = [];
      for (const source of agentSources as DatabaseSource[]) {
        const metadata = (source.metadata as Record<string, any>) || {};
        const hasContent = source.source_type === 'qa' ? 
          (metadata?.question && metadata?.answer) :
          source.content && source.content.trim().length > 0;

        if (hasContent) {
          sourcesNeedingTraining.push(source);
        }
      }

      console.log(`📋 Found ${sourcesNeedingTraining.length} sources that need training`);

      // Separate website sources from others
      const websiteSources = sourcesNeedingTraining.filter(s => s.source_type === 'website');
      const otherSources = sourcesNeedingTraining.filter(s => s.source_type !== 'website');

      // Handle website sources (existing crawling process)
      if (websiteSources.length > 0) {
        const websiteSourceIds = websiteSources.map(s => s.id);
        
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

      // Set initial training state
      setTrainingProgress({
        agentId,
        status: 'training',
        progress: 0,
        totalSources: sourcesNeedingTraining.length,
        processedSources: 0
      });

      toast({
        title: "Training Started",
        description: "Processing your content for AI training...",
        duration: 3000,
      });

      // Process other sources
      const processingPromises = otherSources.map(async (source) => {
        return processSource(source);
      });

      // Process all non-website sources in parallel
      if (processingPromises.length > 0) {
        await Promise.allSettled(processingPromises);
      }

      // Trigger immediate completion check
      setTimeout(() => {
        checkTrainingCompletion(agentId);
      }, 1000);

    } catch (error) {
      console.error('Failed to start training:', error);
      toast({
        title: "Training Failed",
        description: "Failed to start training process",
        variant: "destructive",
      });
      
      setTrainingProgress(prev => prev ? {
        ...prev,
        status: 'failed'
      } : null);
    }
  };

  return {
    trainingProgress,
    startTraining,
    checkTrainingCompletion: () => agentId && checkTrainingCompletion(agentId)
  };
};
