
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Centralized real-time subscription for agent sources
// Invalidates both stats and paginated queries
export const useAgentSourcesRealtime = () => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!agentId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log(`🔄 Setting up enhanced real-time subscription for agent: ${agentId}`);

    const channel = supabase
      .channel(`agent-sources-enhanced-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          const sourceType = payload.new && typeof payload.new === 'object' && 'source_type' in payload.new 
            ? payload.new.source_type 
            : 'unknown';
          const crawlStatus = payload.new && typeof payload.new === 'object' && 'crawl_status' in payload.new
            ? payload.new.crawl_status
            : 'unknown';
          
          console.log('📡 Enhanced real-time source update:', {
            event: payload.eventType,
            sourceType,
            crawlStatus,
            sourceId: payload.new && typeof payload.new === 'object' && 'id' in payload.new ? payload.new.id : 'unknown'
          });
          
          // Invalidate stats query
          queryClient.invalidateQueries({ 
            queryKey: ['agent-source-stats', agentId] 
          });
          
          // Invalidate all paginated source queries for this agent
          queryClient.invalidateQueries({ 
            queryKey: ['sources-paginated', agentId] 
          });

          // For status updates, also trigger immediate refetch for better UX
          if (payload.eventType === 'UPDATE' && crawlStatus) {
            queryClient.refetchQueries({
              queryKey: ['sources-paginated', agentId, 'website']
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('🔌 Cleaning up enhanced real-time subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [agentId, queryClient]);
};
