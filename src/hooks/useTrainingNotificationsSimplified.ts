
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';

interface TrainingProgress {
  agentId: string;
  status: 'idle' | 'training' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
  currentlyProcessing?: string[];
  sessionId: string;
}

export const useTrainingNotificationsSimplified = () => {
  const { agentId } = useParams();
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Session-based deduplication
  const currentSessionRef = useRef<string>('');
  const shownToastsRef = useRef<Set<string>>(new Set());
  const lastToastTimeRef = useRef<number>(0);

  // Generate new session ID for training
  const startNewTrainingSession = () => {
    const sessionId = `training-${agentId}-${Date.now()}`;
    currentSessionRef.current = sessionId;
    shownToastsRef.current.clear(); // Clear previous session toasts
    console.log('🚀 Started new training session:', sessionId);
    return sessionId;
  };

  // Show toast with deduplication
  const showToast = (type: 'started' | 'completed' | 'failed', sessionId: string, customMessage?: string) => {
    const now = Date.now();
    const toastKey = `${sessionId}-${type}`;
    
    // Prevent duplicate toasts within 30 seconds
    if (shownToastsRef.current.has(toastKey) || (now - lastToastTimeRef.current < 30000 && type === 'started')) {
      console.log('🚫 Prevented duplicate toast:', toastKey);
      return;
    }

    shownToastsRef.current.add(toastKey);
    lastToastTimeRef.current = now;

    switch (type) {
      case 'started':
        toast({
          title: "Training Started",
          description: customMessage || "Processing sources for AI training...",
          duration: 3000,
        });
        break;
      case 'completed':
        toast({
          title: "Training Complete",
          description: customMessage || "Your AI agent is trained and ready",
          duration: 5000,
        });
        // Dispatch completion event for other components
        window.dispatchEvent(new CustomEvent('trainingCompleted', {
          detail: { agentId, sessionId }
        }));
        break;
      case 'failed':
        toast({
          title: "Training Failed",
          description: customMessage || "Training process encountered an error. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
        break;
    }
  };

  // Check training completion
  const checkTrainingCompletion = async (agentId: string) => {
    try {
      const { data: agentSources, error } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata, title, content, crawl_status')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error || !agentSources) {
        console.error('Error fetching agent sources:', error);
        return;
      }

      const sourcesNeedingTraining = [];
      let totalPagesNeedingProcessing = 0;
      let totalPagesProcessed = 0;
      let currentlyProcessingPages: string[] = [];
      let hasFailedSources = false;

      for (const source of agentSources) {
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
            const failedPages = pages.filter(p => p.processing_status === 'failed');

            if (failedPages.length > 0) hasFailedSources = true;
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

          if (hasContent) {
            if (metadata.processing_status === 'failed') hasFailedSources = true;
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

      const progress = totalPagesNeedingProcessing > 0 ? 
        Math.round((totalPagesProcessed / totalPagesNeedingProcessing) * 100) : 100;

      let status: 'idle' | 'training' | 'completed' | 'failed' = 'idle';
      
      if (hasFailedSources && sourcesNeedingTraining.length === 0) {
        status = 'failed';
      } else if (currentlyProcessingPages.length > 0) {
        status = 'training';
      } else if (sourcesNeedingTraining.length === 0 && totalPagesNeedingProcessing > 0) {
        status = 'completed';
      }

      const newProgress: TrainingProgress = {
        agentId,
        status,
        progress,
        totalSources: totalPagesNeedingProcessing,
        processedSources: totalPagesProcessed,
        currentlyProcessing: currentlyProcessingPages,
        sessionId: currentSessionRef.current || `fallback-${agentId}-${Date.now()}`
      };

      setTrainingProgress(newProgress);

      // Handle status transitions with proper session-based deduplication
      if (currentSessionRef.current) {
        if (status === 'training' && !shownToastsRef.current.has(`${currentSessionRef.current}-started`)) {
          showToast('started', currentSessionRef.current);
        } else if (status === 'completed' && !shownToastsRef.current.has(`${currentSessionRef.current}-completed`)) {
          showToast('completed', currentSessionRef.current);
        } else if (status === 'failed' && !shownToastsRef.current.has(`${currentSessionRef.current}-failed`)) {
          showToast('failed', currentSessionRef.current);
        }
      }

    } catch (error) {
      console.error('Error checking training completion:', error);
      if (currentSessionRef.current && !shownToastsRef.current.has(`${currentSessionRef.current}-failed`)) {
        showToast('failed', currentSessionRef.current);
      }
    }
  };

  // Start training manually
  const startTraining = async () => {
    if (!agentId) return null;

    const sessionId = startNewTrainingSession();
    
    try {
      console.log('🚀 Starting training for session:', sessionId);
      
      setTrainingProgress({
        agentId,
        status: 'training',
        progress: 0,
        totalSources: 0,
        processedSources: 0,
        sessionId
      });

      // Check completion after a delay to allow processing to start
      setTimeout(() => checkTrainingCompletion(agentId), 2000);
      
      return sessionId;
    } catch (error) {
      console.error('Failed to start training:', error);
      showToast('failed', sessionId, 'Failed to start training process');
      return null;
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!agentId) return;

    console.log('🔔 Setting up simplified training notifications for agent:', agentId);

    const channel = supabase
      .channel(`training-notifications-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_pages',
        },
        (payload) => {
          // Only check if we have an active training session
          if (currentSessionRef.current) {
            setTimeout(() => checkTrainingCompletion(agentId), 1000);
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
          // Only check if we have an active training session
          if (currentSessionRef.current) {
            setTimeout(() => checkTrainingCompletion(agentId), 1000);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  return {
    trainingProgress,
    startTraining,
    isConnected,
    startNewTrainingSession
  };
};
