
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRAGServices } from './useRAGServices';
import { AgentSource } from '@/types/rag';
import { supabase } from '@/integrations/supabase/client';

export const useAgentSources = (sourceType?: string) => {
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
      const fetchedSources = await sourceService.getAgentSources(agentId, sourceType);
      setSources(fetchedSources);
    } catch (err: any) {
      console.error('Error fetching sources:', err);
      setError(err.message || 'Failed to fetch sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [agentId, sourceType]);

  // Set up real-time subscription for agent sources
  useEffect(() => {
    if (!agentId) return;

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
          console.log('Real-time agent sources update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newSource = payload.new as AgentSource;
            if (!sourceType || newSource.source_type === sourceType) {
              setSources(prev => [...prev, newSource]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedSource = payload.new as AgentSource;
            if (!sourceType || updatedSource.source_type === sourceType) {
              setSources(prev => prev.map(source => 
                source.id === updatedSource.id ? updatedSource : source
              ));
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedSource = payload.old as AgentSource;
            setSources(prev => prev.filter(source => source.id !== deletedSource.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, sourceType]);

  const removeSourceFromState = (sourceId: string) => {
    setSources(prev => prev.filter(source => source.id !== sourceId));
  };

  const refetch = () => {
    fetchSources();
  };

  return {
    sources,
    loading,
    error,
    removeSourceFromState,
    refetch
  };
};
