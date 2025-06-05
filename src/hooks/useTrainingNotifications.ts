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
  
  // Enhanced tracking refs for better toast management
  const activeTrainingSessionRef = useRef<string | null>(null);
  const trainingLockRef = useRef<boolean>(false);
  const lastStatusUpdateTimeRef = useRef<number>(0);
  const stableSessionIdRef = useRef<string>('');
  const trainingStartToastShownRef = useRef<Set<string>>(new Set());
  const lastCompletionNotificationTimeRef = useRef<number>(0);
  const completionConfirmationCountRef = useRef<number>(0);
  const trainingInitiationTimeRef = useRef<number>(0);
  
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
              // Reduce frequency of completion checks during real-time updates
              setTimeout(() => checkTrainingCompletion(agentId, false), 500);
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
              // Reduce frequency of completion checks during real-time updates
              setTimeout(() => checkTrainingCompletion(agentId, false), 500);
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
            setTimeout(() => checkTrainingCompletion(agentId, false), 1000);
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
            
            // Reduced polling frequency to prevent spam
            pollInterval = setInterval(() => checkTrainingCompletion(agentId, false), 12000);
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

  const checkTrainingCompletion = async (agentId: string, allowAutoStart: boolean = false) => {
    try {
      const now = Date.now();
      
      // Enhanced debouncing with stricter limits during training
      const debounceTime = trainingLockRef.current ? 5000 : 3000;
      if (now - lastCompletionCheckRef.current < debounceTime) {
        return;
      }
      lastCompletionCheckRef.current = now;
      
      // If training is locked and status update is too frequent, skip
      if (trainingLockRef.current && now - lastStatusUpdateTimeRef.current < 8000) {
        console.log('🔒 Training locked, skipping frequent status update');
        return;
      }
      lastStatusUpdateTimeRef.current = now;
      
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
      let hasFailedSources = false;

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
            const failedPages = pages.filter(p => p.processing_status === 'failed');

            if (failedPages.length > 0) {
              hasFailedSources = true;
            }

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
            if (metadata.processing_status === 'failed') {
              hasFailedSources = true;
            }
            
            if (metadata.processing_status !== 'completed') {
              sourcesNeedingTraining.push(source);
              totalPagesNeedingProcessing += 1;
              
              if (metadata.processing_status === 'completed') {
                totalPagesProcessed += 1;
              } else if (metadata.processing_status === 'processing') {
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

      // Enhanced status determination with training lock awareness
      let status: 'idle' | 'training' | 'completed' | 'failed' = 'idle';
      
      // If training is locked, only allow transition to completed or failed
      if (trainingLockRef.current) {
        if (hasFailedSources && sourcesNeedingTraining.length === 0) {
          status = 'failed';
          trainingLockRef.current = false; // Release lock on failure
        } else if (currentlyProcessingPages.length > 0) {
          status = 'training'; // Keep training status
        } else if (sourcesNeedingTraining.length === 0 && totalPagesNeedingProcessing > 0) {
          status = 'completed';
          trainingLockRef.current = false; // Release lock on completion
        } else {
          status = 'training'; // Keep training until completion
        }
      } else {
        // Normal status determination when not locked
        if (hasFailedSources && sourcesNeedingTraining.length === 0) {
          status = 'failed';
        } else if (currentlyProcessingPages.length > 0) {
          status = 'training';
        } else if (sourcesNeedingTraining.length === 0 && totalPagesNeedingProcessing > 0) {
          status = 'completed';
        } else {
          status = 'idle';
        }
      }

      // Use stable session ID when training is active
      let sessionId: string;
      if (status === 'training' && stableSessionIdRef.current) {
        sessionId = stableSessionIdRef.current;
      } else if (status === 'training' && !stableSessionIdRef.current) {
        sessionId = `${agentId}-${Date.now()}`;
        stableSessionIdRef.current = sessionId;
      } else if (status === 'completed' || status === 'failed') {
        sessionId = stableSessionIdRef.current || `${agentId}-${Date.now()}`;
        // Clear stable session ID after completion/failure
        setTimeout(() => {
          stableSessionIdRef.current = '';
        }, 2000);
      } else {
        sessionId = `${agentId}-${totalPagesNeedingProcessing}-${totalPagesProcessed}`;
      }

      const newProgress: TrainingProgress = {
        agentId,
        status,
        progress,
        totalSources: totalPagesNeedingProcessing,
        processedSources: totalPagesProcessed,
        currentlyProcessing: currentlyProcessingPages,
        sessionId
      };

      console.log('📊 Training status update:', {
        status,
        sessionId,
        trainingLocked: trainingLockRef.current,
        stableSessionId: stableSessionIdRef.current
      });

      setTrainingProgress(newProgress);

      // Enhanced completion notification logic with strict duplicate prevention
      if (status === 'completed' && 
          totalPagesNeedingProcessing > 0 &&
          totalPagesProcessed === totalPagesNeedingProcessing &&
          !completionToastShownForSessionRef.current.has(sessionId) &&
          lastCompletedSessionIdRef.current !== sessionId) {
        
        // Additional confirmation to prevent false positives
        completionConfirmationCountRef.current += 1;
        
        // Only show toast after at least 2 confirmations and minimum time gap
        const timeSinceLastNotification = now - lastCompletionNotificationTimeRef.current;
        if (completionConfirmationCountRef.current >= 2 && timeSinceLastNotification > 10000) {
          console.log('🎉 Training completed! Showing success notification for session:', sessionId);
          
          // Mark this session as completed
          completionToastShownForSessionRef.current.add(sessionId);
          lastCompletedSessionIdRef.current = sessionId;
          lastCompletionNotificationTimeRef.current = now;
          completionConfirmationCountRef.current = 0; // Reset confirmation counter
          
          // Show training complete toast
          toast({
            title: "Training Complete",
            description: "Your AI agent is trained and ready",
            duration: 5000,
          });

          window.dispatchEvent(new CustomEvent('trainingCompleted', {
            detail: { agentId, progress: newProgress }
          }));
          
          // Clean up old session IDs to prevent memory leaks (keep only last 3)
          if (completionToastShownForSessionRef.current.size > 3) {
            const sessionsArray = Array.from(completionToastShownForSessionRef.current);
            completionToastShownForSessionRef.current = new Set(sessionsArray.slice(-3));
          }
        }
      } else if (status !== 'completed') {
        // Reset confirmation counter if status changes
        completionConfirmationCountRef.current = 0;
      }

      // Enhanced failure detection for training
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
        
        // Clean up failed sessions (keep only last 3)
        if (trainingFailedSessionRef.current.size > 3) {
          const sessionsArray = Array.from(trainingFailedSessionRef.current);
          trainingFailedSessionRef.current = new Set(sessionsArray.slice(-3));
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

      // Set training initiation time for delayed toast
      trainingInitiationTimeRef.current = Date.now();

      // Set training lock and create stable session ID
      trainingLockRef.current = true;
      const sessionId = `training-${agentId}-${Date.now()}`;
      stableSessionIdRef.current = sessionId;
      activeTrainingSessionRef.current = sessionId;

      // Reset completion tracking for new training session
      hasShownCompletionNotificationRef.current = false;
      lastCompletedSessionIdRef.current = '';
      completionConfirmationCountRef.current = 0;

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
        // Release training lock if no sources to process
        trainingLockRef.current = false;
        stableSessionIdRef.current = '';
        activeTrainingSessionRef.current = null;
        
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
        currentlyProcessing: [],
        sessionId
      });

      // Delayed "Training Started" toast - only show after confirming training is proceeding
      setTimeout(() => {
        // Only show if training is still active and hasn't been shown for this session
        if (trainingLockRef.current && 
            activeTrainingSessionRef.current === sessionId && 
            !trainingStartToastShownRef.current.has(sessionId)) {
          
          trainingStartToastShownRef.current.add(sessionId);
          
          toast({
            title: "Training Started",
            description: `Processing ${totalPages} item${totalPages > 1 ? 's' : ''} for AI training...`,
            duration: 3000,
          });
          
          // Clean up old start toast sessions (keep only last 3)
          if (trainingStartToastShownRef.current.size > 3) {
            const sessionsArray = Array.from(trainingStartToastShownRef.current);
            trainingStartToastShownRef.current = new Set(sessionsArray.slice(-3));
          }
        }
      }, 2000); // 2 second delay to ensure training is actually proceeding

      const processingPromises = sourcesToProcess.map(async (source) => {
        return SourceProcessor.processSource(source);
      });

      await Promise.allSettled(processingPromises);

      setTimeout(() => checkTrainingCompletion(agentId, true), 2000);

    } catch (error) {
      console.error('Failed to start enhanced training:', error);
      
      // Release training lock on error
      trainingLockRef.current = false;
      stableSessionIdRef.current = '';
      activeTrainingSessionRef.current = null;
      
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
    checkTrainingCompletion: () => agentId && checkTrainingCompletion(agentId, true),
    isConnected
  };
};
