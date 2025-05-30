
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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

export const useAgentSourceStats = () => {
  const { agentId } = useParams();
  const [stats, setStats] = useState<AgentSourceStats>({
    totalSources: 0,
    totalBytes: 0,
    sourcesByType: { text: 0, file: 0, website: 0, qa: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    if (!agentId) return;

    try {
      setError(null);
      console.log(`📊 Fetching source stats for agent: ${agentId}`);
      
      const { data, error } = await supabase.rpc('get_agent_source_stats', {
        target_agent_id: agentId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        setStats({
          totalSources: result.total_sources || 0,
          totalBytes: result.total_bytes || 0,
          sourcesByType: result.sources_by_type || { text: 0, file: 0, website: 0, qa: 0 }
        });
        console.log(`✅ Stats updated:`, result);
      } else {
        setStats({
          totalSources: 0,
          totalBytes: 0,
          sourcesByType: { text: 0, file: 0, website: 0, qa: 0 }
        });
      }
    } catch (err: any) {
      console.error('❌ Error fetching source stats:', err);
      setError(err.message || 'Failed to fetch source statistics');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Debounced fetch to prevent rapid successive calls
  const debouncedFetch = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(fetchStats, 100);
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Set up real-time subscription for source changes
  useEffect(() => {
    if (!agentId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`source-stats-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('📊 Source stats update triggered:', payload.eventType);
          debouncedFetch();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [agentId, debouncedFetch]);

  const refetch = useCallback(() => {
    console.log('🔄 Manual stats refetch triggered');
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch
  };
};
