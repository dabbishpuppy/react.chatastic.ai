
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!agentId) return;

    console.log('🔔 Setting up training subscriptions for agent:', agentId);

    let pollInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;

    const setupRealtimeChannels = () => {
      const channel = supabase
        .channel(`training-notifications-${agentId}`)
        
        // Subscribe to processing_status changes
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
              console.log('📡 Page processing status change:', {
                pageId: updatedPage.id,
                url: updatedPage.url,
                oldProcessingStatus: oldPage?.processing_status,
                newProcessingStatus: updatedPage.processing_status
              });

              setTimeout(() => onProgressUpdate(agentId), 100);
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
              console.log('📡 Source metadata processing update:', {
                sourceId: updatedSource.id,
                sourceType: updatedSource.source_type,
                oldStatus: oldMetadata?.processing_status,
                newStatus: metadata.processing_status
              });

              setTimeout(() => onProgressUpdate(agentId), 100);
            }
          }
        )
        
        .subscribe((status) => {
          console.log('📡 Training subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            setSubscriptionState(prev => ({
              ...prev,
              isConnected: true,
              isInitialConnection: false,
              connectionAttempts: 0
            }));
            
            if (pollInterval) clearInterval(pollInterval);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            const wasConnected = subscriptionState.isConnected;
            
            setSubscriptionState(prev => ({
              ...prev,
              isConnected: false,
              connectionAttempts: prev.connectionAttempts + 1
            }));
            
            if (!subscriptionState.isInitialConnection && wasConnected) {
              console.warn('📡 Connection lost, attempting to reconnect...');
              
              reconnectTimeout = setTimeout(() => {
                if (!subscriptionState.isConnected && subscriptionState.connectionAttempts >= 2) {
                  toast({
                    title: "Connection Issue",
                    description: "Training updates may be delayed. We're working on it.",
                    duration: 3000,
                  });
                }
              }, 2000);
            }
            
            if (!pollInterval) {
              pollInterval = setInterval(() => onProgressUpdate(agentId), 5000);
            }
          }
        });

      return () => {
        console.log('🔌 Cleaning up training subscriptions');
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
  }, [agentId, websiteSources.join(','), onProgressUpdate]);

  return subscriptionState;
};
