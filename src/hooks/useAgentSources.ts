
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const channelRef = useRef<any>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize source filtering
  const filteredSources = useMemo(() => {
    return sourceType 
      ? sources.filter(source => source.source_type === sourceType)
      : sources;
  }, [sources, sourceType]);

  const fetchSources = useCallback(async () => {
    if (!agentId) return;

    try {
      setLoading(true);
      setError(null);
      const fetchedSources = sourceType 
        ? await sourceService.getSourcesByType(agentId, sourceType as any)
        : await sourceService.getSourcesByAgent(agentId);
      setSources(fetchedSources);
    } catch (err: any) {
      console.error('Error fetching sources:', err);
      setError(err.message || 'Failed to fetch sources');
    } finally {
      setLoading(false);
    }
  }, [agentId, sourceType, sourceService]);

  // Debounced state update function
  const debouncedUpdate = useCallback((updateFn: () => void) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(updateFn, 100); // 100ms debounce
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Set up real-time subscription for agent sources
  useEffect(() => {
    if (!agentId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`agent-sources-consolidated-${agentId}-${sourceType || 'all'}`)
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
          
          debouncedUpdate(() => {
            if (payload.eventType === 'INSERT') {
              const newSource = payload.new as AgentSource;
              if (!sourceType || newSource.source_type === sourceType) {
                setSources(prev => {
                  // Check if source already exists to avoid duplicates
                  if (prev.some(source => source.id === newSource.id)) {
                    return prev;
                  }
                  return [...prev, newSource];
                });
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
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [agentId, sourceType, debouncedUpdate]);

  const removeSourceFromState = useCallback((sourceId: string) => {
    setSources(prev => prev.filter(source => source.id !== sourceId));
  }, []);

  const refetch = useCallback(() => {
    fetchSources();
  }, [fetchSources]);

  return {
    sources: filteredSources,
    loading,
    error,
    removeSourceFromState,
    refetch
  };
};
