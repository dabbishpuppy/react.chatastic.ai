
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SimplifiedSourceStatusService } from '@/services/SimplifiedSourceStatusService';

interface UseSourceStatusRealtimeOptions {
  sourceId: string;
  initialStatus?: string;
}

interface SourceStatusData {
  status: string;
  progress: number;
  linksCount: number;
  isConnected: boolean;
  sourceData: any;
}

export const useSourceStatusRealtime = ({
  sourceId,
  initialStatus = 'pending'
}: UseSourceStatusRealtimeOptions): SourceStatusData => {
  const [sourceData, setSourceData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!sourceId) return;

    console.log(`📡 Setting up real-time status for source: ${sourceId}`);

    // Fetch initial source data
    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase
          .from('agent_sources')
          .select('*')
          .eq('id', sourceId)
          .single();

        if (error) {
          console.error('❌ Error fetching initial source data:', error);
          return;
        }

        if (data) {
          console.log('📊 Initial source data:', data);
          setSourceData(data);
        }
      } catch (error) {
        console.error('❌ Error in fetchInitialData:', error);
      }
    };

    fetchInitialData();

    // Set up real-time subscription
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
          console.log('📡 Real-time source update:', payload.new);
          setSourceData(payload.new);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for ${sourceId}:`, status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log(`🔌 Cleaning up subscription for source: ${sourceId}`);
      supabase.removeChannel(channel);
    };
  }, [sourceId]);

  // Compute derived values
  const status = sourceData ? SimplifiedSourceStatusService.getSourceStatus(sourceData) : initialStatus;
  const progress = sourceData?.progress || 0;
  const linksCount = sourceData?.links_count || sourceData?.total_jobs || 0;

  return {
    status,
    progress,
    linksCount,
    isConnected,
    sourceData
  };
};
