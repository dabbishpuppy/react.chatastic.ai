
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Centralized real-time subscription with better source filtering
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
        console.log(`📡 Real-time source update: ${eventType}`);
        
        queryClient.invalidateQueries({
          queryKey: ['agent-source-stats', agentId]
        });
        queryClient.invalidateQueries({
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
          console.log('📡 Agent source change:', payload.eventType, payload.new);
          
          // Handle different events with appropriate delays
          if (payload.eventType === 'INSERT') {
            // New source created - refresh immediately but gently
            debouncedRefresh('source-inserted', 500);
          } else if (payload.eventType === 'UPDATE') {
            const crawlStatus = payload.new && typeof payload.new === 'object' && 'crawl_status' in payload.new
              ? payload.new.crawl_status
              : 'unknown';
            
            if (crawlStatus === 'completed') {
              debouncedRefresh('source-completed', 200);
            } else {
              debouncedRefresh('source-updated', 1500);
            }
          } else if (payload.eventType === 'DELETE') {
            debouncedRefresh('source-deleted', 300);
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
          // Only refresh for significant page events
          const pageStatus = payload.new && typeof payload.new === 'object' && 'status' in payload.new
            ? payload.new.status
            : 'unknown';
          
          if (payload.eventType === 'UPDATE' && pageStatus === 'completed') {
            debouncedRefresh('page-completed', 1000);
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
