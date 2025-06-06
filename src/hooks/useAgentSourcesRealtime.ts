
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Centralized real-time subscription with race condition prevention
export const useAgentSourcesRealtime = () => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!agentId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const debouncedRefresh = (eventType: string, delay: number = 1000) => {
      const now = Date.now();
      
      // Prevent too frequent updates
      if (now - lastUpdateRef.current < 500) {
        return;
      }
      
      lastUpdateRef.current = now;
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        // Only log important events
        if (eventType.includes('completed') || eventType.includes('inserted')) {
          console.log(`📡 Source update: ${eventType}`);
        }
        
        queryClient.refetchQueries({
          queryKey: ['agent-source-stats', agentId]
        });
        queryClient.refetchQueries({
          queryKey: ['agent-sources-paginated', agentId]
        });
      }, delay);
    };

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
          const crawlStatus = payload.new && typeof payload.new === 'object' && 'crawl_status' in payload.new
            ? payload.new.crawl_status
            : 'unknown';
          
          // Immediate refresh for important status changes
          if (payload.eventType === 'UPDATE' && crawlStatus === 'completed') {
            debouncedRefresh('source-completed', 100);
          } else if (payload.eventType === 'INSERT') {
            debouncedRefresh('source-inserted', 200);
          } else {
            debouncedRefresh('source-updated', 1000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages'
        },
        (payload) => {
          const pageStatus = payload.new && typeof payload.new === 'object' && 'status' in payload.new
            ? payload.new.status
            : 'unknown';
          
          // Immediate refresh for page completion
          if (payload.eventType === 'UPDATE' && pageStatus === 'completed') {
            debouncedRefresh('page-completed', 200);
          } else if (payload.eventType === 'INSERT') {
            debouncedRefresh('page-inserted', 300);
          } else {
            debouncedRefresh('page-updated', 1500);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [agentId, queryClient]);
};
