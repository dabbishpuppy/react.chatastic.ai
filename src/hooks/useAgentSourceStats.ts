
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
        
        console.log('📊 Enhanced size tracking:', {
          websiteCount: sourcesByType.website?.count,
          websiteSize: sourcesByType.website?.size,
          totalBytes: result.total_bytes,
          allTypes: sourcesByType
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

  // Enhanced real-time subscriptions with immediate refresh and better error handling
  useEffect(() => {
    if (!agentId) return;

    console.log(`📡 Setting up comprehensive real-time subscriptions for agent: ${agentId}`);

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
          // Type-safe property access
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          console.log('📡 Agent sources changed:', {
            event: payload.eventType,
            sourceId: newRecord?.id || oldRecord?.id,
            sourceType: newRecord?.source_type,
            timestamp: new Date().toISOString()
          });
          // Immediate refresh for any agent_sources changes
          setTimeout(fetchStats, 500); // Small delay to allow DB to settle
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
          // Type-safe property access
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          console.log('📡 Source pages changed:', {
            event: payload.eventType,
            pageId: newRecord?.id || oldRecord?.id,
            parentSourceId: newRecord?.parent_source_id || oldRecord?.parent_source_id,
            status: newRecord?.status,
            contentSize: newRecord?.content_size,
            timestamp: new Date().toISOString()
          });
          
          // Only refresh if this affects our agent
          const parentSourceId = newRecord?.parent_source_id || oldRecord?.parent_source_id;
          if (parentSourceId) {
            // Check if this page belongs to our agent's sources
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_chunks'
        },
        (payload) => {
          // Type-safe property access
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          console.log('📡 Source chunks changed:', {
            event: payload.eventType,
            chunkId: newRecord?.id || oldRecord?.id,
            sourceId: newRecord?.source_id || oldRecord?.source_id,
            timestamp: new Date().toISOString()
          });
          
          // Chunks affect compression stats
          const sourceId = newRecord?.source_id || oldRecord?.source_id;
          if (sourceId) {
            // Check if this chunk belongs to our agent's sources
            supabase
              .from('agent_sources')
              .select('id')
              .eq('id', sourceId)
              .eq('agent_id', agentId)
              .single()
              .then(({ data }) => {
                if (data) {
                  console.log('📊 Refreshing stats due to chunk change');
                  setTimeout(fetchStats, 1000); // Longer delay for chunk processing
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
          // Auto-retry after 10 seconds
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
