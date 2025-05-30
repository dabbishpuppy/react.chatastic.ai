
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

    console.log(`🔄 Setting up real-time subscription for agent: ${agentId}`);

    const channel = supabase
      .channel(`agent-sources-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('📡 Real-time source update:', payload.eventType, payload.new?.source_type);
          
          // Invalidate stats query
          queryClient.invalidateQueries({ 
            queryKey: ['agent-source-stats', agentId] 
          });
          
          // Invalidate all paginated source queries for this agent
          queryClient.invalidateQueries({ 
            queryKey: ['sources-paginated', agentId] 
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('🔌 Cleaning up real-time subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [agentId, queryClient]);
};
