
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseSourceStatusRealtimeProps {
  sourceId: string;
  initialStatus?: string;
}

export const useSourceStatusRealtime = ({ sourceId, initialStatus }: UseSourceStatusRealtimeProps) => {
  const [status, setStatus] = useState(initialStatus || 'pending');
  const [progress, setProgress] = useState(0);
  const [linksCount, setLinksCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  
  const statusRef = useRef(status);
  const progressRef = useRef(progress);
  const linksCountRef = useRef(linksCount);

  // Update refs when state changes
  useEffect(() => {
    statusRef.current = status;
    progressRef.current = progress;
    linksCountRef.current = linksCount;
  }, [status, progress, linksCount]);

  // Listen for training completion events
  useEffect(() => {
    const handleTrainingCompleted = (event: CustomEvent) => {
      console.log('🎓 Training completed event received, updating source status to trained');
      setStatus('trained');
      setLastUpdateTime(new Date());
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    
    return () => {
      window.removeEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    };
  }, []);

  // Real-time subscription for source updates
  useEffect(() => {
    if (!sourceId) return;

    const fetchInitialData = async () => {
      try {
        const { data: source, error } = await supabase
          .from('agent_sources')
          .select('crawl_status, progress, links_count, metadata')
          .eq('id', sourceId)
          .single();

        if (error) {
          console.error('Error fetching source data:', error);
          return;
        }

        if (source) {
          console.log('📋 Initial source data:', source);
          
          // Check if this source has been trained by looking at metadata
          const metadata = source.metadata as Record<string, any> || {};
          const hasTrainingCompleted = metadata.training_completed || metadata.last_trained_at;
          
          if (hasTrainingCompleted && source.crawl_status === 'ready_for_training') {
            setStatus('trained');
          } else {
            // Map the crawl_status properly including new states
            const mappedStatus = mapCrawlStatus(source.crawl_status, metadata);
            setStatus(mappedStatus);
            console.log(`🔄 Status mapped from ${source.crawl_status} to ${mappedStatus}`);
          }
          
          setProgress(source.progress || 0);
          setLinksCount(source.links_count || 0);
          setLastUpdateTime(new Date());
        }
      } catch (error) {
        console.error('Error in fetchInitialData:', error);
      }
    };

    fetchInitialData();

    const channel = supabase
      .channel(`source-status-${sourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sources',
          filter: `id=eq.${sourceId}`
        },
        (payload) => {
          const updatedSource = payload.new as any;
          console.log('📡 Real-time update received:', updatedSource);
          
          // Check if training has completed for this source
          const metadata = updatedSource.metadata as Record<string, any> || {};
          const hasTrainingCompleted = metadata.training_completed || metadata.last_trained_at;
          
          if (hasTrainingCompleted && updatedSource.crawl_status === 'ready_for_training') {
            setStatus('trained');
          } else {
            // Map the crawl_status properly including new states
            const mappedStatus = mapCrawlStatus(updatedSource.crawl_status, metadata);
            setStatus(mappedStatus);
            console.log(`🔄 Real-time status mapped from ${updatedSource.crawl_status} to ${mappedStatus}`);
          }
          
          setProgress(updatedSource.progress || 0);
          setLinksCount(updatedSource.links_count || 0);
          setLastUpdateTime(new Date());
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log(`📡 Subscribed to real-time updates for source: ${sourceId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setIsConnected(false);
          console.log(`📡 Real-time connection issue for source: ${sourceId}, status: ${status}`);
        }
      });

    return () => {
      console.log(`📡 Cleaning up real-time subscription for source: ${sourceId}`);
      supabase.removeChannel(channel);
    };
  }, [sourceId]);

  return {
    status,
    progress,
    linksCount,
    isConnected,
    lastUpdateTime
  };
};

// Helper function to map crawl_status to display status
const mapCrawlStatus = (crawlStatus: string, metadata: Record<string, any> = {}): string => {
  // Check for recrawling state first
  if (metadata.is_recrawling === true && crawlStatus === 'recrawling') {
    console.log('🔄 Detected recrawling state from metadata');
    return 'recrawling';
  }
  
  switch (crawlStatus) {
    case 'pending':
      return 'pending';
    case 'in_progress':
      return 'in_progress';
    case 'recrawling':
      return 'recrawling';
    case 'completed':
      return 'ready_for_training'; // Map completed to ready_for_training
    case 'ready_for_training':
      return 'ready_for_training';
    case 'failed':
      return 'failed';
    default:
      return crawlStatus || 'pending'; // Default to pending instead of unknown
  }
};
