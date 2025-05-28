
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRAGServices } from './useRAGServices';
import { AgentSource, SourceType } from '@/types/rag';
import { supabase } from '@/integrations/supabase/client';

export const useAgentSources = (sourceType?: SourceType) => {
  const { agentId } = useParams();
  const [sources, setSources] = useState<AgentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sources: sourceService } = useRAGServices();

  const fetchSources = useCallback(async () => {
    if (!agentId) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching sources with useAgentSources hook...');
      let data: AgentSource[];
      if (sourceType) {
        data = await sourceService.getSourcesByType(agentId, sourceType);
      } else {
        data = await sourceService.getSourcesByAgent(agentId);
      }
      
      console.log('Sources fetched by hook:', data.length);
      setSources(data);
    } catch (err) {
      console.error('Error fetching sources:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sources');
    } finally {
      setLoading(false);
    }
  }, [agentId, sourceType, sourceService]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Set up real-time subscription for sources
  useEffect(() => {
    if (!agentId) return;

    console.log('Setting up real-time subscription for agent sources');
    
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
          console.log('Source change detected by hook:', payload);
          // Immediately refetch sources when changes occur
          fetchSources();
        }
      )
      .subscribe((status) => {
        console.log('Hook subscription status:', status);
      });

    return () => {
      console.log('Cleaning up hook subscription');
      supabase.removeChannel(channel);
    };
  }, [agentId, fetchSources]);

  return {
    sources,
    loading,
    error,
    refetch: fetchSources
  };
};
