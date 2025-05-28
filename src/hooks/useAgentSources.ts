
import { useState, useEffect } from 'react';
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

  const fetchSources = async () => {
    if (!agentId) return;

    try {
      setLoading(true);
      setError(null);
      
      let data: AgentSource[];
      if (sourceType) {
        data = await sourceService.getSourcesByType(agentId, sourceType);
      } else {
        data = await sourceService.getSourcesByAgent(agentId);
      }
      
      setSources(data);
    } catch (err) {
      console.error('Error fetching sources:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [agentId, sourceType]);

  // Set up real-time subscription for sources
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel('agent-sources-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('Source change detected:', payload);
          fetchSources(); // Refetch sources when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  return {
    sources,
    loading,
    error,
    refetch: fetchSources
  };
};
