
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
          
          // ENHANCED: Force immediate refresh for critical status changes
          if (payload.eventType === 'UPDATE' && crawlStatus === 'completed') {
            console.log('🎉 Parent source completed, forcing immediate refresh');
            
            // Force immediate refetch of both stats and paginated data
            queryClient.refetchQueries({
              queryKey: ['agent-source-stats', agentId]
            });
            queryClient.refetchQueries({
              queryKey: ['agent-sources-paginated', agentId, 'website']
            });
            
            // Additional delayed refetch to ensure consistency
            setTimeout(() => {
              queryClient.refetchQueries({
                queryKey: ['agent-source-stats', agentId]
              });
              queryClient.refetchQueries({
                queryKey: ['agent-sources-paginated', agentId, 'website']
              });
            }, 1000);
          } else {
            // Regular invalidation for other updates
            queryClient.invalidateQueries({ 
              queryKey: ['agent-source-stats', agentId] 
            });
            queryClient.invalidateQueries({ 
              queryKey: ['agent-sources-paginated', agentId] 
            });
          }

          // For INSERT events (new sources), trigger immediate refetch
          if (payload.eventType === 'INSERT') {
            console.log('🔄 New source inserted, triggering immediate refetch');
            
            setTimeout(() => {
              queryClient.refetchQueries({
                queryKey: ['agent-source-stats', agentId]
              });
              queryClient.refetchQueries({
                queryKey: ['agent-sources-paginated', agentId, sourceType]
              });
            }, 200);
          }

          // For website sources, ensure immediate refetch
          if (sourceType === 'website') {
            setTimeout(() => {
              queryClient.refetchQueries({
                queryKey: ['agent-sources-paginated', agentId, 'website']
              });
            }, 100);
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
          // ENHANCED: Listen to source_pages changes and trigger parent updates
          const parentSourceId = payload.new && typeof payload.new === 'object' && 'parent_source_id' in payload.new
            ? payload.new.parent_source_id
            : payload.old && typeof payload.old === 'object' && 'parent_source_id' in payload.old
            ? payload.old.parent_source_id
            : null;
          
          const pageStatus = payload.new && typeof payload.new === 'object' && 'status' in payload.new
            ? payload.new.status
            : 'unknown';
          
          console.log('📄 Source page update detected:', {
            event: payload.eventType,
            parentSourceId,
            pageStatus,
            pageId: payload.new && typeof payload.new === 'object' && 'id' in payload.new ? payload.new.id : 'unknown'
          });
          
          // If a page status changed to completed, trigger immediate refresh
          if (payload.eventType === 'UPDATE' && pageStatus === 'completed') {
            console.log('📄 Page completed, checking for parent status updates');
            
            // Force immediate refresh to catch parent status changes
            setTimeout(() => {
              queryClient.refetchQueries({
                queryKey: ['agent-source-stats', agentId]
              });
              queryClient.refetchQueries({
                queryKey: ['agent-sources-paginated', agentId, 'website']
              });
            }, 500); // Small delay to allow database aggregation to complete
          } else {
            // Regular invalidation for other page updates
            setTimeout(() => {
              queryClient.refetchQueries({
                queryKey: ['agent-source-stats', agentId]
              });
              queryClient.refetchQueries({
                queryKey: ['agent-sources-paginated', agentId, 'website']
              });
            }, 200);
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
