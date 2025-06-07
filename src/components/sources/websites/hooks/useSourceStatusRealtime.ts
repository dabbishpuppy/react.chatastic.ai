
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SimplifiedSourceStatusService } from '@/services/SimplifiedSourceStatusService';

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
  const [sourceData, setSourceData] = useState<any>(null);
  
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
      console.log('🎓 Training completed event received, refetching source data');
      
      // Refetch source data to get latest metadata
      if (sourceId) {
        supabase
          .from('agent_sources')
          .select('*')
          .eq('id', sourceId)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error('Error refetching source data:', error);
              return;
            }
            
            if (data) {
              console.log('Refetched source data after training:', data);
              setSourceData(data);
              const mappedStatus = SimplifiedSourceStatusService.getSourceStatus(data);
              setStatus(mappedStatus);
              setLastUpdateTime(new Date());
            }
          });
      }
    };

    // Listen for custom source status updates
    const handleSourceStatusUpdate = (event: CustomEvent) => {
      if (event.detail.sourceId === sourceId) {
        console.log('🔄 Custom source status update received:', event.detail);
        setSourceData(event.detail.source);
        const mappedStatus = SimplifiedSourceStatusService.getSourceStatus(event.detail.source);
        setStatus(mappedStatus);
        setLastUpdateTime(new Date());
      }
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    window.addEventListener('sourceStatusUpdate', handleSourceStatusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
      window.removeEventListener('sourceStatusUpdate', handleSourceStatusUpdate as EventListener);
    };
  }, [sourceId]);

  // Real-time subscription for source updates
  useEffect(() => {
    if (!sourceId) return;

    const fetchInitialData = async () => {
      try {
        const { data: source, error } = await supabase
          .from('agent_sources')
          .select('*')
          .eq('id', sourceId)
          .single();

        if (error) {
          console.error('Error fetching source data:', error);
          return;
        }

        if (source) {
          console.log('📋 Initial source data:', source);
          setSourceData(source);
          
          // Use SimplifiedSourceStatusService to determine proper status
          const mappedStatus = SimplifiedSourceStatusService.getSourceStatus(source);
          setStatus(mappedStatus);
          console.log(`🔄 Initial status mapped to ${mappedStatus} for source ${sourceId}`);
          
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
      .channel(`source-status-realtime-${sourceId}`)
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
          console.log('📡 Real-time update received in useSourceStatusRealtime:', updatedSource);
          
          setSourceData(updatedSource);
          
          // Use SimplifiedSourceStatusService to determine proper status
          const mappedStatus = SimplifiedSourceStatusService.getSourceStatus(updatedSource);
          setStatus(mappedStatus);
          console.log(`🔄 Real-time status mapped to ${mappedStatus} for source ${sourceId}`);
          
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
    lastUpdateTime,
    sourceData
  };
};
