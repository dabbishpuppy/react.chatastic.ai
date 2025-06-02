
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

export const useAgentSourceStats = () => {
  const { agentId } = useParams();
  const [stats, setStats] = useState<AgentSourceStats>({
    totalSources: 0,
    totalBytes: 0,
    sourcesByType: {
      text: { count: 0, size: 0 },
      file: { count: 0, size: 0 },
      website: { count: 0, size: 0 },
      qa: { count: 0, size: 0 }
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!agentId) return;

    try {
      console.log('📊 Fetching agent source stats using RPC for:', agentId);
      
      // Use the RPC function for accurate stats calculation
      const { data, error: rpcError } = await supabase
        .rpc('get_agent_source_stats', { target_agent_id: agentId });

      if (rpcError) throw rpcError;

      console.log('📊 RPC response:', data);

      if (data && data.length > 0) {
        const result = data[0];
        setStats({
          totalSources: result.total_sources || 0,
          totalBytes: result.total_bytes || 0,
          sourcesByType: result.sources_by_type || {
            text: { count: 0, size: 0 },
            file: { count: 0, size: 0 },
            website: { count: 0, size: 0 },
            qa: { count: 0, size: 0 }
          }
        });
      } else {
        // Fallback to empty stats
        setStats({
          totalSources: 0,
          totalBytes: 0,
          sourcesByType: {
            text: { count: 0, size: 0 },
            file: { count: 0, size: 0 },
            website: { count: 0, size: 0 },
            qa: { count: 0, size: 0 }
          }
        });
      }
    } catch (err: any) {
      console.error('❌ Error fetching agent source stats:', err);
      setError(err.message || 'Failed to fetch source stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [agentId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel(`agent-source-stats-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        () => {
          console.log('📡 Agent sources changed, refetching stats');
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages'
        },
        () => {
          console.log('📡 Source pages changed, refetching stats');
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  return { stats, loading, error, refetch: fetchStats };
};
