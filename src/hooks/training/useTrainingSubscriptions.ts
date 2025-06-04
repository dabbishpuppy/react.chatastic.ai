
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SubscriptionState {
  isConnected: boolean;
  isInitialConnection: boolean;
  connectionAttempts: number;
}

export const useTrainingSubscriptions = (
  agentId: string,
  websiteSources: string[],
  onProgressUpdate: (agentId: string) => void
) => {
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    isConnected: false,
    isInitialConnection: true,
    connectionAttempts: 0
  });

  // Stabilize inputs to prevent subscription recreation
  const stableAgentId = useMemo(() => agentId, [agentId]);
  const stableWebsiteSources = useMemo(() => {
    const sorted = [...websiteSources].sort();
    return sorted.join(',');
  }, [websiteSources]);

  const stableOnProgressUpdate = useRef(onProgressUpdate);
  stableOnProgressUpdate.current = onProgressUpdate;

  // Debounce subscription updates
  const [subscriptionKey, setSubscriptionKey] = useState(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      setSubscriptionKey(prev => prev + 1);
    }, 1000); // 1 second debounce

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [stableWebsiteSources]);

  useEffect(() => {
    if (!stableAgentId) return;

    let pollInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;
    let connectionStable = false;
    let hasShownConnectionError = false;

    const setupRealtimeChannels = () => {
      const sourceIds = stableWebsiteSources ? stableWebsiteSources.split(',').filter(Boolean) : [];
      
      const channel = supabase
        .channel(`training-notifications-${stableAgentId}-${subscriptionKey}`)
        
        // Subscribe to processing_status changes
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'source_pages',
            filter: sourceIds.length > 0 ? `parent_source_id=in.(${sourceIds.join(',')})` : 'parent_source_id=eq.00000000-0000-0000-0000-000000000000'
          },
          (payload) => {
            const updatedPage = payload.new as any;
            const oldPage = payload.old as any;
            
            if (oldPage?.processing_status !== updatedPage?.processing_status) {
              setTimeout(() => stableOnProgressUpdate.current(stableAgentId), 200);
            }
          }
        )
        
        // Monitor agent_sources metadata updates
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'agent_sources',
            filter: `agent_id=eq.${stableAgentId}`
          },
          (payload) => {
            const updatedSource = payload.new as any;
            const oldSource = payload.old as any;
            const metadata = updatedSource.metadata || {};
            const oldMetadata = oldSource?.metadata || {};
            
            if (oldMetadata?.processing_status !== metadata?.processing_status) {
              setTimeout(() => stableOnProgressUpdate.current(stableAgentId), 200);
            }
          }
        )
        
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            connectionStable = true;
            setSubscriptionState(prev => ({
              ...prev,
              isConnected: true,
              isInitialConnection: false,
              connectionAttempts: 0
            }));
            
            if (pollInterval) clearInterval(pollInterval);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            const wasConnected = connectionStable;
            connectionStable = false;
            
            setSubscriptionState(prev => ({
              ...prev,
              isConnected: false,
              connectionAttempts: prev.connectionAttempts + 1
            }));
            
            // Only show error toast once per session and not during initial load
            if (wasConnected && !subscriptionState.isInitialConnection && !hasShownConnectionError) {
              hasShownConnectionError = true;
              reconnectTimeout = setTimeout(() => {
                toast({
                  title: "Connection Issue",
                  description: "Training updates may be delayed. We're working on it.",
                  duration: 3000,
                });
              }, 5000);
            }
            
            // Start polling as fallback
            if (!pollInterval) {
              pollInterval = setInterval(() => stableOnProgressUpdate.current(stableAgentId), 8000);
            }
          }
        });

      return () => {
        if (pollInterval) clearInterval(pollInterval);
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeChannels();

    return () => {
      cleanup();
      if (pollInterval) clearInterval(pollInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
  }, [stableAgentId, stableWebsiteSources, subscriptionKey, subscriptionState.isInitialConnection]);

  return subscriptionState;
};
