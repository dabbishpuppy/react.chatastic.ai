
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
          filter: `parent_source_id=in.(${agentId})`
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
          console.log('📡 New source added:', payload.new);
          // Reset training state when new sources are added
          console.log('🔄 Resetting training state due to new source');
          setTrainingProgress(prev => prev ? {
            ...prev,
            status: 'idle'
          } : null);
          checkTrainingCompletion(agentId);
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
        return;
      }

      // Filter sources that need training (have content or are crawled websites)
      const sourcesNeedingTraining = [];
      for (const source of agentSources as DatabaseSource[]) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          // For website sources, check if there are crawled pages that need processing
          const { data: unprocessedPages } = await supabase
            .from('source_pages')
            .select('id')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed')
            .eq('processing_status', 'pending');

          if (unprocessedPages && unprocessedPages.length > 0) {
            sourcesNeedingTraining.push({
              ...source,
              unprocessedPagesCount: unprocessedPages.length
            });
          }
        } else {
          // For other sources, check if they have content
          const hasContent = source.source_type === 'qa' ? 
            (metadata?.question && metadata?.answer) :
            source.content && source.content.trim().length > 0;

          if (hasContent && metadata.processing_status !== 'completed') {
            sourcesNeedingTraining.push(source);
          }
        }
      }

      if (sourcesNeedingTraining.length === 0) {
        console.log('No sources need training');
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
      let sourcesNeedingProcessing = 0;

      console.log(`📊 Checking training status for ${totalSources} sources needing training`);

      // Check each source for processing status
      for (const source of sourcesNeedingTraining) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          // For website sources, check page processing status
          const { data: sourcePages } = await supabase
            .from('source_pages')
            .select('processing_status')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          if (sourcePages && sourcePages.length > 0) {
            const processingPages = sourcePages.filter(p => p.processing_status === 'processing').length;
            const processedPages = sourcePages.filter(p => p.processing_status === 'processed').length;
            const pendingPages = sourcePages.filter(p => p.processing_status === 'pending' || !p.processing_status).length;

            if (processingPages > 0) {
              trainingSources++;
              console.log(`📄 Website source ${source.title}: ${processingPages} pages processing`);
            } else if (processedPages === sourcePages.length) {
              processedSources++;
              console.log(`✅ Website source ${source.title}: all ${processedPages} pages processed`);
            } else if (pendingPages > 0) {
              sourcesNeedingProcessing++;
              console.log(`⏳ Website source ${source.title}: ${pendingPages} pages need processing`);
            }
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
            sourcesNeedingProcessing++;
            console.log(`⏳ Source ${source.title}: needs processing (status = ${processingStatus || 'none'})`);
          }
        }
      }

      const progress = totalSources > 0 ? Math.round((processedSources / totalSources) * 100) : 0;

      console.log('📊 Training progress calculation:', {
        totalSources,
        processedSources,
        trainingSources,
        sourcesNeedingProcessing,
        progress,
        isTraining: trainingSources > 0,
        isCompleted: trainingSources === 0 && processedSources === totalSources && sourcesNeedingProcessing === 0
      });

      // Determine training status
      let status: 'idle' | 'training' | 'completed' | 'failed' = 'idle';

      if (trainingSources > 0) {
        status = 'training';
        console.log('🔄 Training in progress');
      } else if (sourcesNeedingProcessing > 0) {
        status = 'idle'; // Sources need training but haven't started yet
        console.log(`⏳ ${sourcesNeedingProcessing} sources need processing`);
      } else if (totalSources > 0 && processedSources === totalSources) {
        status = 'completed';
        console.log('🎉 Training completed!');
        
        // Show success notification only once
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

      // Reset any previous completion state
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

      // Separate website sources from others and check what needs training
      const websiteSources = agentSources.filter(s => s.source_type === 'website');
      const otherSources = agentSources.filter(s => s.source_type !== 'website');

      const sourcesToProcess = [];

      // Handle website sources - check for crawled pages that need processing
      for (const websiteSource of websiteSources) {
        const { data: unprocessedPages } = await supabase
          .from('source_pages')
          .select('id')
          .eq('parent_source_id', websiteSource.id)
          .eq('status', 'completed')
          .eq('processing_status', 'pending');

        if (unprocessedPages && unprocessedPages.length > 0) {
          console.log(`📄 Found ${unprocessedPages.length} crawled pages to process for ${websiteSource.title}`);
          sourcesToProcess.push(websiteSource);
          
          // Start processing crawled pages
          const { error: pagesError } = await supabase
            .from('source_pages')
            .update({ processing_status: 'processing' })
            .eq('parent_source_id', websiteSource.id)
            .eq('status', 'completed')
            .eq('processing_status', 'pending');

          if (pagesError) {
            console.error('Error starting website training:', pagesError);
          }
        }
      }

      // Handle other sources that have content
      for (const source of otherSources as DatabaseSource[]) {
        const metadata = (source.metadata as Record<string, any>) || {};
        const hasContent = source.source_type === 'qa' ? 
          (metadata?.question && metadata?.answer) :
          source.content && source.content.trim().length > 0;

        if (hasContent && metadata.processing_status !== 'completed') {
          sourcesToProcess.push(source);
        }
      }

      console.log(`📋 Found ${sourcesToProcess.length} sources that need training`);

      if (sourcesToProcess.length === 0) {
        console.log('No sources need training');
        setTrainingProgress({
          agentId,
          status: 'completed',
          progress: 100,
          totalSources: 0,
          processedSources: 0
        });
        return;
      }

      // Set initial training state
      setTrainingProgress({
        agentId,
        status: 'training',
        progress: 0,
        totalSources: sourcesToProcess.length,
        processedSources: 0
      });

      // IMPROVED: Show better toast notification
      toast({
        title: "Training Started",
        description: `Processing ${sourcesToProcess.length} source${sourcesToProcess.length > 1 ? 's' : ''} for AI training...`,
        duration: 3000,
      });

      // Process non-website sources
      const nonWebsiteSources = sourcesToProcess.filter(s => s.source_type !== 'website');
      const processingPromises = nonWebsiteSources.map(async (source) => {
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
      
      // IMPROVED: Show more specific error message
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
      
      setTrainingProgress(prev => prev ? {
        ...prev,
        status: isConflictError ? 'training' : 'failed'
      } : null);
    }
  };

  return {
    trainingProgress,
    startTraining,
    checkTrainingCompletion: () => agentId && checkTrainingCompletion(agentId)
  };
};
