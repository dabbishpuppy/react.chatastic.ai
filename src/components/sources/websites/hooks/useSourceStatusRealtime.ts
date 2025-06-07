
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SimplifiedSourceStatusService } from '@/services/SimplifiedSourceStatusService';
import { fetchMaybeSingle, handleSupabaseError } from '@/utils/safeSupabaseQueries';
import { ProductionErrorMonitor } from '@/utils/productionErrorMonitoring';
import { AgentSource } from '@/types/rag';

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
  const [sourceData, setSourceData] = useState<AgentSource | null>(null);
  
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
        fetchMaybeSingle<AgentSource>(
          supabase
            .from('agent_sources')
            .select('*')
            .eq('id', sourceId),
          `trainingCompleted(${sourceId})`
        ).then((data) => {
          if (data) {
            console.log('Refetched source data after training:', data);
            setSourceData(data);
            const mappedStatus = SimplifiedSourceStatusService.getSourceStatus(data);
            setStatus(mappedStatus);
            setLastUpdateTime(new Date());
          }
        }).catch((error) => {
          ProductionErrorMonitor.trackError(error, 'trainingCompleted');
        });
      }
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    
    return () => {
      window.removeEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    };
  }, [sourceId]);

  // Real-time subscription for source updates
  useEffect(() => {
    if (!sourceId) return;

    // Validate that sourceId looks like a valid UUID for agent_sources table
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sourceId)) {
      console.warn('Invalid sourceId format for agent_sources query:', sourceId);
      return;
    }

    const fetchInitialData = async () => {
      try {
        const source = await fetchMaybeSingle<AgentSource>(
          supabase
            .from('agent_sources')
            .select('*')
            .eq('id', sourceId),
          `useSourceStatusRealtime(${sourceId})`
        );

        if (source) {
          console.log('📋 Initial source data:', source);
          setSourceData(source);
          
          // Use SimplifiedSourceStatusService to determine proper status
          const mappedStatus = SimplifiedSourceStatusService.getSourceStatus(source);
          setStatus(mappedStatus);
          console.log(`🔄 Status mapped to ${mappedStatus}`);
          
          setProgress(source.progress || 0);
          setLinksCount(source.links_count || 0);
          setLastUpdateTime(new Date());
        } else {
          console.warn(`Source ${sourceId} not found - may have been deleted`);
          setStatus('not_found');
        }
      } catch (error) {
        ProductionErrorMonitor.trackError(error, 'useSourceStatusRealtime.fetchInitialData');
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
          const updatedSource = payload.new as AgentSource;
          console.log('📡 Real-time update received:', updatedSource);
          
          setSourceData(updatedSource);
          
          // Use SimplifiedSourceStatusService to determine proper status
          const mappedStatus = SimplifiedSourceStatusService.getSourceStatus(updatedSource);
          setStatus(mappedStatus);
          console.log(`🔄 Real-time status mapped to ${mappedStatus}`);
          
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
