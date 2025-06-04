
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
          const isParent = payload.new && typeof payload.new === 'object' && 'parent_source_id' in payload.new
            ? !payload.new.parent_source_id
            : true;
          
          console.log('📡 Enhanced real-time source update:', {
            event: payload.eventType,
            sourceType,
            crawlStatus,
            isParent,
            sourceId: payload.new && typeof payload.new === 'object' && 'id' in payload.new ? payload.new.id : 'unknown'
          });
          
          // Immediately invalidate and refetch stats to update the widget
          queryClient.invalidateQueries({ 
            queryKey: ['agent-source-stats', agentId] 
          });
          
          // Invalidate all paginated source queries for this agent
          queryClient.invalidateQueries({ 
            queryKey: ['agent-sources-paginated', agentId] 
          });

          // For INSERT events (new sources), trigger immediate refetch
          if (payload.eventType === 'INSERT') {
            console.log('🔄 New source inserted, triggering immediate refetch');
            
            // Immediate refetch for stats
            setTimeout(() => {
              queryClient.refetchQueries({
                queryKey: ['agent-source-stats', agentId]
              });
            }, 100);
            
            // Immediate refetch for paginated data with source type
            setTimeout(() => {
              queryClient.refetchQueries({
                queryKey: ['agent-sources-paginated', agentId, sourceType]
              });
            }, 200);
            
            // Additional refetch after longer delay to catch any async updates
            setTimeout(() => {
              queryClient.refetchQueries({
                queryKey: ['agent-source-stats', agentId]
              });
              queryClient.refetchQueries({
                queryKey: ['agent-sources-paginated', agentId, sourceType]
              });
            }, 1500);
          }

          // For website sources, ensure immediate refetch
          if (sourceType === 'website') {
            setTimeout(() => {
              queryClient.refetchQueries({
                queryKey: ['agent-sources-paginated', agentId, 'website']
              });
            }, 100);
          }

          // For status updates, also trigger immediate refetch for better UX
          if (payload.eventType === 'UPDATE' && (crawlStatus === 'completed' || crawlStatus === 'failed')) {
            console.log('🔄 Crawl status changed, triggering comprehensive refresh');
            // Force refetch both stats and paginated data for completion events
            setTimeout(() => {
              queryClient.refetchQueries({
                queryKey: ['agent-source-stats', agentId]
              });
              queryClient.refetchQueries({
                queryKey: ['agent-sources-paginated', agentId, 'website']
              });
            }, 100);
          }

          // For new sources or content updates, immediately refetch to show them
          if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && crawlStatus === 'completed')) {
            // Force refetch both stats and paginated data
            setTimeout(() => {
              queryClient.refetchQueries({
                queryKey: ['agent-source-stats', agentId]
              });
              queryClient.refetchQueries({
                queryKey: ['agent-sources-paginated', agentId, sourceType]
              });
            }, 500); // Longer delay to ensure DB consistency
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id.in.(${agentId})`
        },
        (payload) => {
          console.log('📡 Source page update detected:', payload.eventType);
          
          // When source pages are updated, also refresh the parent sources
          setTimeout(() => {
            queryClient.refetchQueries({
              queryKey: ['agent-source-stats', agentId]
            });
            queryClient.refetchQueries({
              queryKey: ['agent-sources-paginated', agentId, 'website']
            });
          }, 200);
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
