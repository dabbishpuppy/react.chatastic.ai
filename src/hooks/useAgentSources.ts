
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

  // Helper function to remove source from local state
  const removeSourceFromState = useCallback((sourceId: string) => {
    setSources(prevSources => prevSources.filter(source => source.id !== sourceId));
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Set up real-time subscription for sources with optimized updates
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
          
          // Handle different types of changes more efficiently
          if (payload.eventType === 'INSERT' && payload.new) {
            const newSource = {
              ...payload.new,
              metadata: payload.new.metadata as Record<string, any> || {}
            } as AgentSource;
            
            // Only add if it matches our filter (if any)
            if (!sourceType || newSource.source_type === sourceType) {
              setSources(prevSources => {
                // Check if the source already exists to avoid duplicates
                const exists = prevSources.some(s => s.id === newSource.id);
                if (exists) return prevSources;
                
                return [newSource, ...prevSources];
              });
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedSource = {
              ...payload.new,
              metadata: payload.new.metadata as Record<string, any> || {}
            } as AgentSource;
            
            setSources(prevSources => 
              prevSources.map(source => 
                source.id === updatedSource.id ? updatedSource : source
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // Remove the deleted source from state
            setSources(prevSources => 
              prevSources.filter(source => source.id !== payload.old.id)
            );
          } else {
            // Fallback to full refetch for other cases
            fetchSources();
          }
        }
      )
      .subscribe((status) => {
        console.log('Hook subscription status:', status);
      });

    return () => {
      console.log('Cleaning up hook subscription');
      supabase.removeChannel(channel);
    };
  }, [agentId, sourceType, fetchSources]);

  return {
    sources,
    loading,
    error,
    refetch: fetchSources,
    removeSourceFromState
  };
};
