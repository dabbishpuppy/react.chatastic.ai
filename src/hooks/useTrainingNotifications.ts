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
  const lastCompletedSessionIdRef = useRef<string>('');
  const lastCompletionCheckRef = useRef<number>(0);
  const pageLoadTimestampRef = useRef<number>(Date.now());
  const hasEverConnectedRef = useRef<boolean>(false);
  const completionToastShownForSessionRef = useRef<Set<string>>(new Set());
  const crawlInitiationInProgressRef = useRef<boolean>(false);
  const crawlInitiationStartTimeRef = useRef<number>(0);
  const trainingStartedSessionRef = useRef<string>('');
  const trainingFailedSessionRef = useRef<Set<string>>(new Set());
  
  // ALL useState calls MUST come after useRef calls
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Listen for crawl initiation events to suppress false connection warnings
  useEffect(() => {
    const handleCrawlStarted = () => {
      console.log('🚀 Crawl initiation detected - extending connection grace period');
      crawlInitiationInProgressRef.current = true;
      crawlInitiationStartTimeRef.current = Date.now();
      
      // Clear the flag after 45 seconds (extended grace period for crawls)
      setTimeout(() => {
        crawlInitiationInProgressRef.current = false;
        console.log('✅ Crawl initiation grace period ended');
      }, 45000);
    };

    const handleCrawlCompleted = () => {
      console.log('✅ Crawl completed - clearing initiation flags');
      crawlInitiationInProgressRef.current = false;
    };

    // Listen for custom crawl events
    window.addEventListener('crawlStarted', handleCrawlStarted);
    window.addEventListener('crawlCompleted', handleCrawlCompleted);
    
    return () => {
      window.removeEventListener('crawlStarted', handleCrawlStarted);
      window.removeEventListener('crawlCompleted', handleCrawlCompleted);
    };
  }, []);

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
            hasEverConnectedRef.current = true;
            if (pollInterval) clearInterval(pollInterval);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            setIsConnected(false);
            
            // Enhanced connection issue detection with crawl awareness
            const timeSincePageLoad = Date.now() - pageLoadTimestampRef.current;
            const timeSinceCrawlStart = Date.now() - crawlInitiationStartTimeRef.current;
            const isAfterPageLoadGracePeriod = timeSincePageLoad > 10000; // 10 seconds
            const isCrawlInitiationActive = crawlInitiationInProgressRef.current;
            const isCrawlRecentlyStarted = timeSinceCrawlStart < 45000; // 45 seconds
            
            // Only show connection issue toast if:
            // 1. We've had a successful connection before
            // 2. We're past the initial page load grace period
            // 3. No crawl initiation is in progress or recently started
            const shouldShowConnectionWarning = hasEverConnectedRef.current && 
              isAfterPageLoadGracePeriod && 
              !isCrawlInitiationActive && 
              !isCrawlRecentlyStarted;
            
            if (shouldShowConnectionWarning) {
              console.log('⚠️ Showing connection issue toast - not related to crawl initiation');
              toast({
                title: "Connection Issue",
                description: "Training updates may be delayed. We're working on it.",
                duration: 3000,
              });
            } else if (isCrawlInitiationActive || isCrawlRecentlyStarted) {
              console.log('🔄 Connection disruption during crawl initiation - suppressing warning toast');
            }
            
            pollInterval = setInterval(() => checkTrainingCompletion(agentId), 8000);
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

      // Fixed status determination logic: Only show 'training' when actively processing
      let status: 'idle' | 'training' | 'completed' | 'failed' = 'idle';
      
      if (currentlyProcessingPages.length > 0) {
        // Only set to 'training' when there are actively processing pages/sources
        status = 'training';
      } else if (sourcesNeedingTraining.length === 0 && totalPagesNeedingProcessing > 0) {
        // All content has been processed
        status = 'completed';
      } else {
        // Content exists but no active processing - keep as 'idle'
        status = 'idle';
      }

      // Create a unique session ID for this training session
      const sessionId = `${agentId}-${totalPagesNeedingProcessing}-${totalPagesProcessed}`;

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

      // Enhanced completion notification logic with strict duplicate prevention (Phase 4)
      if (status === 'completed' && 
          totalPagesNeedingProcessing > 0 &&
          totalPagesProcessed === totalPagesNeedingProcessing &&
          !completionToastShownForSessionRef.current.has(sessionId) &&
          lastCompletedSessionIdRef.current !== sessionId) {
        
        console.log('🎉 Training completed! Showing success notification for session:', sessionId);
        
        // Mark this session as completed
        completionToastShownForSessionRef.current.add(sessionId);
        lastCompletedSessionIdRef.current = sessionId;
        
        // Show training complete toast (Phase 4)
        toast({
          title: "Training Complete",
          description: "Your AI agent is trained and ready",
          duration: 5000,
        });

        window.dispatchEvent(new CustomEvent('trainingCompleted', {
          detail: { agentId, progress: newProgress }
        }));
        
        // Clean up old session IDs to prevent memory leaks (keep only last 5)
        if (completionToastShownForSessionRef.current.size > 5) {
          const sessionsArray = Array.from(completionToastShownForSessionRef.current);
          completionToastShownForSessionRef.current = new Set(sessionsArray.slice(-5));
        }
      }

      // Enhanced failure detection for training (Phase 4)
      if (status === 'failed' && !trainingFailedSessionRef.current.has(sessionId)) {
        console.log('❌ Training failed for session:', sessionId);
        
        trainingFailedSessionRef.current.add(sessionId);
        
        // Show training failed toast
        toast({
          title: "Training Failed",
          description: "Training process encountered an error. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
        
        // Clean up failed sessions (keep only last 5)
        if (trainingFailedSessionRef.current.size > 5) {
          const sessionsArray = Array.from(trainingFailedSessionRef.current);
          trainingFailedSessionRef.current = new Set(sessionsArray.slice(-5));
        }
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

      // Reset completion tracking for new training session
      hasShownCompletionNotificationRef.current = false;
      lastCompletedSessionIdRef.current = '';

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

      // Generate unique session ID for this training start
      const sessionId = `training-${agentId}-${Date.now()}`;
      trainingStartedSessionRef.current = sessionId;

      setTrainingProgress({
        agentId,
        status: 'training',
        progress: 0,
        totalSources: totalPages,
        processedSources: 0,
        currentlyProcessing: [],
        sessionId
      });

      // Show training started toast (Phase 3)
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
        // Show training failed toast
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
