
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';
import { SourceProcessor } from '@/services/rag/retraining/sourceProcessor';

interface TrainingProgress {
  agentId: string;
  status: 'idle' | 'training' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
  currentlyProcessing?: string[];
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
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!agentId) return;

    console.log('🔔 Setting up enhanced training notifications for agent:', agentId);

    let pollInterval: NodeJS.Timeout;
    let websiteSources: string[] = [];

    const initializeSubscriptions = async () => {
      try {
        // Get all website sources for this agent to set up proper filters
        const { data: sources, error } = await supabase
          .from('agent_sources')
          .select('id')
          .eq('agent_id', agentId)
          .eq('source_type', 'website')
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching website sources:', error);
          return;
        }

        websiteSources = sources?.map(s => s.id) || [];
        console.log('📄 Found website sources to monitor:', websiteSources);

        setupRealtimeChannels();
      } catch (error) {
        console.error('Error initializing subscriptions:', error);
      }
    };

    const setupRealtimeChannels = () => {
      const channel = supabase
        .channel(`enhanced-training-notifications-${agentId}`)
        
        // FIXED: Subscribe to processing_status changes (not status changes) 
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'source_pages',
            filter: websiteSources.length > 0 ? `parent_source_id=in.(${websiteSources.join(',')})` : 'parent_source_id=eq.00000000-0000-0000-0000-000000000000'
          },
          (payload) => {
            const updatedPage = payload.new as any;
            const oldPage = payload.old as any;
            
            // FIXED: Only trigger on processing_status changes, not crawling status
            if (oldPage?.processing_status !== updatedPage?.processing_status) {
              console.log('📡 Page processing status change:', {
                pageId: updatedPage.id,
                url: updatedPage.url,
                oldProcessingStatus: oldPage?.processing_status,
                newProcessingStatus: updatedPage.processing_status,
                parentSourceId: updatedPage.parent_source_id
              });

              // Immediate progress check for real-time updates
              setTimeout(() => checkTrainingCompletion(agentId), 100);
            }
          }
        )
        
        // Monitor agent_sources metadata updates for non-website sources
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
            const oldSource = payload.old as any;
            const metadata = updatedSource.metadata || {};
            const oldMetadata = oldSource?.metadata || {};
            
            // Check if processing status changed
            if (oldMetadata?.processing_status !== metadata?.processing_status) {
              console.log('📡 Source metadata processing update:', {
                sourceId: updatedSource.id,
                sourceType: updatedSource.source_type,
                oldStatus: oldMetadata?.processing_status,
                newStatus: metadata.processing_status,
                title: updatedSource.title
              });

              setTimeout(() => checkTrainingCompletion(agentId), 100);
            }
          }
        )
        
        // Monitor new sources being added
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
            setTrainingProgress(prev => prev ? { ...prev, status: 'idle' } : null);
            
            // Re-initialize if new website source
            if ((payload.new as any)?.source_type === 'website') {
              setTimeout(initializeSubscriptions, 500);
            }
            setTimeout(() => checkTrainingCompletion(agentId), 1000);
          }
        )
        
        .subscribe((status) => {
          console.log('📡 Enhanced training subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            if (pollInterval) clearInterval(pollInterval);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            setIsConnected(false);
            pollInterval = setInterval(() => checkTrainingCompletion(agentId), 3000);
            
            toast({
              title: "Connection Issue",
              description: "Training updates may be delayed. We're working on it.",
              duration: 3000,
            });
          }
        });

      return () => {
        console.log('🔌 Cleaning up enhanced training notifications');
        if (pollInterval) clearInterval(pollInterval);
        supabase.removeChannel(channel);
      };
    };

    initializeSubscriptions();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [agentId]);

  const checkTrainingCompletion = async (agentId: string) => {
    try {
      console.log('🔍 Checking enhanced training completion for agent:', agentId);
      
      // Get all active sources for this agent
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
        console.log('No sources found for agent');
        return;
      }

      // FIXED: Calculate what needs training more accurately - focus on processing status
      const sourcesNeedingTraining = [];
      let totalPagesNeedingProcessing = 0;
      let totalPagesProcessed = 0;
      let currentlyProcessingPages: string[] = [];

      for (const source of agentSources as DatabaseSource[]) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          // FIXED: Only count completed crawled pages for processing
          const { data: pages } = await supabase
            .from('source_pages')
            .select('id, url, processing_status, status')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed'); // Only completed crawled pages

          if (pages && pages.length > 0) {
            const pendingPages = pages.filter(p => !p.processing_status || p.processing_status === 'pending');
            const processingPages = pages.filter(p => p.processing_status === 'processing');
            const processedPages = pages.filter(p => p.processing_status === 'processed');

            // FIXED: Only consider this source as needing training if there are unprocessed pages
            if (pendingPages.length > 0 || processingPages.length > 0) {
              sourcesNeedingTraining.push(source);
            }
            
            totalPagesNeedingProcessing += pages.length;
            totalPagesProcessed += processedPages.length;
            
            // Track currently processing pages
            currentlyProcessingPages.push(...processingPages.map(p => p.url || p.id));
          }
        } else {
          // For other sources, check processing status in metadata
          const hasContent = source.source_type === 'qa' ? 
            (metadata?.question && metadata?.answer) :
            source.content && source.content.trim().length > 0;

          if (hasContent && metadata.processing_status !== 'completed') {
            sourcesNeedingTraining.push(source);
            totalPagesNeedingProcessing += 1;
            
            if (metadata.processing_status === 'completed') {
              totalPagesProcessed += 1;
            } else if (metadata.processing_status === 'processing') {
              currentlyProcessingPages.push(source.title);
            }
          }
        }
      }

      // Calculate progress
      const progress = totalPagesNeedingProcessing > 0 ? 
        Math.round((totalPagesProcessed / totalPagesNeedingProcessing) * 100) : 100;

      // FIXED: Determine status more accurately
      let status: 'idle' | 'training' | 'completed' | 'failed' = 'idle';
      
      if (currentlyProcessingPages.length > 0) {
        status = 'training';
      } else if (sourcesNeedingTraining.length === 0 && totalPagesNeedingProcessing > 0) {
        // FIXED: Only mark as completed if we have processed some pages and nothing needs training
        status = 'completed';
      } else if (totalPagesProcessed > 0 && totalPagesProcessed < totalPagesNeedingProcessing) {
        status = 'training'; // Some processed, but not all
      }

      console.log('📊 Enhanced training progress calculation:', {
        sourcesNeedingTraining: sourcesNeedingTraining.length,
        totalPagesNeedingProcessing,
        totalPagesProcessed,
        currentlyProcessingPages,
        progress,
        status
      });

      // Update progress state
      const newProgress: TrainingProgress = {
        agentId,
        status,
        progress,
        totalSources: totalPagesNeedingProcessing,
        processedSources: totalPagesProcessed,
        currentlyProcessing: currentlyProcessingPages
      };

      setTrainingProgress(newProgress);

      // FIXED: Only show completion notification when actually complete (not during crawling)
      if (status === 'completed' && trainingProgress?.status !== 'completed' && totalPagesNeedingProcessing > 0) {
        console.log('🎉 Training completed! Showing success notification');
        
        toast({
          title: "Training Complete!",
          description: "Your AI agent is trained and ready",
          duration: 8000,
        });

        // Dispatch completion event for other components
        window.dispatchEvent(new CustomEvent('trainingCompleted', {
          detail: { agentId, progress: newProgress }
        }));
      }

    } catch (error) {
      console.error('Error in enhanced checkTrainingCompletion:', error);
      setTrainingProgress(prev => prev ? { ...prev, status: 'failed' } : null);
    }
  };

  const startTraining = async () => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting enhanced training for agent:', agentId);

      // Reset completion state
      setTrainingProgress(prev => prev ? { ...prev, status: 'idle' } : null);

      // Get sources that need training
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata, title, content')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) throw sourcesError;
      if (!agentSources || agentSources.length === 0) return;

      const sourcesToProcess = [];
      let totalPages = 0;

      // Calculate what needs processing
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
        totalSources: totalPages,
        processedSources: 0,
        currentlyProcessing: []
      });

      toast({
        title: "Training Started",
        description: `Processing ${totalPages} item${totalPages > 1 ? 's' : ''} for AI training...`,
        duration: 3000,
      });

      // Process sources
      const processingPromises = sourcesToProcess.map(async (source) => {
        return SourceProcessor.processSource(source);
      });

      await Promise.allSettled(processingPromises);

      // Check completion immediately after processing
      setTimeout(() => checkTrainingCompletion(agentId), 1000);

    } catch (error) {
      console.error('Failed to start enhanced training:', error);
      
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

  return {
    trainingProgress,
    startTraining: async () => {
      if (!agentId) return;
      await startTraining();
    },
    checkTrainingCompletion: () => agentId && checkTrainingCompletion(agentId),
    isConnected
  };
};
