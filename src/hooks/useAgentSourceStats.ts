
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

interface RpcStatsResponse {
  total_sources: number;
  total_bytes: number;
  sources_by_type: {
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

  const fetchStats = async (retryCount = 0) => {
    if (!agentId) return;

    try {
      console.log(`📊 Fetching agent source stats (attempt ${retryCount + 1}) for:`, agentId);
      
      const { data, error: rpcError } = await supabase
        .rpc('get_agent_source_stats', { target_agent_id: agentId });

      if (rpcError) {
        // Retry for network errors
        if (retryCount < 3 && (rpcError.message?.includes('502') || rpcError.message?.includes('504'))) {
          console.log(`🔄 Retrying stats fetch in 3 seconds (attempt ${retryCount + 1}/3)`);
          setTimeout(() => fetchStats(retryCount + 1), 3000);
          return;
        }
        throw rpcError;
      }

      console.log('📊 RPC RAW response:', data);

      if (data && data.length > 0) {
        const result = data[0] as RpcStatsResponse;
        
        console.log('📊 RPC processed result:', result);
        
        const sourcesByType = result.sources_by_type || {
          text: { count: 0, size: 0 },
          file: { count: 0, size: 0 },
          website: { count: 0, size: 0 },
          qa: { count: 0, size: 0 }
        };
        
        console.log('📊 Website stats from RPC - child pages count and compressed size:', {
          websiteCount: sourcesByType.website?.count,
          websiteSize: sourcesByType.website?.size,
          totalBytes: result.total_bytes
        });
        
        setStats({
          totalSources: result.total_sources || 0,
          totalBytes: result.total_bytes || 0,
          sourcesByType: {
            text: sourcesByType.text || { count: 0, size: 0 },
            file: sourcesByType.file || { count: 0, size: 0 },
            website: sourcesByType.website || { count: 0, size: 0 },
            qa: sourcesByType.qa || { count: 0, size: 0 }
          }
        });
        
        setError(null);
      } else {
        console.log('📊 No data returned from RPC');
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
      if (retryCount === 0) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [agentId]);

  // Enhanced real-time subscriptions for both agent_sources and source_pages
  useEffect(() => {
    if (!agentId) return;

    console.log(`📡 Setting up real-time subscriptions for agent: ${agentId}`);

    const channel = supabase
      .channel(`agent-source-stats-enhanced-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('📡 Agent sources changed:', {
            event: payload.eventType,
            sourceId: (payload.new as any)?.id || (payload.old as any)?.id,
            sourceType: (payload.new as any)?.source_type,
            timestamp: new Date().toISOString()
          });
          setTimeout(fetchStats, 500);
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
          console.log('📡 Source pages changed - this affects website link count and size:', {
            event: payload.eventType,
            pageId: (payload.new as any)?.id || (payload.old as any)?.id,
            parentSourceId: (payload.new as any)?.parent_source_id || (payload.old as any)?.parent_source_id,
            status: (payload.new as any)?.status,
            contentSize: (payload.new as any)?.content_size,
            timestamp: new Date().toISOString()
          });
          
          // Check if this affects our agent's sources
          const parentSourceId = (payload.new as any)?.parent_source_id || (payload.old as any)?.parent_source_id;
          if (parentSourceId) {
            supabase
              .from('agent_sources')
              .select('id')
              .eq('id', parentSourceId)
              .eq('agent_id', agentId)
              .single()
              .then(({ data }) => {
                if (data) {
                  console.log('📊 Refreshing stats due to relevant source page change');
                  setTimeout(fetchStats, 500);
                }
              });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Enhanced subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Enhanced real-time subscription active for agent source stats');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error, will retry...');
          setError('Real-time updates temporarily unavailable');
          setTimeout(() => {
            console.log('🔄 Retrying real-time subscription...');
            setError(null);
          }, 10000);
        }
      });

    return () => {
      console.log('🔌 Cleaning up enhanced real-time subscriptions');
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  return { stats, loading, error, refetch: fetchStats };
};
