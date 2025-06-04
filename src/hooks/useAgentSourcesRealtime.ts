
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

    console.log(`🔄 Setting up debounced real-time subscription for agent: ${agentId}`);

    const debouncedRefresh = (eventType: string, delay: number = 500) => {
      const now = Date.now();
      
      // Prevent too frequent updates
      if (now - lastUpdateRef.current < 200) {
        return;
      }
      
      lastUpdateRef.current = now;
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        console.log(`📡 Executing debounced refresh for: ${eventType}`);
        
        queryClient.refetchQueries({
          queryKey: ['agent-source-stats', agentId]
        });
        queryClient.refetchQueries({
          queryKey: ['agent-sources-paginated', agentId]
        });
      }, delay);
    };

    const channel = supabase
      .channel(`agent-sources-debounced-${agentId}`)
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
          
          console.log('📡 Agent source update:', {
            event: payload.eventType,
            sourceType,
            crawlStatus
          });
          
          // Immediate refresh for important status changes
          if (payload.eventType === 'UPDATE' && crawlStatus === 'completed') {
            debouncedRefresh('source-completed', 100);
          } else if (payload.eventType === 'INSERT') {
            debouncedRefresh('source-inserted', 200);
          } else {
            debouncedRefresh('source-updated', 500);
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
          
          console.log('📄 Source page update:', {
            event: payload.eventType,
            pageStatus
          });
          
          // Immediate refresh for page completion
          if (payload.eventType === 'UPDATE' && pageStatus === 'completed') {
            debouncedRefresh('page-completed', 200);
          } else {
            debouncedRefresh('page-updated', 800);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('🔌 Cleaning up debounced real-time subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [agentId, queryClient]);
};
