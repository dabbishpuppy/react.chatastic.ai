
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AgentSourceStats {
  totalSources: number;
  totalBytes: number;
  sourcesByType: {
    text: number;
    file: number;
    website: number;
    qa: number;
  };
}

interface RPCResponse {
  total_sources: number;
  total_bytes: number;
  sources_by_type: {
    text: number;
    file: number;
    website: number;
    qa: number;
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
        ? result.sources_by_type as { text: number; file: number; website: number; qa: number; }
        : { text: 0, file: 0, website: 0, qa: 0 }
    };
    console.log(`✅ Stats fetched:`, stats);
    return stats;
  } else {
    console.log('📊 No stats data returned, using defaults');
    return {
      totalSources: 0,
      totalBytes: 0,
      sourcesByType: { text: 0, file: 0, website: 0, qa: 0 }
    };
  }
};

export const useAgentSourceStats = () => {
  const { agentId } = useParams();

  const { data: stats, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['agent-source-stats', agentId],
    queryFn: () => fetchAgentSourceStats(agentId!),
    enabled: !!agentId,
    staleTime: 1000, // Consider data fresh for only 1 second to ensure quick updates
    refetchInterval: 2000, // Refetch every 2 seconds as backup
  });

  return {
    stats: stats || {
      totalSources: 0,
      totalBytes: 0,
      sourcesByType: { text: 0, file: 0, website: 0, qa: 0 }
    },
    loading,
    error: error?.message || null,
    refetch
  };
};
