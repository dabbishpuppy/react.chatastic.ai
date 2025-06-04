
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CrawlStatusData {
  status: string;
  completedPages: number;
  totalPages: number;
  failedPages: number;
  lastUpdated: Date;
  isConnected: boolean;
}

export const useRobustCrawlStatus = (parentSourceId: string) => {
  const [statusData, setStatusData] = useState<CrawlStatusData>({
    status: 'unknown',
    completedPages: 0,
    totalPages: 0,
    failedPages: 0,
    lastUpdated: new Date(),
    isConnected: false
  });
  
  const [isPolling, setIsPolling] = useState(false);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>(null);
  const maxRetries = 3;

  // Direct database status check
  const fetchStatus = useCallback(async () => {
    if (!parentSourceId) return;

    try {
      // Get source status
      const { data: sourceData, error: sourceError } = await supabase
        .from('agent_sources')
        .select('crawl_status, links_count, metadata')
        .eq('id', parentSourceId)
        .single();

      if (sourceError) {
        console.error('Error fetching source status:', sourceError);
        return;
      }

      // Get page counts
      const { data: pageData, error: pageError } = await supabase
        .from('source_pages')
        .select('status')
        .eq('parent_source_id', parentSourceId);

      if (pageError) {
        console.error('Error fetching page data:', pageError);
        return;
      }

      const completedPages = pageData?.filter(p => p.status === 'completed').length || 0;
      const failedPages = pageData?.filter(p => p.status === 'failed').length || 0;
      const totalPages = pageData?.length || 0;

      setStatusData(prev => ({
        ...prev,
        status: sourceData.crawl_status || 'unknown',
        completedPages,
        totalPages,
        failedPages,
        lastUpdated: new Date()
      }));

      console.log('📊 Status fetched directly:', {
        status: sourceData.crawl_status,
        completedPages,
        totalPages,
        failedPages
      });

    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  }, [parentSourceId]);

  // Start polling fallback
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    
    setIsPolling(true);
    console.log('🔄 Starting status polling fallback');
    
    // Initial fetch
    fetchStatus();
    
    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(fetchStatus, 3000);
  }, [fetchStatus]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = undefined;
    }
    setIsPolling(false);
    console.log('⏹️ Stopped status polling');
  }, []);

  // Manual refresh
  const refreshStatus = useCallback(async () => {
    console.log('🔄 Manual status refresh requested');
    await fetchStatus();
    toast({
      title: "Status Refreshed",
      description: `Updated at ${new Date().toLocaleTimeString()}`,
      duration: 2000,
    });
  }, [fetchStatus]);

  // Setup real-time subscription with fallback
  const setupRealTimeSubscription = useCallback(() => {
    if (!parentSourceId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log(`📡 Attempting real-time connection (attempt ${connectionRetries + 1}/${maxRetries})`);

    const channel = supabase
      .channel(`crawl-status-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('📡 Real-time source update:', payload);
          fetchStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('📡 Real-time page update:', payload);
          fetchStatus();
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setStatusData(prev => ({ ...prev, isConnected: true }));
          setConnectionRetries(0);
          stopPolling();
          console.log('✅ Real-time connection established');
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setStatusData(prev => ({ ...prev, isConnected: false }));
          
          if (connectionRetries < maxRetries) {
            setConnectionRetries(prev => prev + 1);
            console.log(`❌ Real-time connection failed, retrying in ${Math.pow(2, connectionRetries)} seconds...`);
            
            setTimeout(() => {
              setupRealTimeSubscription();
            }, Math.pow(2, connectionRetries) * 1000);
          } else {
            console.log('❌ Real-time connection failed permanently, falling back to polling');
            startPolling();
            toast({
              title: "Connection Issue",
              description: "Using backup status checking. Click refresh for latest updates.",
              duration: 5000,
            });
          }
        }
      });

    channelRef.current = channel;
  }, [parentSourceId, connectionRetries, fetchStatus, startPolling, stopPolling]);

  // Initialize
  useEffect(() => {
    if (!parentSourceId) return;

    // Initial status fetch
    fetchStatus();
    
    // Try real-time first
    setupRealTimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      stopPolling();
    };
  }, [parentSourceId, fetchStatus, setupRealTimeSubscription, stopPolling]);

  return {
    statusData,
    isPolling,
    refreshStatus,
    isConnected: statusData.isConnected
  };
};
