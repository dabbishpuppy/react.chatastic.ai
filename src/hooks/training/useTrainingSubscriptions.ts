
import { useEffect, useState, useMemo, useCallback } from 'react';
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

  // Stabilize websiteSources array to prevent unnecessary subscription recreation
  const stableWebsiteSources = useMemo(() => websiteSources, [websiteSources.join(',')]);

  // Stabilize the progress update callback
  const stableOnProgressUpdate = useCallback(
    (targetAgentId: string) => {
      onProgressUpdate(targetAgentId);
    },
    [onProgressUpdate]
  );

  // Debounce subscription updates to prevent rapid recreation
  const [subscriptionKey, setSubscriptionKey] = useState(0);

  useEffect(() => {
    if (!agentId) return;

    // Only log essential setup information
    console.log('🔔 Setting up training subscriptions for agent:', agentId);

    let pollInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;
    let connectionStable = false;

    const setupRealtimeChannels = () => {
      const channel = supabase
        .channel(`training-notifications-${agentId}-${subscriptionKey}`)
        
        // Subscribe to processing_status changes
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'source_pages',
            filter: stableWebsiteSources.length > 0 ? `parent_source_id=in.(${stableWebsiteSources.join(',')})` : 'parent_source_id=eq.00000000-0000-0000-0000-000000000000'
          },
          (payload) => {
            const updatedPage = payload.new as any;
            const oldPage = payload.old as any;
            
            if (oldPage?.processing_status !== updatedPage?.processing_status) {
              // Only log significant status changes
              if (updatedPage.processing_status === 'processed' || updatedPage.processing_status === 'processing') {
                console.log('📄 Page processing update:', updatedPage.url, '→', updatedPage.processing_status);
              }
              
              setTimeout(() => stableOnProgressUpdate(agentId), 100);
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
            filter: `agent_id=eq.${agentId}`
          },
          (payload) => {
            const updatedSource = payload.new as any;
            const oldSource = payload.old as any;
            const metadata = updatedSource.metadata || {};
            const oldMetadata = oldSource?.metadata || {};
            
            if (oldMetadata?.processing_status !== metadata?.processing_status) {
              // Only log processing completion
              if (metadata.processing_status === 'completed') {
                console.log('✅ Source processing completed:', updatedSource.source_type);
              }
              
              setTimeout(() => stableOnProgressUpdate(agentId), 100);
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
            
            // Only show error toast if we had a stable connection and this isn't the initial load
            if (wasConnected && !subscriptionState.isInitialConnection) {
              console.warn('📡 Training subscription connection lost');
              
              reconnectTimeout = setTimeout(() => {
                if (!connectionStable && subscriptionState.connectionAttempts >= 2) {
                  toast({
                    title: "Connection Issue",
                    description: "Training updates may be delayed. We're working on it.",
                    duration: 3000,
                  });
                }
              }, 3000); // Increased delay to prevent showing during normal startup
            }
            
            // Start polling as fallback
            if (!pollInterval) {
              pollInterval = setInterval(() => stableOnProgressUpdate(agentId), 5000);
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
    };
  }, [agentId, stableWebsiteSources, stableOnProgressUpdate, subscriptionKey]);

  // Trigger subscription recreation when sources change significantly
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSubscriptionKey(prev => prev + 1);
    }, 500); // Debounce subscription recreation

    return () => clearTimeout(timeoutId);
  }, [stableWebsiteSources]);

  return subscriptionState;
};
