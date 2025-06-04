
import { useEffect, useState, useRef } from 'react';
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
  sessionId?: string;
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
  
  // ALL useRef calls MUST be at the top to maintain consistent hook order
  const hasShownCompletionNotificationRef = useRef<boolean>(false);
  const currentSessionIdRef = useRef<string>('');
  const lastCompletionCheckRef = useRef<number>(0);
  
  // ALL useState calls MUST come after useRef calls
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // ALL useEffect calls MUST come after useState calls
  useEffect(() => {
    if (!agentId) return;

    console.log('🔔 Setting up enhanced training notifications for agent:', agentId);

    let pollInterval: NodeJS.Timeout;
    let websiteSources: string[] = [];

    const initializeSubscriptions = async () => {
      try {
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
            
            if (oldPage?.processing_status !== updatedPage?.processing_status) {
              setTimeout(() => checkTrainingCompletion(agentId), 100);
            }
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
            const oldSource = payload.old as any;
            const metadata = updatedSource.metadata || {};
            const oldMetadata = oldSource?.metadata || {};
            
            if (oldMetadata?.processing_status !== metadata?.processing_status) {
              setTimeout(() => checkTrainingCompletion(agentId), 100);
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
            setTrainingProgress(prev => prev ? { ...prev, status: 'idle' } : null);
            
            if ((payload.new as any)?.source_type === 'website') {
              setTimeout(initializeSubscriptions, 500);
            }
            setTimeout(() => checkTrainingCompletion(agentId), 1000);
          }
        )
        
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            if (pollInterval) clearInterval(pollInterval);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            setIsConnected(false);
            pollInterval = setInterval(() => checkTrainingCompletion(agentId), 8000);
            
            toast({
              title: "Connection Issue",
              description: "Training updates may be delayed. We're working on it.",
              duration: 3000,
            });
          }
        });

      return () => {
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
      const now = Date.now();
      if (now - lastCompletionCheckRef.current < 2000) {
        return;
      }
      lastCompletionCheckRef.current = now;
      
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

      for (const source of agentSources as DatabaseSource[]) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          const { data: pages } = await supabase
            .from('source_pages')
            .select('id, url, processing_status, status')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          if (pages && pages.length > 0) {
            const pendingPages = pages.filter(p => !p.processing_status || p.processing_status === 'pending');
            const processingPages = pages.filter(p => p.processing_status === 'processing');
            const processedPages = pages.filter(p => p.processing_status === 'processed');

            if (pendingPages.length > 0 || processingPages.length > 0) {
              sourcesNeedingTraining.push(source);
            }
            
            totalPagesNeedingProcessing += pages.length;
            totalPagesProcessed += processedPages.length;
            
            currentlyProcessingPages.push(...processingPages.map(p => p.url || p.id));
          }
        } else {
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

      const progress = totalPagesNeedingProcessing > 0 ? 
        Math.round((totalPagesProcessed / totalPagesNeedingProcessing) * 100) : 100;

      let status: 'idle' | 'training' | 'completed' | 'failed' = 'idle';
      
      if (currentlyProcessingPages.length > 0) {
        status = 'training';
      } else if (sourcesNeedingTraining.length === 0 && totalPagesNeedingProcessing > 0) {
        status = 'completed';
      } else if (totalPagesProcessed > 0 && totalPagesProcessed < totalPagesNeedingProcessing) {
        status = 'training';
      }

      const sessionId = `${agentId}-${totalPagesNeedingProcessing}-${Date.now()}`;

      const newProgress: TrainingProgress = {
        agentId,
        status,
        progress,
        totalSources: totalPagesNeedingProcessing,
        processedSources: totalPagesProcessed,
        currentlyProcessing: currentlyProcessingPages,
        sessionId
      };

      setTrainingProgress(newProgress);

      // Handle completion notification with strict guards
      if (status === 'completed' && 
          trainingProgress?.status !== 'completed' && 
          totalPagesNeedingProcessing > 0 &&
          !hasShownCompletionNotificationRef.current &&
          currentSessionIdRef.current !== sessionId) {
        
        console.log('🎉 Training completed! Showing success notification');
        
        hasShownCompletionNotificationRef.current = true;
        currentSessionIdRef.current = sessionId;
        
        toast({
          title: "Training Complete!",
          description: "Your AI agent is trained and ready",
          duration: 5000,
        });

        window.dispatchEvent(new CustomEvent('trainingCompleted', {
          detail: { agentId, progress: newProgress }
        }));
        
        setTimeout(() => {
          hasShownCompletionNotificationRef.current = false;
        }, 10000);
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

      hasShownCompletionNotificationRef.current = false;
      currentSessionIdRef.current = '';

      setTrainingProgress(prev => prev ? { ...prev, status: 'idle' } : null);

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
        setTrainingProgress({
          agentId,
          status: 'completed',
          progress: 100,
          totalSources: 0,
          processedSources: 0
        });
        return;
      }

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

      const processingPromises = sourcesToProcess.map(async (source) => {
        return SourceProcessor.processSource(source);
      });

      await Promise.allSettled(processingPromises);

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
