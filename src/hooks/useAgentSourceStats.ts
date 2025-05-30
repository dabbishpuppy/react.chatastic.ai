
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AgentSourceStats {
  totalSources: number;
  totalBytes: number;
  sourcesByType: {
    text: { count: number; size: number };
    file: { count: number; size: number };
    website: { count: number; size: number };
    qa: { count: number; size: number };
  };
}

interface RPCResponse {
  total_sources: number;
  total_bytes: number;
  sources_by_type: {
    text: { count: number; size: number };
    file: { count: number; size: number };
    website: { count: number; size: number };
    qa: { count: number; size: number };
  };
}

const fetchAgentSourceStats = async (agentId: string): Promise<AgentSourceStats> => {
  console.log(`📊 Fetching source stats for agent: ${agentId}`);
  
  const { data, error } = await supabase.rpc('get_agent_source_stats', {
    target_agent_id: agentId
  });

  if (error) {
    console.error('❌ Error fetching stats:', error);
    throw error;
  }

  if (data && data.length > 0) {
    const result = data[0] as RPCResponse;
    const stats = {
      totalSources: result.total_sources || 0,
      totalBytes: result.total_bytes || 0,
      sourcesByType: (typeof result.sources_by_type === 'object' && result.sources_by_type !== null) 
        ? result.sources_by_type as { 
            text: { count: number; size: number }; 
            file: { count: number; size: number }; 
            website: { count: number; size: number }; 
            qa: { count: number; size: number }; 
          }
        : { 
            text: { count: 0, size: 0 }, 
            file: { count: 0, size: 0 }, 
            website: { count: 0, size: 0 }, 
            qa: { count: 0, size: 0 } 
          }
    };
    console.log(`✅ Stats fetched:`, stats);
    return stats;
  } else {
    console.log('📊 No stats data returned, using defaults');
    return {
      totalSources: 0,
      totalBytes: 0,
      sourcesByType: { 
        text: { count: 0, size: 0 }, 
        file: { count: 0, size: 0 }, 
        website: { count: 0, size: 0 }, 
        qa: { count: 0, size: 0 } 
      }
    };
  }
};

export const useAgentSourceStats = () => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['agent-source-stats', agentId],
    queryFn: () => fetchAgentSourceStats(agentId!),
    enabled: !!agentId,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
    refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Set up real-time subscription for agent_sources table changes
  useEffect(() => {
    if (!agentId) return;

    console.log(`🔄 Setting up real-time subscription for agent sources: ${agentId}`);

    const channel = supabase
      .channel('agent-sources-stats')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('📡 Real-time agent_sources change detected:', payload);
          // Invalidate and refetch the stats query
          queryClient.invalidateQueries({ queryKey: ['agent-source-stats', agentId] });
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up agent sources stats subscription');
      supabase.removeChannel(channel);
    };
  }, [agentId, queryClient]);

  return {
    stats: stats || {
      totalSources: 0,
      totalBytes: 0,
      sourcesByType: { 
        text: { count: 0, size: 0 }, 
        file: { count: 0, size: 0 }, 
        website: { count: 0, size: 0 }, 
        qa: { count: 0, size: 0 } 
      }
    },
    loading,
    error: error?.message || null,
    refetch
  };
};
